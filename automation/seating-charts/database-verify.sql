select
  to_regclass('public.seating_chart_targets') is not null as targets_exist,
  to_regclass('public.seating_chart_refresh_runs') is not null as runs_exist,
  (select count(*) from pg_class where oid in ('public.seating_chart_targets'::regclass,'public.seating_chart_refresh_runs'::regclass) and relrowsecurity) as rls_tables,
  (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('claim_seating_chart_refresh','stage_seating_chart_refresh','complete_seating_chart_refresh','fail_seating_chart_refresh')) as rpc_count,
  has_table_privilege('anon','public.seating_chart_targets','select') as anon_can_read,
  has_table_privilege('authenticated','public.seating_chart_refresh_runs','select') as browser_can_read,
  has_function_privilege('service_role','public.claim_seating_chart_refresh(uuid,text,jsonb)','execute') as service_can_claim,
  (select count(*) from public.seating_chart_targets) as targets,
  (select count(*) from public.seating_chart_refresh_runs) as runs;
