-- Allow a shared n8n success/error handler to close a PTS collection audit by
-- opaque execution reference. Only sanitized outcome metadata is accepted.

begin;

create unique index if not exists integration_runs_pts_execution_uidx
  on public.integration_runs (execution_reference)
  where integration_type = 'pts' and execution_reference is not null;

create or replace function public.complete_pts_collection_run_by_execution(
  p_execution_reference text,
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
  normalized_reference text := nullif(trim(coalesce(p_execution_reference, '')), '');
  normalized_status text := lower(trim(coalesce(p_status, '')));
  normalized_error_category text := nullif(lower(trim(coalesce(p_error_category, ''))), '');
begin
  if normalized_reference is null or char_length(normalized_reference) > 160 then
    raise exception 'PTS execution reference is invalid';
  end if;
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
  where integration_type = 'pts'
    and execution_reference = normalized_reference
    and status = 'running';

  if not found then
    raise exception 'Running PTS collection audit record was not found';
  end if;
end;
$$;

revoke all on function public.complete_pts_collection_run_by_execution(
  text, text, integer, text
) from public, anon, authenticated;
grant execute on function public.complete_pts_collection_run_by_execution(
  text, text, integer, text
) to service_role;

comment on function public.complete_pts_collection_run_by_execution(
  text, text, integer, text
) is
  'Closes one running PTS audit by opaque n8n execution reference using only a sanitized status, row count, and error category.';

commit;
