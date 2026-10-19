-- Read-only pilot summary; never returns guest contact data.
select t.id as target_id,t.studio_id,t.enabled,t.revision,t.config->'staffUpdatesEnabled' as staff_enabled,
  jsonb_array_length(t.ledger) as ledger_count,t.lease_run_id,
  r.run_id,r.status,jsonb_array_length(r.source->'rows') as source_count,
  jsonb_array_length(r.plan->'request'->'data') as write_range_count,r.result
from public.seating_chart_targets t
left join public.seating_chart_refresh_runs r on r.target_id=t.id
where t.studio_id=1 and t.config->>'classId'='931955'
order by r.created_at;
