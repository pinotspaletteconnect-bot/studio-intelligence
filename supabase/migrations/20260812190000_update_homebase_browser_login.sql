begin;

create function public.update_homebase_browser_login(
  p_organization_id bigint, p_account_id bigint, p_email text, p_password text
) returns jsonb language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare old_secret_reference text; old_secret jsonb; api_key text; new_secret_id uuid; updated_accounts integer;
begin
  if position('@' in trim(p_email)) < 2 or char_length(trim(p_email)) > 254 then raise exception 'Invalid Homebase email'; end if;
  if char_length(p_password) not between 1 and 1024 then raise exception 'Invalid Homebase password'; end if;
  select secret_reference into old_secret_reference from public.homebase_integration_accounts
    where id=p_account_id and organization_id=p_organization_id and is_active=true and browser_credentials_configured=true;
  if old_secret_reference is null then raise exception 'Homebase connection not found'; end if;
  select decrypted_secret::jsonb into old_secret from vault.decrypted_secrets where id=old_secret_reference::uuid;
  api_key := nullif(trim(old_secret->>'apiKey'),'');
  if api_key is null then raise exception 'Existing Homebase API key is unavailable'; end if;
  select vault.create_secret(
    jsonb_build_object('apiKey',api_key,'email',lower(trim(p_email)),'password',p_password)::text,
    'homebase-account-' || p_organization_id::text || '-' || extract(epoch from clock_timestamp())::bigint::text,
    'Studio Intelligence Homebase API and browser credentials'
  ) into new_secret_id;
  update public.homebase_integration_accounts set secret_reference=new_secret_id::text,
    browser_credentials_configured=true,updated_at=now()
    where organization_id=p_organization_id and secret_reference=old_secret_reference;
  get diagnostics updated_accounts = row_count;
  return jsonb_build_object('updatedAccounts',updated_accounts);
end; $$;

revoke all on function public.update_homebase_browser_login(bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.update_homebase_browser_login(bigint,bigint,text,text) to service_role;

commit;
