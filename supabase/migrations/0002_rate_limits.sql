-- =====================================================================
-- 0002 — server-side anti-abuse limits for orders and messages
--
-- Limits live in the database, so they hold for every path: the current
-- direct API call from the browser AND the new submit-order / submit-inquiry
-- Edge Functions (Cloudflare Turnstile + honeypot run there first).
--   * private.rate_rules     — the limits (owner can change them with SQL)
--   * private.rate_events    — hashed subjects only (sha256 of IP / phone), auto-pruned
--   * private.create_order() — the 0001 checkout, moved out of the API (not callable directly)
--   * public.place_order()   — browser path: limits by IP (from request headers) + phone + global
--   * public.submit_order()  — Edge Function path (service_role only): same, with the IP the function saw
--   * public.order_by_key()  — Edge Function only: replay of an already-saved checkout
--   * public.submit_inquiry()— Edge Function only; direct inserts are limited by a trigger
-- Error returned when a limit is hit: 'rate_limited' (HTTP 400 from the API, 429 from the functions).
-- Rollback: supabase/rollbacks/0002_rate_limits.down.sql
-- =====================================================================

create table private.rate_rules (
  kind text not null,                       -- 'order' | 'inquiry'
  scope text not null,                      -- 'ip' | 'phone' | 'all'
  max_count integer not null check (max_count > 0),
  window_seconds integer not null check (window_seconds > 0),
  primary key (kind, scope, window_seconds)
);
insert into private.rate_rules (kind, scope, max_count, window_seconds) values
  ('order',   'ip',     6,  600),   -- one device/network: 6 orders per 10 minutes
  ('order',   'ip',    30, 86400),  --                     30 per day
  ('order',   'phone',  4,  600),   -- one phone number:    4 per 10 minutes
  ('order',   'phone', 12, 86400),  --                     12 per day
  ('order',   'all',  300,  600),   -- whole shop: circuit breaker against floods
  ('inquiry', 'ip',     5,  600),
  ('inquiry', 'ip',    30, 86400),
  ('inquiry', 'all',  200,  600);

create table private.rate_events (
  id bigint generated always as identity primary key,
  kind text not null,
  scope text not null,
  subject text not null,                    -- sha256 hex of the IP / phone digits, or 'all'
  created_at timestamp with time zone not null default now()
);
create index rate_events_lookup_idx on private.rate_events (kind, scope, subject, created_at desc);
create index rate_events_created_idx on private.rate_events (created_at);
revoke all on private.rate_rules, private.rate_events from public, anon, authenticated, service_role;

-- The client address as the API gateway reports it. Prefers headers set by the
-- edge proxy (cf-connecting-ip / x-real-ip); falls back to the first x-forwarded-for hop.
create function private.request_ip()
 returns text language sql stable set search_path to 'pg_catalog'
