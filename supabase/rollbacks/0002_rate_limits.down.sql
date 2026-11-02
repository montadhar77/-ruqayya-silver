-- Rollback of 0002_rate_limits: back to the 0001 checkout, no limits.
drop trigger if exists inquiries_rate_guard on public.inquiries;
drop trigger if exists messages_rate_guard on public.messages;
drop trigger if exists newsletter_rate_guard on public.newsletter_subscribers;
drop function if exists private.inquiry_rate_guard();
drop function if exists public.submit_inquiry(text, text, text, text);
drop function if exists public.order_by_key(uuid);
drop function if exists public.submit_order(jsonb, jsonb, uuid, text);
drop function if exists public.place_order(jsonb, jsonb, uuid);
drop function if exists private.replay_order(uuid);
alter function private.create_order(jsonb, jsonb, uuid) rename to place_order;
alter function private.place_order(jsonb, jsonb, uuid) set schema public;
revoke all on function public.place_order(jsonb, jsonb, uuid) from public;
grant execute on function public.place_order(jsonb, jsonb, uuid) to anon, authenticated;
drop function if exists private.hit(text, text, text);
drop function if exists private.request_ip();
drop table if exists private.rate_events;
drop table if exists private.rate_rules;
