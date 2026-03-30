-- Migration: Automatically expire trials that have passed their end date.
-- This keeps user_plans consistent so the backend reflects the true status.
-- Requires pg_cron extension to be enabled in the Supabase project.

-- Enable pg_cron if not already enabled (run once per project)
-- create extension if not exists pg_cron;

-- Schedule: runs every hour to mark expired trials
select cron.schedule(
  'expire-trial-plans',         -- job name
  '0 * * * *',                  -- every hour at :00
  $$
    UPDATE user_plans
    SET
      status    = 'expired',
      plan_type = 'free'
    WHERE
      is_trial       = true
      AND status     = 'active'
      AND trial_expires_at < now();
  $$
);
