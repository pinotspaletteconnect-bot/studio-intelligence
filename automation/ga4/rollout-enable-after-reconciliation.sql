-- APPROVED PUBLICATION GATE. Run once ONLY after independent source and raw
-- warehouse readback reconciliation. Never use this in a scheduled workflow.
begin;
do $$
declare stored jsonb; observed_at timestamptz;
begin
  select report, retrieved_at into stored, observed_at from public.ga4_party_funnel_periods
  where studio_id=1 and property_id='354847068' and definition_version=2 and geography='US'
    and period_start='2026-10-19' and period_end='2026-11-15'
  order by retrieved_at desc limit 1;
  if stored is null
     or observed_at is distinct from '2026-11-16T16:24:26.901Z'::timestamptz
     or stored->>'studioId' is distinct from '1'
     or stored->>'availability' is distinct from 'verified'
     or stored#>>'{period,startDate}' is distinct from '2026-10-19'
     or stored#>>'{period,endDate}' is distinct from '2026-11-15'
     or stored#>'{routes,core}' is distinct from '[51,22,13,11,11,5]'::jsonb
     or stored#>'{routes,addons}' is distinct from '[51,22,13,11,11,11,5]'::jsonb
     or stored#>'{routes,inquiry}' is distinct from '[51,12]'::jsonb
     or stored#>'{reach,views}' is distinct from '428'::jsonb
     or stored#>'{reach,periodUniqueUsers}' is distinct from '51'::jsonb
     or stored->>'definitionVersion' is distinct from '2'
     or stored->>'geography' is distinct from 'US'
     or stored->>'historyVerified' is distinct from 'false'
  then raise exception 'Stop: current period does not match independently verified US source';
  end if;
  if not exists (select 1 from public.ga4_party_funnel_configs
    where studio_id=1 and account_id=1 and property_id='354847068'
      and path_prefix='/louisville/parties' and definition_version=2 and geography='US' and enabled=false)
  then raise exception 'Stop: reviewed disabled configuration changed';
  end if;
end $$;
update public.ga4_party_funnel_configs set enabled=true, updated_at=now()
where studio_id=1 and account_id=1 and property_id='354847068'
  and path_prefix='/louisville/parties' and definition_version=2 and geography='US' and enabled=false;
commit;

select studio_id, enabled, definition_version, geography from public.ga4_party_funnel_configs where studio_id=1;
select studio_id, period_start, period_end, definition_version, geography,
       report->'routes' as routes, report->'reach' as reach
from public.ga4_party_funnel_reporting where studio_id=1
order by period_start, period_end;
-- Expected: config true; verified Oct19-Nov15 period visible. Missing prior
-- periods remain absent/unavailable; no zero history is inserted by this gate.
