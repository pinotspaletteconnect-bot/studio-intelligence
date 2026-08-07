-- Allow the settings credential form to initialize legacy PTS account rows
-- whose secret reference predates the Vault handoff.

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
  account_found boolean;
begin
  if char_length(trim(p_username)) not between 2 and 254 then
    raise exception 'Invalid PTS username';
  end if;
  if char_length(p_password) not between 1 and 1024 then
    raise exception 'Invalid PTS password';
  end if;

  select true,
    case
      when secret_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then secret_reference::uuid
      else null
    end
  into account_found, vault_secret_id
  from public.pts_integration_accounts
  where id = p_account_id
    and organization_id = p_organization_id
    and is_active = true;

  if not coalesce(account_found, false) then
    raise exception 'PTS account not found';
  end if;

  if vault_secret_id is null then
    select vault.create_secret(
      jsonb_build_object('username', trim(p_username), 'password', p_password)::text,
      'pts-account-' || p_account_id::text,
      'Studio Intelligence PTS account credentials'
    ) into vault_secret_id;
  else
    perform vault.update_secret(
      vault_secret_id,
      jsonb_build_object('username', trim(p_username), 'password', p_password)::text,
      'pts-account-' || p_account_id::text,
      'Studio Intelligence PTS account credentials'
    );
  end if;

  update public.pts_integration_accounts
  set secret_provider = 'supabase_vault',
      secret_reference = vault_secret_id::text,
      last_validated_at = null,
      updated_at = now()
  where id = p_account_id and organization_id = p_organization_id;
end;
$$;

revoke all on function public.replace_pts_account_secret(bigint, bigint, text, text) from public, anon, authenticated;
grant execute on function public.replace_pts_account_secret(bigint, bigint, text, text) to service_role;
