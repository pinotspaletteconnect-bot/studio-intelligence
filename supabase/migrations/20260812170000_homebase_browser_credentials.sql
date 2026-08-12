begin;

alter table public.homebase_integration_accounts
  add column if not exists browser_credentials_configured boolean not null default false;

drop function if exists public.configure_homebase_account_with_secret(bigint,text,text,jsonb);

create function public.configure_homebase_account_with_secret(
  p_organization_id bigint, p_account_name text, p_api_key text,
  p_email text, p_password text, p_mappings jsonb
) returns jsonb language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare new_secret_id uuid; mapping jsonb; target_studio public.studios%rowtype; target_account_id bigint; target_mapping_id bigint; configured integer := 0;
begin
  if char_length(trim(p_account_name)) not between 2 and 120 then raise exception 'Invalid Homebase account name'; end if;
  if char_length(trim(p_api_key)) not between 16 and 4096 then raise exception 'Invalid Homebase API key'; end if;
  if position('@' in trim(p_email)) < 2 or char_length(trim(p_email)) > 254 then raise exception 'Invalid Homebase email'; end if;
  if char_length(p_password) not between 1 and 1024 then raise exception 'Invalid Homebase password'; end if;
  if jsonb_typeof(p_mappings) <> 'array' or jsonb_array_length(p_mappings) = 0 then raise exception 'Homebase mappings are required'; end if;
  if exists (select 1 from jsonb_array_elements(p_mappings) a join jsonb_array_elements(p_mappings) b on a <> b and a->>'locationUuid' = b->>'locationUuid') then raise exception 'Each Homebase location UUID must be unique'; end if;

  select vault.create_secret(
    jsonb_build_object('apiKey',trim(p_api_key),'email',lower(trim(p_email)),'password',p_password)::text,
    'homebase-account-' || p_organization_id::text || '-' || extract(epoch from clock_timestamp())::bigint::text,
    'Studio Intelligence Homebase API and browser credentials'
  ) into new_secret_id;

  for mapping in select * from jsonb_array_elements(p_mappings) loop
    select * into target_studio from public.studios
      where id=(mapping->>'studioId')::bigint and organization_id=p_organization_id and active=true;
    if target_studio.id is null or nullif(trim(mapping->>'locationUuid'),'') is null then raise exception 'Invalid Homebase studio mapping'; end if;
    insert into public.homebase_integration_accounts
      (organization_id,studio_id,account_name,account_key,location_uuid,location_name,secret_reference,last_validated_at,browser_credentials_configured)
    values (p_organization_id,target_studio.id,trim(p_account_name),'default',trim(mapping->>'locationUuid'),null,new_secret_id::text,null,true)
    on conflict (organization_id,studio_id) do update set
      account_name=excluded.account_name,account_key='default',location_uuid=excluded.location_uuid,
      location_name=null,secret_reference=excluded.secret_reference,last_validated_at=null,
      browser_credentials_configured=true,is_active=true,updated_at=now()
    returning id into target_account_id;
    select id into target_mapping_id from public.studio_integrations
      where organization_id=p_organization_id and studio_id=target_studio.id and integration_type='homebase' order by id limit 1;
    if target_mapping_id is null then
      insert into public.studio_integrations
        (organization_id,brand_id,studio_id,integration_type,integration_name,external_id,is_active,configuration)
      values (p_organization_id,target_studio.brand_id,target_studio.id,'homebase',trim(p_account_name),trim(mapping->>'locationUuid'),true,jsonb_build_object('homebase_account_id',target_account_id));
    else
      update public.studio_integrations set integration_name=trim(p_account_name),external_id=trim(mapping->>'locationUuid'),is_active=true,
        configuration=jsonb_build_object('homebase_account_id',target_account_id),updated_at=now() where id=target_mapping_id;
    end if;
    configured := configured + 1;
  end loop;
  return jsonb_build_object('configuredStudios',configured);
end; $$;

revoke all on function public.configure_homebase_account_with_secret(bigint,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.configure_homebase_account_with_secret(bigint,text,text,text,text,jsonb) to service_role;

create or replace view public.homebase_browser_collection_accounts as
select min(id) as account_id, organization_id, min(account_name) as account_name
from public.homebase_integration_accounts
where is_active=true and browser_credentials_configured=true
group by organization_id,secret_reference;

revoke all on table public.homebase_browser_collection_accounts from public,anon,authenticated;
grant select on table public.homebase_browser_collection_accounts to service_role;

commit;
