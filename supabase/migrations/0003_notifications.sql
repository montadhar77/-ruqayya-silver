-- =====================================================================
-- 0003 — reliable Telegram alerts for new orders and messages
--
-- The database is the source of truth for "was the owner told?":
--   claim_notification()          — submit-order asks right after saving an order
--   claim_pending_notifications() — notify-retry (pg_cron, every minute) collects
--                                   anything not confirmed: Telegram down, function
--                                   crashed, or the order came through the direct API
--   finish_notification()         — records success / the error, with backoff
-- Delivery is at-least-once (a lost confirmation can repeat one alert, never lose one).
-- Owner switches: settings.data.notify.orders / .inquiries (default on).
-- Only orders/messages created after this migration are alerted (no flood of history),
-- and existing rows are not modified.
-- All functions are service_role only (used by the Edge Functions).
-- Rollback: supabase/rollbacks/0003_notifications.down.sql
-- =====================================================================

alter table public.orders
  add column notified_at timestamp with time zone,
  add column notify_attempts integer not null default 0,
  add column notify_error text not null default '',
  add column notify_claimed_at timestamp with time zone;
alter table public.inquiries
  add column notified_at timestamp with time zone,
  add column notify_attempts integer not null default 0,
  add column notify_error text not null default '',
  add column notify_claimed_at timestamp with time zone;
create index orders_notify_pending_idx on public.orders (created_at) where notified_at is null;
create index inquiries_notify_pending_idx on public.inquiries (created_at) where notified_at is null;

create table private.notify_state (
  id smallint primary key default 1 check (id = 1),
  since timestamp with time zone not null default now()
);
insert into private.notify_state default values;
revoke all on private.notify_state from public, anon, authenticated, service_role;

