-- Encrypted, multi-account PTS credential storage.
-- Only service-role server code may call these functions. Browser clients,
-- authenticated users, and n8n never receive credential values.

begin;

create extension if not exists supabase_vault with schema vault;

create or replace function public.create_pts_account_with_secret(
  p_organization_id bigint,
  p_account_name text,
  p_username text,
  p_password text
)
returns bigint
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  account_id bigint;
  vault_secret_id uuid;
begin
  if char_length(trim(p_account_name)) not between 2 and 120 then
    raise exception 'Invalid PTS account name';
  end if;
  if char_length(trim(p_username)) not between 2 and 254 then
    raise exception 'Invalid PTS username';
  end if;
  if char_length(p_password) not between 1 and 1024 then
    raise exception 'Invalid PTS password';
  end if;
  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'Organization not found';
  end if;

  insert into public.pts_integration_accounts (
    organization_id,
    account_name,
    secret_provider,
    secret_reference,
    is_active
  ) values (
    p_organization_id,
    trim(p_account_name),
    'supabase_vault',
    'pending:' || gen_random_uuid()::text,
    true
  )
  returning id into account_id;

  select vault.create_secret(
    jsonb_build_object('username', trim(p_username), 'password', p_password)::text,
    'pts-account-' || account_id::text,
    'Studio Intelligence PTS account credentials'
  ) into vault_secret_id;

  update public.pts_integration_accounts
  set secret_reference = vault_secret_id::text,
      updated_at = now()
  where id = account_id;

  return account_id;
end;
$$;

create or replace function public.replace_pts_account_secret(
  p_organization_id bigint,
  p_account_id bigint,
  p_username text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  vault_secret_id uuid;
begin
  if char_length(trim(p_username)) not between 2 and 254 then
    raise exception 'Invalid PTS username';
  end if;
  if char_length(p_password) not between 1 and 1024 then
    raise exception 'Invalid PTS password';
  end if;

  select case
    when secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then secret_reference::uuid
    else null
  end into vault_secret_id
  from public.pts_integration_accounts
  where id = p_account_id
    and organization_id = p_organization_id
    and secret_provider = 'supabase_vault'
    and is_active = true;

  if vault_secret_id is null then
    raise exception 'PTS Vault account not found';
  end if;

  perform vault.update_secret(
    vault_secret_id,
    jsonb_build_object('username', trim(p_username), 'password', p_password)::text,
    'pts-account-' || p_account_id::text,
    'Studio Intelligence PTS account credentials'
  );

  update public.pts_integration_accounts
  set last_validated_at = null,
      updated_at = now()
  where id = p_account_id and organization_id = p_organization_id;
end;
$$;

create or replace function public.get_pts_account_secret(p_account_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  decrypted_value text;
begin
  select decrypted.decrypted_secret into decrypted_value
  from public.pts_integration_accounts account
  join vault.decrypted_secrets decrypted
    on decrypted.id = case
      when account.secret_provider = 'supabase_vault'
       and account.secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then account.secret_reference::uuid
      else null
    end
  where account.id = p_account_id
    and account.secret_provider = 'supabase_vault'
    and account.is_active = true;

  if decrypted_value is null then
    raise exception 'PTS account secret not found';
  end if;

  return decrypted_value::jsonb;
end;
$$;

create or replace function public.mark_pts_account_validated(p_account_id bigint)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.pts_integration_accounts
  set last_validated_at = now(), updated_at = now()
  where id = p_account_id and is_active = true;
$$;

update public.studio_integrations mapping
set configuration = jsonb_set(
  coalesce(mapping.configuration, '{}'::jsonb),
  '{pts_account_id}',
  to_jsonb(account.id),
  true
)
from public.pts_integration_accounts account
where mapping.organization_id = account.organization_id
  and mapping.integration_type = 'pts'
  and mapping.is_active = true
  and mapping.configuration ->> 'credential_reference' = account.secret_reference
  and not (mapping.configuration ? 'pts_account_id');

create or replace view public.pts_collection_targets as
select
  account.organization_id,
  account.id as account_id,
  studio.brand_id,
  studio.id as studio_id,
  studio.studio_code,
  studio.studio_name,
  studio.timezone,
  mapping.external_id as pts_location_id,
  mapping.configuration -> 'reports' as reports
from public.pts_integration_accounts account
join public.studio_integrations mapping
  on mapping.organization_id = account.organization_id
 and mapping.integration_type = 'pts'
 and mapping.is_active = true
 and (
   mapping.configuration ->> 'pts_account_id' = account.id::text
   or (
     not (mapping.configuration ? 'pts_account_id')
     and mapping.configuration ->> 'credential_reference' = account.secret_reference
   )
 )
join public.studios studio
  on studio.id = mapping.studio_id
 and studio.organization_id = account.organization_id
 and studio.active = true
where account.is_active = true;

revoke all on table public.pts_collection_targets from public, anon, authenticated;
grant select on table public.pts_collection_targets to service_role;

revoke all on function public.create_pts_account_with_secret(bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.replace_pts_account_secret(bigint, bigint, text, text) from public, anon, authenticated;
revoke all on function public.get_pts_account_secret(bigint) from public, anon, authenticated;
revoke all on function public.mark_pts_account_validated(bigint) from public, anon, authenticated;

grant execute on function public.create_pts_account_with_secret(bigint, text, text, text) to service_role;
grant execute on function public.replace_pts_account_secret(bigint, bigint, text, text) to service_role;
grant execute on function public.get_pts_account_secret(bigint) to service_role;
grant execute on function public.mark_pts_account_validated(bigint) to service_role;

comment on function public.get_pts_account_secret(bigint) is
  'Server-only PTS credential resolution for the authenticated collector. Never expose through browser or n8n output.';
comment on view public.pts_collection_targets is
  'Service-only, configuration-driven PTS studios grouped by secured account for collector orchestration.';

commit;
