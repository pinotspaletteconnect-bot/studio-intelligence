-- Studio Intelligence: read-only Supabase security inventory
--
-- Run in the Supabase SQL Editor. This query reads database metadata only.
-- It does not read application rows or modify database objects.

with
public_relations as (
  select
    c.oid,
    n.nspname as schema_name,
    c.relname as relation_name,
    case c.relkind
      when 'r' then 'table'
      when 'p' then 'partitioned_table'
      when 'v' then 'view'
      when 'm' then 'materialized_view'
      when 'f' then 'foreign_table'
      else c.relkind::text
    end as relation_type,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
relation_columns as (
  select
    cols.table_schema as schema_name,
    cols.table_name as relation_name,
    jsonb_agg(
      jsonb_build_object(
        'name', cols.column_name,
        'position', cols.ordinal_position,
        'data_type', cols.data_type,
        'udt_name', cols.udt_name,
        'nullable', cols.is_nullable = 'YES',
        'default', cols.column_default
      )
      order by cols.ordinal_position
    ) as columns
  from information_schema.columns cols
  where cols.table_schema = 'public'
  group by cols.table_schema, cols.table_name
),
relation_policies as (
  select
    schemaname as schema_name,
    tablename as relation_name,
    jsonb_agg(
      jsonb_build_object(
        'name', policyname,
        'permissive', permissive,
        'roles', roles,
        'command', cmd,
        'using', qual,
        'with_check', with_check
      )
      order by policyname
    ) as policies
  from pg_catalog.pg_policies
  where schemaname = 'public'
  group by schemaname, tablename
),
relation_grants as (
  select
    table_schema as schema_name,
    table_name as relation_name,
    jsonb_agg(
      distinct jsonb_build_object(
        'grantee', grantee,
        'privilege', privilege_type
      )
    ) as grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated', 'service_role')
  group by table_schema, table_name
),
relation_constraints as (
  select
    n.nspname as schema_name,
    c.relname as relation_name,
    jsonb_agg(
      jsonb_build_object(
        'name', con.conname,
        'type', case con.contype
          when 'p' then 'primary_key'
          when 'f' then 'foreign_key'
          when 'u' then 'unique'
          when 'c' then 'check'
          when 'x' then 'exclusion'
          else con.contype::text
        end,
        'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
      )
      order by con.conname
    ) as constraints
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class c on c.oid = con.conrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
  group by n.nspname, c.relname
),
relation_indexes as (
  select
    schemaname as schema_name,
    tablename as relation_name,
    jsonb_agg(
      jsonb_build_object(
        'name', indexname,
        'definition', indexdef
      )
      order by indexname
    ) as indexes
  from pg_catalog.pg_indexes
  where schemaname = 'public'
  group by schemaname, tablename
),
view_metadata as (
  select
    v.schemaname as schema_name,
    v.viewname as relation_name,
    jsonb_build_object(
      'owner', v.viewowner,
      'definition', v.definition,
      'security_invoker', coalesce(
        (
          select (option_value = 'true')
          from pg_catalog.pg_options_to_table(c.reloptions)
          where option_name = 'security_invoker'
        ),
        false
      )
    ) as view_metadata
  from pg_catalog.pg_views v
  join pg_catalog.pg_namespace n on n.nspname = v.schemaname
  join pg_catalog.pg_class c
    on c.relnamespace = n.oid
   and c.relname = v.viewname
   and c.relkind = 'v'
  where v.schemaname = 'public'
),
relation_inventory as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', r.schema_name,
      'name', r.relation_name,
      'type', r.relation_type,
      'rls_enabled', r.rls_enabled,
      'rls_forced', r.rls_forced,
      'has_studio_id', coalesce(
        exists (
          select 1
          from information_schema.columns c
          where c.table_schema = r.schema_name
            and c.table_name = r.relation_name
            and c.column_name = 'studio_id'
        ),
        false
      ),
      'columns', coalesce(cols.columns, '[]'::jsonb),
      'policies', coalesce(pol.policies, '[]'::jsonb),
      'grants', coalesce(g.grants, '[]'::jsonb),
      'constraints', coalesce(con.constraints, '[]'::jsonb),
      'indexes', coalesce(idx.indexes, '[]'::jsonb),
      'view', vm.view_metadata
    )
    order by r.relation_type, r.relation_name
  ) as relations
  from public_relations r
  left join relation_columns cols
    on cols.schema_name = r.schema_name
   and cols.relation_name = r.relation_name
  left join relation_policies pol
    on pol.schema_name = r.schema_name
   and pol.relation_name = r.relation_name
  left join relation_grants g
    on g.schema_name = r.schema_name
   and g.relation_name = r.relation_name
  left join relation_constraints con
    on con.schema_name = r.schema_name
   and con.relation_name = r.relation_name
  left join relation_indexes idx
    on idx.schema_name = r.schema_name
   and idx.relation_name = r.relation_name
  left join view_metadata vm
    on vm.schema_name = r.schema_name
   and vm.relation_name = r.relation_name
),
function_inventory as (
  select jsonb_agg(
    jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result', pg_catalog.pg_get_function_result(p.oid),
      'language', l.lanname,
      'security_definer', p.prosecdef,
      'volatility', case p.provolatile
        when 'i' then 'immutable'
        when 's' then 'stable'
        when 'v' then 'volatile'
      end,
      'execute_granted_to_public', has_function_privilege(
        'public',
        p.oid,
        'execute'
      )
    )
    order by n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
  ) as functions
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_language l on l.oid = p.prolang
  where n.nspname in ('public', 'security', 'private')
),
exposed_schema_setting as (
  select current_setting('pgrst.db_schemas', true) as value
)
select jsonb_pretty(
  jsonb_build_object(
    'generated_at', current_timestamp,
    'database_version', version(),
    'exposed_schemas_setting', (select value from exposed_schema_setting),
    'relations', coalesce((select relations from relation_inventory), '[]'::jsonb),
    'functions', coalesce((select functions from function_inventory), '[]'::jsonb)
  )
) as security_inventory;
