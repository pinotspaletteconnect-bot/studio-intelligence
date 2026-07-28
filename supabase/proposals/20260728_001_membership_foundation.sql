-- Studio Intelligence authentication and tenant-isolation foundation
-- PROPOSAL ONLY: test in development/staging before production.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('organization_admin', 'organization_viewer')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  primary key (user_id, organization_id)
);

create table if not exists public.studio_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  studio_id bigint not null references public.studios(id) on delete cascade,
  role text not null check (role in ('studio_manager', 'studio_viewer')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  primary key (user_id, studio_id)
);

create table if not exists private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists organization_memberships_organization_user_idx
  on public.organization_memberships (organization_id, user_id);

create index if not exists studio_memberships_studio_user_idx
  on public.studio_memberships (studio_id, user_id);

create index if not exists studios_organization_id_idx
  on public.studios (organization_id);

create index if not exists studios_brand_id_idx
  on public.studios (brand_id);

alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.studio_memberships enable row level security;
alter table private.platform_admins enable row level security;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
  );
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and exists (
      select 1
      from private.platform_admins pa
      where pa.user_id = (select auth.uid())
    );
$$;

create or replace function private.can_access_organization(target_organization_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and (
      private.is_platform_admin()
      or exists (
        select 1
        from public.organization_memberships om
        where om.user_id = (select auth.uid())
          and om.organization_id = target_organization_id
      )
      or exists (
        select 1
        from public.studio_memberships sm
        join public.studios s on s.id = sm.studio_id
        where sm.user_id = (select auth.uid())
          and s.organization_id = target_organization_id
      )
    );
$$;

create or replace function private.can_access_studio(target_studio_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and (
      private.is_platform_admin()
      or exists (
        select 1
        from public.studio_memberships sm
        where sm.user_id = (select auth.uid())
          and sm.studio_id = target_studio_id
      )
      or exists (
        select 1
        from public.studios s
        join public.organization_memberships om
          on om.organization_id = s.organization_id
        where s.id = target_studio_id
          and om.user_id = (select auth.uid())
      )
    );
$$;

revoke all on function private.is_active_user() from public, anon;
revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.can_access_organization(bigint) from public, anon;
revoke all on function private.can_access_studio(bigint) from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.can_access_organization(bigint) to authenticated;
grant execute on function private.can_access_studio(bigint) to authenticated;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists organization_memberships_select_own on public.organization_memberships;
create policy organization_memberships_select_own
  on public.organization_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_platform_admin()
  );

drop policy if exists studio_memberships_select_own on public.studio_memberships;
create policy studio_memberships_select_own
  on public.studio_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_platform_admin()
  );

drop policy if exists organizations_select_authorized on public.organizations;
create policy organizations_select_authorized
  on public.organizations
  for select
  to authenticated
  using (private.can_access_organization(id));

drop policy if exists brands_select_authorized on public.brands;
create policy brands_select_authorized
  on public.brands
  for select
  to authenticated
  using (private.can_access_organization(organization_id));

drop policy if exists studios_select_authorized on public.studios;
create policy studios_select_authorized
  on public.studios
  for select
  to authenticated
  using (private.can_access_studio(id));

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.studio_memberships to authenticated;
grant select on public.organizations to authenticated;
grant select on public.brands to authenticated;
grant select on public.studios to authenticated;

-- The audit found this trigger helper executable by PUBLIC. Existing triggers
-- continue to run; ordinary API roles do not need direct EXECUTE permission.
revoke execute on function public.update_updated_at_column()
  from public, anon, authenticated;

-- Membership writes intentionally remain service-role/admin-only in this phase.

commit;
