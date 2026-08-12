begin;

alter table public.homebase_integration_accounts
  alter column secret_reference drop not null;

create function public.clear_homebase_account_credentials(p_organization_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  secret_ids uuid[];
  cleared_accounts integer;
begin
  select coalesce(array_agg(distinct secret_reference::uuid), '{}'::uuid[])
    into secret_ids
  from public.homebase_integration_accounts
  where organization_id = p_organization_id
    and secret_reference is not null
    and secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  update public.homebase_integration_accounts
  set secret_reference = null,
      browser_credentials_configured = false,
      last_validated_at = null,
      updated_at = now()
  where organization_id = p_organization_id;
  get diagnostics cleared_accounts = row_count;

  delete from vault.secrets where id = any(secret_ids);

  return jsonb_build_object(
    'clearedAccounts', cleared_accounts,
    'deletedSecrets', cardinality(secret_ids)
  );
end;
$$;

revoke all on function public.clear_homebase_account_credentials(bigint)
  from public, anon, authenticated;
grant execute on function public.clear_homebase_account_credentials(bigint)
  to service_role;

commit;
