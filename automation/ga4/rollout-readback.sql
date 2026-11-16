-- READ ONLY. Before config enable, inspect private raw period records rather
-- than the reporting view (which correctly excludes disabled configuration).
select studio_id, property_id, period_start, period_end, definition_version, geography,
       retrieved_at, report->'routes' as routes, report->'reach' as reach,
       report->>'historyVerified' as history_verified,
       report->'breakdowns' as traffic_breakdowns
from public.ga4_party_funnel_periods
where studio_id=1 and property_id='354847068' and definition_version=2 and geography='US'
order by period_start, period_end, retrieved_at;

select studio_id, property_id, enabled, definition_version, geography
from public.ga4_party_funnel_configs where studio_id=1 and property_id='354847068';
select count(*) as visible_reporting_rows from public.ga4_party_funnel_reporting where studio_id=1;
-- While disabled: visible_reporting_rows=0.
-- Oct19-Nov15 source/warehouse expectations:
-- core [51,22,13,11,11,5], addons [51,22,13,11,11,11,5], inquiry [51,12],
-- whole-process reach {views:428,periodUniqueUsers:51}, historyVerified=false.
-- Prior Sep21-Oct18 no rows is UNAVAILABLE, never a fabricated zero record.
