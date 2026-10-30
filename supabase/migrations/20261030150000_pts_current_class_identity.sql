-- Preserve every raw fact; count the latest version of each stable PTS class ID.
begin;
create or replace view public.pts_class_sales_current
with (security_invoker = true) as
select class_sales.* from public.pts_class_sales_daily class_sales
where not exists (
    select 1 from public.pts_class_sales_daily newer
    where btrim(class_sales.raw_payload->>'classid') ~ '^[1-9][0-9]*$'
      and newer.organization_id = class_sales.organization_id
      and newer.studio_id = class_sales.studio_id
      and btrim(newer.raw_payload->>'classid') = btrim(class_sales.raw_payload->>'classid')
      and (newer.updated_at, newer.id) > (class_sales.updated_at, class_sales.id)
  );
revoke all on public.pts_class_sales_current from public, anon, authenticated;
grant select on public.pts_class_sales_current to service_role;
create or replace view public.pts_third_party_class_credits_reporting
with (security_invoker = true) as
select credit.*,
  case when matched.match_count = 1 then matched.id end as matched_class_id,
  case when matched.match_count = 1 then matched.source_event_key end as matched_source_event_key,
  case when credit.class_time is null then 'missing_class_time'
       when matched.match_count > 1 then 'ambiguous'
       when matched.id is null then 'unmatched' else 'matched' end as match_status
from public.pts_third_party_class_credits credit
left join lateral (
  select min(current_class.id) as id,
         min(current_class.source_event_key) as source_event_key,
         count(distinct current_class.id) as match_count
  from public.pts_class_sales_daily candidate
  join public.pts_class_sales_current current_class
    on current_class.organization_id = candidate.organization_id
   and current_class.studio_id = candidate.studio_id
   and (current_class.id = candidate.id or (
     btrim(candidate.raw_payload->>'classid') ~ '^[1-9][0-9]*$'
     and btrim(current_class.raw_payload->>'classid') = btrim(candidate.raw_payload->>'classid')
   ))
  where candidate.organization_id = credit.organization_id
    and candidate.studio_id = credit.studio_id
    and candidate.class_time = credit.class_time
    and (credit.painting is null or lower(trim(candidate.painting)) = lower(trim(credit.painting)))
) matched on true;
do $$
declare definition text;
begin
  definition := pg_get_viewdef('public.pts_class_sales_reporting'::regclass, true);
  if position('pts_class_sales_daily class_sales' in definition) = 0 then
    raise exception 'Unexpected reporting definition; review before migration';
  end if;
  definition := replace(definition, 'pts_class_sales_daily class_sales', 'pts_class_sales_current class_sales');
  execute 'create or replace view public.pts_class_sales_reporting with (security_invoker = true) as ' || definition;
end $$;
commit;