as $function$
  select nullif(btrim(coalesce(
    h->>'cf-connecting-ip', h->>'x-real-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1))), '')
  from (select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb as h) x
$function$;
revoke all on function private.request_ip() from public, anon, authenticated, service_role;

-- Count one attempt against every rule of `kind`; raise 'rate_limited' if any rule is exceeded.
create function private.hit(p_kind text, p_ip text, p_phone text)
 returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  rule record; v_subject text; v_count integer;
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  for rule in select * from private.rate_rules where kind = p_kind order by scope, window_seconds loop
    v_subject := case rule.scope
      when 'all' then 'all'
      when 'ip' then case when coalesce(p_ip, '') <> '' then encode(sha256(convert_to('ip:' || p_ip, 'UTF8')), 'hex') end
      when 'phone' then case when length(v_digits) >= 7 then encode(sha256(convert_to('ph:' || right(v_digits, 9), 'UTF8')), 'hex') end
    end;
    continue when v_subject is null;
    -- serialise bursts from one address / phone so parallel requests cannot all slip through;
    -- the shop-wide rule is approximate on purpose (no global lock on the checkout path)
    if rule.scope <> 'all' then
      perform pg_advisory_xact_lock(hashtextextended(p_kind || rule.scope || v_subject, 9157));
    end if;
    select count(*) into v_count from private.rate_events
      where kind = p_kind and scope = rule.scope and subject = v_subject
        and created_at > now() - make_interval(secs => rule.window_seconds);
    if v_count >= rule.max_count then
      raise exception 'rate_limited' using hint = format('%s/%s per %ss', rule.scope, rule.max_count, rule.window_seconds);
    end if;
  end loop;
  insert into private.rate_events (kind, scope, subject)
  select p_kind, s.scope, s.subject from (values
    ('all', 'all'),
    ('ip', case when coalesce(p_ip, '') <> '' then encode(sha256(convert_to('ip:' || p_ip, 'UTF8')), 'hex') end),
    ('phone', case when length(v_digits) >= 7 then encode(sha256(convert_to('ph:' || right(v_digits, 9), 'UTF8')), 'hex') end)
  ) s(scope, subject)
  where s.subject is not null and exists (select 1 from private.rate_rules r where r.kind = p_kind and r.scope = s.scope);
  -- keep the log small (about one call in fifty prunes it)
  if random() < 0.02 then
    delete from private.rate_events where created_at < now() - interval '2 days';
  end if;
end $function$;
revoke all on function private.hit(text, text, text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------- orders
alter function public.place_order(jsonb, jsonb, uuid) set schema private;
alter function private.place_order(jsonb, jsonb, uuid) rename to create_order;
revoke all on function private.create_order(jsonb, jsonb, uuid) from public, anon, authenticated, service_role;

create function private.replay_order(p_key uuid)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object('order_no', o.order_no, 'subtotal', o.subtotal, 'delivery', o.delivery, 'total', o.total,
    'items', o.items, 'country', o.country, 'international', o.country not in ('العراق', 'Iraq', 'iraq'),
    'shipping_tbd', o.shipping_tbd, 'duplicate', true)
  from public.orders o where p_key is not null and o.idempotency_key = p_key
$function$;
revoke all on function private.replay_order(uuid) from public, anon, authenticated, service_role;

-- Browser path (anon). A retry of a saved checkout is answered without counting against the limits.
create function public.place_order(p_customer jsonb, p_items jsonb, p_idempotency_key uuid default null)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v jsonb := private.replay_order(p_idempotency_key);
begin
  if v is not null then return v; end if;
  perform private.hit('order', private.request_ip(), p_customer->>'phone');
  return private.create_order(p_customer, p_items, p_idempotency_key);
end $function$;
revoke all on function public.place_order(jsonb, jsonb, uuid) from public;
grant execute on function public.place_order(jsonb, jsonb, uuid) to anon, authenticated;

-- Edge Function path (service_role only): the function passes the address it saw.
create function public.submit_order(p_customer jsonb, p_items jsonb, p_idempotency_key uuid, p_ip text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v jsonb := private.replay_order(p_idempotency_key);
begin
  if v is not null then return v; end if;
  perform private.hit('order', left(p_ip, 64), p_customer->>'phone');
  return private.create_order(p_customer, p_items, p_idempotency_key);
end $function$;
revoke all on function public.submit_order(jsonb, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.submit_order(jsonb, jsonb, uuid, text) to service_role;

create function public.order_by_key(p_idempotency_key uuid)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$ select private.replay_order(p_idempotency_key) $function$;
revoke all on function public.order_by_key(uuid) from public, anon, authenticated;
grant execute on function public.order_by_key(uuid) to service_role;

-- ---------------------------------------------------------------- messages
create function private.inquiry_rate_guard()
 returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  perform private.hit('inquiry', private.request_ip(), null);
  return new;
end $function$;
revoke all on function private.inquiry_rate_guard() from public, anon, authenticated, service_role;
create trigger inquiries_rate_guard before insert on public.inquiries
  for each row when (current_user in ('anon', 'authenticated')) execute function private.inquiry_rate_guard();
create trigger messages_rate_guard before insert on public.messages
  for each row when (current_user in ('anon', 'authenticated')) execute function private.inquiry_rate_guard();
create trigger newsletter_rate_guard before insert on public.newsletter_subscribers
  for each row when (current_user in ('anon', 'authenticated')) execute function private.inquiry_rate_guard();

create function public.submit_inquiry(p_name text, p_phone text, p_body text, p_ip text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_id uuid;
begin
  perform private.hit('inquiry', left(p_ip, 64), null);
  -- runs as the owner, so the direct-insert guard (anon/authenticated only) does not count it twice
  insert into public.inquiries (name, phone, body) values (btrim(coalesce(p_name, '')), left(btrim(coalesce(p_phone, '')), 40), btrim(coalesce(p_body, '')))
  returning id into v_id;
  return jsonb_build_object('ok', true);
exception
  when check_violation then raise exception 'invalid_inquiry';
end $function$;
revoke all on function public.submit_inquiry(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_inquiry(text, text, text, text) to service_role;
