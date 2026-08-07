begin;
alter table public.textellent_accounts add column if not exists description text;
alter table public.textellent_accounts add constraint textellent_accounts_description_length check (description is null or char_length(description) <= 500);

create or replace function public.create_textellent_account_with_secret(p_organization_id bigint, p_account_name text, p_description text, p_sender_number text, p_auth_code text)
returns bigint language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare account_id bigint; vault_secret_id uuid;
begin
  if char_length(trim(p_account_name)) not between 2 and 120 then raise exception 'Invalid account name'; end if;
  if p_sender_number !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid sender number'; end if;
  if char_length(trim(p_auth_code)) not between 8 and 2048 then raise exception 'Invalid authentication code'; end if;
  if p_description is not null and char_length(trim(p_description)) > 500 then raise exception 'Description is too long'; end if;
  insert into public.textellent_accounts (organization_id, account_name, description, sender_number, secret_reference)
  values (p_organization_id, trim(p_account_name), nullif(trim(p_description), ''), p_sender_number, 'pending:' || gen_random_uuid()::text) returning id into account_id;
  select vault.create_secret(jsonb_build_object('authCode', trim(p_auth_code))::text, 'textellent-account-' || account_id::text, 'Studio Intelligence Textellent API authentication code') into vault_secret_id;
  update public.textellent_accounts set secret_reference = vault_secret_id::text where id = account_id;
  return account_id;
end; $$;
revoke all on function public.create_textellent_account_with_secret(bigint, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_textellent_account_with_secret(bigint, text, text, text, text) to service_role;
commit;
