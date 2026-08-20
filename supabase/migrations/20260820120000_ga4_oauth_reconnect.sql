begin;

create or replace function public.replace_ga4_oauth_account_secret(
  p_organization_id bigint,
  p_account_id bigint,
  p_google_account_email text,
  p_oauth_credentials jsonb
) returns void language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare vault_secret_id uuid;
begin
  if nullif(trim(p_google_account_email), '') is null then raise exception 'Google account email is required'; end if;
  if jsonb_typeof(p_oauth_credentials) <> 'object'
    or nullif(p_oauth_credentials ->> 'refresh_token', '') is null
    or nullif(p_oauth_credentials ->> 'client_id', '') is null
    or nullif(p_oauth_credentials ->> 'client_secret', '') is null
  then raise exception 'Invalid Google OAuth credentials'; end if;

  select secret_reference::uuid into vault_secret_id
  from public.ga4_integration_accounts
  where id = p_account_id and organization_id = p_organization_id
    and authentication_type = 'oauth' and secret_provider = 'supabase_vault' and is_active = true
    and secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  if vault_secret_id is null then raise exception 'GA4 OAuth account not found'; end if;

  perform vault.update_secret(
    vault_secret_id,
    p_oauth_credentials::text,
    'ga4-oauth-account-' || p_account_id::text,
    'Studio Intelligence GA4 OAuth refresh credentials'
  );
  update public.ga4_integration_accounts
  set google_account_email = lower(trim(p_google_account_email)),
      last_validated_at = null,
      updated_at = now()
  where id = p_account_id and organization_id = p_organization_id;
end; $$;

revoke all on function public.replace_ga4_oauth_account_secret(bigint,bigint,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_ga4_oauth_account_secret(bigint,bigint,text,jsonb)
  to service_role;

comment on function public.replace_ga4_oauth_account_secret(bigint,bigint,text,jsonb) is
  'Rotates an existing tenant-scoped GA4 OAuth refresh credential without changing its property mappings.';

commit;
