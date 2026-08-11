begin;

do $$
declare
  target_account public.ga4_integration_accounts%rowtype;
  oauth_account public.ga4_integration_accounts%rowtype;
begin
  select * into target_account from public.ga4_integration_accounts where id = 1 for update;
  select * into oauth_account from public.ga4_integration_accounts
  where id = 2 and authentication_type = 'oauth' and is_active = true for update;

  if target_account.id is null or oauth_account.id is null then
    raise exception 'Expected GA4 shadow and OAuth accounts were not found';
  end if;

  update public.ga4_integration_accounts set
    account_name = 'Legacy GA4 service account',
    authentication_type = 'service_account',
    google_account_email = null,
    secret_reference = target_account.secret_reference,
    is_active = false,
    updated_at = now()
  where id = oauth_account.id;

  update public.ga4_integration_accounts set
    account_name = oauth_account.account_name,
    authentication_type = 'oauth',
    google_account_email = oauth_account.google_account_email,
    secret_reference = oauth_account.secret_reference,
    is_active = true,
    last_discovered_at = oauth_account.last_discovered_at,
    last_validated_at = oauth_account.last_validated_at,
    updated_at = now()
  where id = target_account.id;

  update public.ga4_source_properties
  set account_id = target_account.id, updated_at = now()
  where account_id = oauth_account.id;

  update public.studio_integrations
  set configuration = jsonb_set(coalesce(configuration, '{}'::jsonb), '{ga4_account_id}', to_jsonb(target_account.id), true)
  where integration_type = 'ga4' and is_active = true
    and configuration ->> 'ga4_account_id' = oauth_account.id::text;
end $$;

commit;
