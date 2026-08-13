begin;

create function public.store_homebase_browser_session(
  p_account_id bigint,
  p_storage_state jsonb
) returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  old_secret_id uuid;
  old_secret jsonb;
  new_secret_id uuid;
begin
  if jsonb_typeof(p_storage_state) <> 'object'
     or jsonb_typeof(p_storage_state->'cookies') <> 'array'
     or pg_column_size(p_storage_state) > 262144 then
    raise exception 'Invalid Homebase browser session';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_storage_state->'cookies') cookie
    where coalesce(cookie->>'domain','') !~* '(^|\.)joinhomebase\.com$'
  ) then
    raise exception 'Unexpected Homebase session domain';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_storage_state->'origins','[]'::jsonb)) origin
    where coalesce(origin->>'origin','') !~* '^https://([a-z0-9-]+\.)*joinhomebase\.com(:[0-9]+)?$'
  ) then
    raise exception 'Unexpected Homebase session origin';
  end if;

  select secret_reference::uuid into old_secret_id
  from public.homebase_integration_accounts
  where id=p_account_id and is_active=true and browser_credentials_configured=true;
  if old_secret_id is null then raise exception 'Homebase connection not found'; end if;

  select decrypted_secret::jsonb into old_secret
  from vault.decrypted_secrets where id=old_secret_id;
  if nullif(old_secret->>'apiKey','') is null then raise exception 'Homebase credential is unavailable'; end if;

  select vault.create_secret(
    (old_secret || jsonb_build_object('storageState',p_storage_state,'sessionCapturedAt',now()))::text,
    'homebase-account-session-' || extract(epoch from clock_timestamp())::bigint::text,
    'Studio Intelligence encrypted Homebase API, login, and browser session'
  ) into new_secret_id;

  update public.homebase_integration_accounts
  set secret_reference=new_secret_id::text,updated_at=now()
  where secret_reference=old_secret_id::text;
  delete from vault.secrets where id=old_secret_id;
end; $$;

revoke all on function public.store_homebase_browser_session(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.store_homebase_browser_session(bigint,jsonb) to service_role;

commit;
