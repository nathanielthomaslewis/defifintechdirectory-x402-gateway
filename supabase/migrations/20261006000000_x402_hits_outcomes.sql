-- Add 'ok' (successful unpaid requests: discovery, health, llms.txt) and '400' (invalid input) outcomes.
alter table public.x402_hits drop constraint if exists x402_hits_outcome_check;
alter table public.x402_hits add constraint x402_hits_outcome_check
  check (outcome in ('ok','400','402_issued','paid','verify_failed','settle_failed','cap_429','404','error'));
