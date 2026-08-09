-- Privacy-safe, account-level PTS collection auditing.
-- This extends the existing generic integration_runs table. It never stores
-- source credentials, reservation contacts, tokens, raw payloads, or raw error
-- messages.

begin;

alter table public.integration_runs
  add column if not exists organization_id bigint references public.organizations(id) on delete set null,
  add column if not exists integration_account_id bigint references public.pts_integration_accounts(id) on delete set null,
  add column if not exists workflow_name text,
  add column if not exists report_type text,
  add column if not exists requested_from_date date,
  add column if not exists requested_to_date date,
  add column if not exists attempt_count integer not null default 1,
  add column if not exists execution_reference text,
  add column if not exists error_category text;

alter table public.integration_runs
  drop constraint if exists integration_runs_attempt_count_check,
  add constraint integration_runs_attempt_count_check
    check (attempt_count >= 1),
  drop constraint if exists integration_runs_requested_range_check,
  add constraint integration_runs_requested_range_check
    check (
      requested_from_date is null
      or requested_to_date is null
      or requested_from_date <= requested_to_date
    ),
  drop constraint if exists integration_runs_pts_error_category_check,
  add constraint integration_runs_pts_error_category_check
    check (
      error_category is null
      or error_category in (
        'authentication',
        'configuration',
        'source_timeout',
        'source_unavailable',
        'validation',
        'warehouse',
        'unknown'
      )
    );

create index if not exists integration_runs_pts_account_started_idx
  on public.integration_runs (integration_account_id, started_at desc)
  where integration_type = 'pts';

create index if not exists integration_runs_organization_status_idx
  on public.integration_runs (organization_id, status, started_at desc);

alter table public.integration_runs enable row level security;
revoke all on table public.integration_runs from public, anon, authenticated;
grant select, insert, update on table public.integration_runs to service_role;

create or replace function public.start_pts_collection_run(
  p_organization_id bigint,
  p_integration_account_id bigint,
  p_workflow_name text,
  p_report_type text,
  p_requested_from_date date default null,
  p_requested_to_date date default null,
  p_execution_reference text default null,
  p_attempt_count integer default 1
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  run_id bigint;
begin
  if p_attempt_count < 1 then
    raise exception 'Attempt count must be at least one';
  end if;
  if p_requested_from_date is not null
     and p_requested_to_date is not null
     and p_requested_from_date > p_requested_to_date then
    raise exception 'Requested date range is invalid';
  end if;
  if char_length(trim(coalesce(p_workflow_name, ''))) not between 2 and 160 then
    raise exception 'Workflow name is invalid';
  end if;
  if char_length(trim(coalesce(p_report_type, ''))) not between 2 and 80 then
    raise exception 'Report type is invalid';
  end if;
  if not exists (
    select 1
    from public.pts_integration_accounts account
    where account.id = p_integration_account_id
      and account.organization_id = p_organization_id
      and account.is_active = true
  ) then
    raise exception 'Active PTS account mapping was not found';
  end if;

  insert into public.integration_runs (
    integration_type,
    organization_id,
    integration_account_id,
    workflow_name,
    report_type,
    requested_from_date,
    requested_to_date,
    execution_reference,
    attempt_count,
    started_at,
    status,
    rows_processed,
    notes
  ) values (
    'pts',
    p_organization_id,
    p_integration_account_id,
    trim(p_workflow_name),
    trim(p_report_type),
    p_requested_from_date,
    p_requested_to_date,
    nullif(trim(coalesce(p_execution_reference, '')), ''),
    p_attempt_count,
    now(),
    'running',
    0,
    null
  )
  returning id into run_id;

  return run_id;
end;
$$;

create or replace function public.finish_pts_collection_run(
  p_run_id bigint,
  p_organization_id bigint,
  p_integration_account_id bigint,
  p_status text,
  p_rows_processed integer default 0,
  p_error_category text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_status text := lower(trim(coalesce(p_status, '')));
  normalized_error_category text := nullif(lower(trim(coalesce(p_error_category, ''))), '');
begin
  if normalized_status not in ('succeeded', 'failed') then
    raise exception 'PTS collection status must be succeeded or failed';
  end if;
  if p_rows_processed < 0 then
    raise exception 'Rows processed cannot be negative';
  end if;
  if normalized_error_category is not null and normalized_error_category not in (
    'authentication',
    'configuration',
    'source_timeout',
    'source_unavailable',
    'validation',
    'warehouse',
    'unknown'
  ) then
    raise exception 'PTS collection error category is invalid';
  end if;
  if normalized_status = 'succeeded' then
    normalized_error_category := null;
  end if;

  update public.integration_runs
  set completed_at = now(),
      status = normalized_status,
      rows_processed = p_rows_processed,
      error_category = normalized_error_category,
      notes = null
  where id = p_run_id
    and integration_type = 'pts'
    and organization_id = p_organization_id
    and integration_account_id = p_integration_account_id
    and status = 'running';

  if not found then
    raise exception 'Running PTS collection audit record was not found';
  end if;
end;
$$;

revoke all on function public.start_pts_collection_run(
  bigint, bigint, text, text, date, date, text, integer
) from public, anon, authenticated;
revoke all on function public.finish_pts_collection_run(
  bigint, bigint, bigint, text, integer, text
) from public, anon, authenticated;
grant execute on function public.start_pts_collection_run(
  bigint, bigint, text, text, date, date, text, integer
) to service_role;
grant execute on function public.finish_pts_collection_run(
  bigint, bigint, bigint, text, integer, text
) to service_role;

comment on table public.integration_runs is
  'Privacy-safe integration execution audit. PTS rows contain account metadata and sanitized outcomes, never credentials or raw source payloads.';
comment on column public.integration_runs.integration_account_id is
  'Opaque PTS account identifier; source credentials remain in Supabase Vault.';
comment on column public.integration_runs.error_category is
  'Sanitized operational category only. Raw source errors and sensitive values must not be stored.';

commit;
