-- Allow the Vault onboarding flow to adopt an existing legacy MNTN studio
-- mapping without replacing its identity or disrupting reporting references.

begin;

create or replace function public.create_mntn_connection_with_secret(
  p_organization_id bigint,
  p_account_name text,
  p_api_key text,
  p_studio_id bigint,
  p_advertiser_id text
)
returns bigint
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  account_id bigint;
  vault_secret_id uuid;
  target_brand_id bigint;
  existing_mapping public.studio_integrations%rowtype;
begin
  if char_length(trim(p_account_name)) not between 2 and 120 then raise exception 'Invalid MNTN account name'; end if;
  if char_length(trim(p_api_key)) not between 8 and 2048 then raise exception 'Invalid MNTN API key'; end if;
  if trim(p_advertiser_id) !~ '^[0-9]{1,20}$' then raise exception 'Invalid MNTN advertiser ID'; end if;

  select brand_id into target_brand_id
  from public.studios
  where id = p_studio_id and organization_id = p_organization_id and active = true;
  if target_brand_id is null then raise exception 'Studio not found'; end if;

  select * into existing_mapping
  from public.studio_integrations
  where organization_id = p_organization_id
    and integration_type = 'mntn'
    and (studio_id = p_studio_id or external_id = trim(p_advertiser_id))
    and is_active = true
  limit 1
  for update;

  if existing_mapping.id is not null and (
    existing_mapping.studio_id <> p_studio_id
    or existing_mapping.external_id <> trim(p_advertiser_id)
  ) then
    raise exception 'Studio or advertiser already has a different active MNTN mapping';
  end if;

  if existing_mapping.id is not null
    and nullif(existing_mapping.configuration ->> 'mntn_account_id', '') is not null then
    raise exception 'Studio and advertiser already have a Vault-backed MNTN mapping';
  end if;

  insert into public.mntn_integration_accounts (
    organization_id, account_name, secret_reference
  ) values (
    p_organization_id, trim(p_account_name), 'pending:' || gen_random_uuid()::text
  ) returning id into account_id;

  select vault.create_secret(
    jsonb_build_object('apiKey', trim(p_api_key))::text,
    'mntn-account-' || account_id::text,
    'Studio Intelligence MNTN Reporting API key'
  ) into vault_secret_id;

  update public.mntn_integration_accounts
  set secret_reference = vault_secret_id::text, updated_at = now()
  where id = account_id;

  if existing_mapping.id is not null then
    update public.studio_integrations
    set configuration = coalesce(configuration, '{}'::jsonb) || jsonb_build_object(
      'mntn_account_id', account_id,
      'attribution_window_days', 30,
      'refresh_window_days', 35
    )
    where id = existing_mapping.id;
  else
    insert into public.studio_integrations (
      organization_id, brand_id, studio_id, integration_type,
      integration_name, external_id, is_active, configuration
    ) values (
      p_organization_id, target_brand_id, p_studio_id, 'mntn',
      trim(p_account_name), trim(p_advertiser_id), true,
      jsonb_build_object(
        'mntn_account_id', account_id,
        'attribution_window_days', 30,
        'refresh_window_days', 35
      )
    );
  end if;

  return account_id;
end;
$$;

revoke all on function public.create_mntn_connection_with_secret(bigint, text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.create_mntn_connection_with_secret(bigint, text, text, bigint, text)
  to service_role;

commit;
