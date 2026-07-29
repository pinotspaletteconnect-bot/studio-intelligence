-- Resolve every MNTN fact through studio_integrations so n8n never hardcodes
-- organization, brand, or studio IDs.

begin;

create or replace function public.assign_mntn_daily_metric_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  integration_record public.studio_integrations%rowtype;
begin
  select *
  into integration_record
  from public.studio_integrations
  where integration_type = 'mntn'
    and external_id = new.advertiser_id
    and is_active is true
  order by id
  limit 1;

  if integration_record.id is null then
    raise exception
      'No active MNTN studio integration exists for advertiser %',
      new.advertiser_id
      using errcode = '23503';
  end if;

  new.organization_id := integration_record.organization_id;
  new.brand_id := integration_record.brand_id;
  new.studio_id := integration_record.studio_id;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists assign_mntn_daily_metric_tenant
  on public.mntn_daily_metrics;

create trigger assign_mntn_daily_metric_tenant
before insert or update of advertiser_id
on public.mntn_daily_metrics
for each row
execute function public.assign_mntn_daily_metric_tenant();

revoke all on function public.assign_mntn_daily_metric_tenant() from public;

comment on function public.assign_mntn_daily_metric_tenant() is
  'Assigns MNTN fact tenant keys from the active studio_integrations advertiser mapping and rejects unmapped advertisers.';

commit;
