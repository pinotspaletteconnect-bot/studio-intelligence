begin;

create or replace function public.map_meta_asset(
  p_organization_id bigint, p_account_id bigint, p_asset_type text, p_asset_id text, p_studio_id bigint
) returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare asset_record public.meta_source_assets%rowtype; target_brand_id bigint; mapping_id bigint; integration_kind text;
begin
  if p_asset_type not in ('ad_account', 'page', 'instagram_account') then raise exception 'Unsupported Meta mapping asset'; end if;
  select * into asset_record from public.meta_source_assets where organization_id = p_organization_id
    and account_id = p_account_id and asset_type = p_asset_type and asset_id = trim(p_asset_id) and is_active = true;
  if asset_record.id is null then raise exception 'Meta asset not found'; end if;
  select brand_id into target_brand_id from public.studios where id = p_studio_id and organization_id = p_organization_id and active = true;
  if target_brand_id is null then raise exception 'Studio not found'; end if;
  integration_kind := case p_asset_type when 'ad_account' then 'meta_ads' when 'page' then 'meta_page' else 'meta_instagram' end;

  select id into mapping_id from public.studio_integrations
  where organization_id = p_organization_id and integration_type = integration_kind
    and external_id = asset_record.asset_id and is_active = true limit 1 for update;
  if mapping_id is null then
    select id into mapping_id from public.studio_integrations
    where organization_id = p_organization_id and integration_type = integration_kind
      and studio_id = p_studio_id and is_active = true limit 1 for update;
  end if;

  if mapping_id is null then
    insert into public.studio_integrations (organization_id, brand_id, studio_id, integration_type,
      integration_name, external_id, is_active, configuration)
    values (p_organization_id, target_brand_id, p_studio_id, integration_kind, asset_record.display_name,
      asset_record.asset_id, true, jsonb_build_object('meta_account_id', p_account_id, 'asset_type', p_asset_type))
    returning id into mapping_id;
  else
    update public.studio_integrations set brand_id = target_brand_id, studio_id = p_studio_id,
      integration_name = asset_record.display_name, external_id = asset_record.asset_id,
      configuration = coalesce(configuration, '{}'::jsonb) || jsonb_build_object('meta_account_id', p_account_id, 'asset_type', p_asset_type)
    where id = mapping_id;
  end if;
  return mapping_id;
end; $$;

revoke all on function public.map_meta_asset(bigint,bigint,text,text,bigint) from public, anon, authenticated;
grant execute on function public.map_meta_asset(bigint,bigint,text,text,bigint) to service_role;

commit;