create function private.notify_enabled(p_kind text)
 returns boolean language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select coalesce((select case jsonb_typeof(data #> array['notify', p_kind || 's'])
                            when 'boolean' then (data #>> array['notify', p_kind || 's'])::boolean end
                   from public.settings where id = 1), true)
$function$;

create function private.order_payload(o public.orders)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object('order_no', o.order_no, 'customer_name', o.customer_name, 'phone', o.phone,
    'country', o.country, 'city', o.city, 'address', o.address, 'notes', o.notes, 'items', o.items,
    'subtotal', o.subtotal, 'delivery', o.delivery, 'total', o.total, 'shipping_tbd', o.shipping_tbd,
    'international', o.country not in ('العراق', 'Iraq', 'iraq'),
    'currency', coalesce((select nullif(data #>> '{shop,currency}', '') from public.settings where id = 1), 'د.ع'))
$function$;

create function private.inquiry_payload(i public.inquiries)
 returns jsonb language sql immutable set search_path to ''
as $function$ select jsonb_build_object('name', i.name, 'phone', i.phone, 'body', i.body) $function$;

-- wait before retrying: 1, 2, 4, 8 ... minutes, at most one hour
create function private.notify_due(p_claimed timestamp with time zone, p_attempts integer)
 returns boolean language sql stable set search_path to ''
as $function$
  select p_claimed is null or p_claimed < now() - make_interval(mins => least(power(2, greatest(p_attempts - 1, 0))::integer, 60))
$function$;

create function public.claim_notification(p_kind text, p_ref text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare o public.orders; i public.inquiries;
begin
  if p_kind = 'order' then
    update public.orders set notify_claimed_at = now(), notify_attempts = notify_attempts + 1
      where order_no = p_ref::bigint and notified_at is null and private.notify_due(notify_claimed_at, notify_attempts)
      returning * into o;
    if not found then return jsonb_build_object('send', false); end if;
    if not private.notify_enabled('order') then
      update public.orders set notified_at = now(), notify_error = 'disabled', notify_claimed_at = null where id = o.id;
      return jsonb_build_object('send', false);
    end if;
    return jsonb_build_object('send', true, 'payload', private.order_payload(o));
  elsif p_kind = 'inquiry' then
    update public.inquiries set notify_claimed_at = now(), notify_attempts = notify_attempts + 1
      where id = p_ref::uuid and notified_at is null and private.notify_due(notify_claimed_at, notify_attempts)
      returning * into i;
    if not found then return jsonb_build_object('send', false); end if;
    if not private.notify_enabled('inquiry') then
      update public.inquiries set notified_at = now(), notify_error = 'disabled', notify_claimed_at = null where id = i.id;
      return jsonb_build_object('send', false);
    end if;
    return jsonb_build_object('send', true, 'payload', private.inquiry_payload(i));
  end if;
  raise exception 'invalid_kind';
end $function$;

create function public.finish_notification(p_kind text, p_ref text, p_ok boolean, p_error text default '')
 returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if p_kind = 'order' then
    update public.orders set notified_at = case when p_ok then now() end,
           notify_error = case when p_ok then '' else left(coalesce(p_error, ''), 300) end,
           notify_claimed_at = case when p_ok then null else notify_claimed_at end
      where order_no = p_ref::bigint and notified_at is null;
  elsif p_kind = 'inquiry' then
    update public.inquiries set notified_at = case when p_ok then now() end,
           notify_error = case when p_ok then '' else left(coalesce(p_error, ''), 300) end,
           notify_claimed_at = case when p_ok then null else notify_claimed_at end
      where id = p_ref::uuid and notified_at is null;
  else
    raise exception 'invalid_kind';
  end if;
end $function$;

-- Everything older than a minute that is still unconfirmed (last 3 days, at most 20 tries).
create function public.claim_pending_notifications(p_limit integer default 20)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_since timestamp with time zone := (select since from private.notify_state where id = 1);
        v_out jsonb := '[]'::jsonb; o public.orders; i public.inquiries;
        v_orders boolean := private.notify_enabled('order'); v_inq boolean := private.notify_enabled('inquiry');
begin
  for o in
    with picked as (
      select id from public.orders
      where notified_at is null and created_at >= greatest(v_since, now() - interval '3 days') and created_at < now() - interval '60 seconds'
        and notify_attempts < 20 and private.notify_due(notify_claimed_at, notify_attempts)
      order by created_at limit greatest(least(p_limit, 100), 1) for update skip locked)
    update public.orders t set notify_claimed_at = now(), notify_attempts = t.notify_attempts + 1,
           notified_at = case when v_orders then null else now() end,
           notify_error = case when v_orders then t.notify_error else 'disabled' end
      from picked where t.id = picked.id returning t.*
  loop
    if v_orders then
      v_out := v_out || jsonb_build_object('kind', 'order', 'ref', o.order_no::text, 'payload', private.order_payload(o));
    end if;
  end loop;
  for i in
    with picked as (
      select id from public.inquiries
      where notified_at is null and created_at >= greatest(v_since, now() - interval '3 days') and created_at < now() - interval '60 seconds'
        and notify_attempts < 20 and private.notify_due(notify_claimed_at, notify_attempts)
      order by created_at limit greatest(least(p_limit, 100), 1) for update skip locked)
    update public.inquiries t set notify_claimed_at = now(), notify_attempts = t.notify_attempts + 1,
           notified_at = case when v_inq then null else now() end,
           notify_error = case when v_inq then t.notify_error else 'disabled' end
      from picked where t.id = picked.id returning t.*
  loop
    if v_inq then
      v_out := v_out || jsonb_build_object('kind', 'inquiry', 'ref', i.id::text, 'payload', private.inquiry_payload(i));
    end if;
  end loop;
  return v_out;
end $function$;

revoke all on function private.notify_enabled(text), private.order_payload(public.orders), private.inquiry_payload(public.inquiries),
  private.notify_due(timestamp with time zone, integer) from public, anon, authenticated, service_role;
revoke all on function public.claim_notification(text, text), public.finish_notification(text, text, boolean, text),
  public.claim_pending_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_notification(text, text), public.finish_notification(text, text, boolean, text),
  public.claim_pending_notifications(integer) to service_role;

-- submit_inquiry() now also returns the message id so the function can alert at once
create or replace function public.submit_inquiry(p_name text, p_phone text, p_body text, p_ip text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_id uuid;
begin
  perform private.hit('inquiry', left(p_ip, 64), null);
  insert into public.inquiries (name, phone, body) values (btrim(coalesce(p_name, '')), left(btrim(coalesce(p_phone, '')), 40), btrim(coalesce(p_body, '')))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when check_violation then raise exception 'invalid_inquiry';
end $function$;
