-- =====================================================================
-- Scheduled jobs (run ONCE per project in the SQL Editor, after the Edge
-- Functions are deployed). Not a migration: it stores secrets in Vault and
-- needs the project's own URL. PRODUCTION: only with the owner's approval.
--
-- Before running, replace the two placeholders:
--   <PROJECT_REF>   e.g. hnkjmthvgfknwdnehegr (production) / rlivlqddrzdrmfqeqnox (staging)
--   <CRON_SECRET>   the same random value set as the CRON_SECRET function secret
--                   (generate: openssl rand -hex 24)
-- =====================================================================
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/notify-retry', 'rq_notify_retry_url', 'notify-retry Edge Function URL');
select vault.create_secret('<CRON_SECRET>', 'rq_cron_secret', 'shared secret for scheduled function calls');

-- every minute: send any order/message alert that Telegram has not confirmed yet
select cron.schedule('rq-notify-retry', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'rq_notify_retry_url'),
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'rq_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000)
$job$);

-- daily 03:17 (UTC): trim the anti-abuse log and pg_net's response log
select cron.schedule('rq-housekeeping', '17 3 * * *', $job$
  delete from private.rate_events where created_at < now() - interval '2 days';
  delete from net._http_response where created < now() - interval '2 days';
$job$);

-- check:   select jobname, schedule, active from cron.job;
--          select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- remove:  select cron.unschedule('rq-notify-retry'); select cron.unschedule('rq-housekeeping');
