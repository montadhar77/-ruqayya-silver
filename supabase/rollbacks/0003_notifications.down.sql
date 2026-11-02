-- Rollback of 0003_notifications: no alert bookkeeping (orders/messages themselves are kept).
drop function if exists public.claim_pending_notifications(integer);
drop function if exists public.finish_notification(text, text, boolean, text);
drop function if exists public.claim_notification(text, text);
drop function if exists private.notify_due(timestamp with time zone, integer);
drop function if exists private.inquiry_payload(public.inquiries);
drop function if exists private.order_payload(public.orders);
drop function if exists private.notify_enabled(text);
drop table if exists private.notify_state;
drop index if exists public.orders_notify_pending_idx;
drop index if exists public.inquiries_notify_pending_idx;
alter table public.orders drop column if exists notified_at, drop column if exists notify_attempts,
  drop column if exists notify_error, drop column if exists notify_claimed_at;
alter table public.inquiries drop column if exists notified_at, drop column if exists notify_attempts,
  drop column if exists notify_error, drop column if exists notify_claimed_at;

-- submit_inquiry() as in 0002
create or replace function public.submit_inquiry(p_name text, p_phone text, p_body text, p_ip text)
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
