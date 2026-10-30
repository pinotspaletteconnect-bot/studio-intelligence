begin;
do $$
declare definition text;
begin
  definition := pg_get_viewdef('public.pts_class_sales_reporting'::regclass, true);
  if position('pts_class_sales_current class_sales' in definition) = 0 then
    raise exception 'Unexpected reporting definition; review before migration';
  end if;
  definition := replace(definition, 'pts_class_sales_current class_sales', 'pts_class_sales_daily class_sales');
  execute 'create or replace view public.pts_class_sales_reporting with (security_invoker = true) as ' || definition;
end $$;

create or replace view public.pts_third_party_class_credits_reporting
with (security_invoker = true)
as
select
  credit.*,
  case when matched.match_count = 1 then matched.id end as matched_class_id,
  case when matched.match_count = 1 then matched.source_event_key end as matched_source_event_key,
  case
    when credit.class_time is null then 'missing_class_time'
    when matched.match_count > 1 then 'ambiguous'
    when matched.id is null then 'unmatched'
    else 'matched'
  end as match_status
from public.pts_third_party_class_credits credit
left join lateral (
  select
    min(candidate.id) as id,
    min(candidate.source_event_key) as source_event_key,
    count(*) as match_count
  from public.pts_class_sales_daily candidate
  where candidate.organization_id = credit.organization_id
    and candidate.studio_id = credit.studio_id
    and candidate.class_time = credit.class_time
    and (
      credit.painting is null
      or lower(trim(candidate.painting)) = lower(trim(credit.painting))
    )
) matched on true;


drop view public.pts_class_sales_current;
commit;
