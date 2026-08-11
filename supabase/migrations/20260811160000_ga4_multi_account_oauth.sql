begin;

alter table public.ga4_integration_accounts
  add column if not exists authentication_type text not null default 'service_account',
  add column if not exists google_account_email text;

alter table public.ga4_integration_accounts
  drop constraint if exists ga4_authentication_type;
alter table public.ga4_integration_accounts
  add constraint ga4_authentication_type
  check (authentication_type in ('oauth', 'service_account'));

create or replace function public.create_ga4_oauth_account_with_secret(
  p_organization_id bigint,
  p_account_name text,
  p_google_account_email text,
  p_oauth_credentials jsonb
) returns bigint language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare account_id bigint; vault_secret_id uuid;
begin
  if char_length(trim(p_account_name)) not between 2 and 120 then raise exception 'Invalid GA4 account name'; end if;
  if nullif(trim(p_google_account_email), '') is null then raise exception 'Google account email is required'; end if;
  if jsonb_typeof(p_oauth_credentials) <> 'object'
    or nullif(p_oauth_credentials ->> 'refresh_token', '') is null
    or nullif(p_oauth_credentials ->> 'client_id', '') is null
    or nullif(p_oauth_credentials ->> 'client_secret', '') is null
  then raise exception 'Invalid Google OAuth credentials'; end if;

  insert into public.ga4_integration_accounts (
    organization_id, account_name, authentication_type, google_account_email, secret_reference
  ) values (
    p_organization_id, trim(p_account_name), 'oauth', lower(trim(p_google_account_email)),
    'pending:' || gen_random_uuid()::text
  ) returning id into account_id;

  select vault.create_secret(
    p_oauth_credentials::text,
    'ga4-oauth-account-' || account_id::text,
    'Studio Intelligence GA4 OAuth refresh credentials'
  ) into vault_secret_id;

  update public.ga4_integration_accounts
  set secret_reference = vault_secret_id::text, updated_at = now()
  where id = account_id;
  return account_id;
end; $$;

create or replace view public.ga4_collection_accounts as
select id as account_id, organization_id, account_name,
  last_discovered_at, last_validated_at, authentication_type, google_account_email
from public.ga4_integration_accounts where is_active = true;

revoke all on function public.create_ga4_oauth_account_with_secret(bigint,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_ga4_oauth_account_with_secret(bigint,text,text,jsonb)
  to service_role;

comment on table public.ga4_integration_accounts is
  'Tenant-scoped GA4 Google-account connections. OAuth refresh credentials are stored only in Supabase Vault; one connection may serve many studio properties.';
comment on view public.ga4_collection_targets is
  'Service-only GA4 OAuth connection, property, and studio routing without secret values.';

commit;
