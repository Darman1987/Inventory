create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  global_role text not null default 'user' check (global_role in ('root_admin', 'user')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sku text not null,
  barcode text not null,
  category text not null,
  location text not null default '',
  quantity integer not null default 0,
  min_quantity integer not null default 0,
  price numeric(10, 2) not null default 0,
  supplier text not null,
  expiry_date date,
  last_updated timestamptz not null default timezone('utc', now()),
  unique (organization_id, sku)
);

alter table public.profiles
add column if not exists global_role text not null default 'user';

alter table public.inventory_items
add column if not exists location text not null default '';

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'organization_members'
      and constraint_name = 'organization_members_role_check'
  ) then
    alter table public.organization_members drop constraint organization_members_role_check;
  end if;
end $$;

update public.profiles
set global_role = case
  when global_role = 'admin' then 'root_admin'
  else 'user'
end
where global_role not in ('root_admin', 'user');

update public.organization_members
set role = case
  when role in ('owner', 'admin') then 'admin'
  else 'user'
end
where role not in ('admin', 'user');

alter table public.organization_members
add constraint organization_members_role_check check (role in ('admin', 'user'));

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.categories enable row level security;
alter table public.inventory_items enable row level security;

create or replace function public.is_root_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and global_role = 'root_admin'
  );
$$;

create or replace function public.can_view_organization(target_organization_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_root_admin(target_user_id)
    or exists (
      select 1
      from public.organization_members members
      where members.organization_id = target_organization_id
        and members.user_id = target_user_id
    );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_root_admin(target_user_id)
    or exists (
      select 1
      from public.organization_members members
      where members.organization_id = target_organization_id
        and members.user_id = target_user_id
        and members.role = 'admin'
    );
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and coalesce(global_role, 'user') = 'user'
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and exists (
    select 1
    from public.profiles existing
    where existing.id = (select auth.uid())
      and existing.global_role = profiles.global_role
  )
);

drop policy if exists "profiles_update_root_admin" on public.profiles;
create policy "profiles_update_root_admin"
on public.profiles
for update
to authenticated
using (public.is_root_admin())
with check (public.is_root_admin());

drop policy if exists "organizations_select_accessible" on public.organizations;
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_accessible"
on public.organizations
for select
to authenticated
using (public.can_view_organization(id));

drop policy if exists "organizations_insert_root_admin" on public.organizations;
drop policy if exists "organizations_insert_owner" on public.organizations;
create policy "organizations_insert_root_admin"
on public.organizations
for insert
to authenticated
with check (public.is_root_admin());

drop policy if exists "organizations_update_root_admin" on public.organizations;
create policy "organizations_update_root_admin"
on public.organizations
for update
to authenticated
using (public.is_root_admin())
with check (public.is_root_admin());

drop policy if exists "organization_members_select_accessible" on public.organization_members;
drop policy if exists "organization_members_select_member" on public.organization_members;
create policy "organization_members_select_accessible"
on public.organization_members
for select
to authenticated
using (public.can_view_organization(organization_id));

drop policy if exists "organization_members_insert_manager" on public.organization_members;
drop policy if exists "organization_members_insert_admin" on public.organization_members;
create policy "organization_members_insert_manager"
on public.organization_members
for insert
to authenticated
with check (public.can_manage_organization(organization_id));

drop policy if exists "organization_members_update_manager" on public.organization_members;
create policy "organization_members_update_manager"
on public.organization_members
for update
to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

drop policy if exists "organization_members_delete_manager" on public.organization_members;
create policy "organization_members_delete_manager"
on public.organization_members
for delete
to authenticated
using (public.can_manage_organization(organization_id));

drop policy if exists "categories_select_accessible" on public.categories;
drop policy if exists "categories_select_member" on public.categories;
create policy "categories_select_accessible"
on public.categories
for select
to authenticated
using (public.can_view_organization(organization_id));

drop policy if exists "categories_write_manager" on public.categories;
drop policy if exists "categories_write_owner" on public.categories;
create policy "categories_write_manager"
on public.categories
for all
to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

drop policy if exists "inventory_items_select_accessible" on public.inventory_items;
drop policy if exists "inventory_items_member_access" on public.inventory_items;
create policy "inventory_items_select_accessible"
on public.inventory_items
for select
to authenticated
using (public.can_view_organization(organization_id));

drop policy if exists "inventory_items_write_manager" on public.inventory_items;
create policy "inventory_items_write_manager"
on public.inventory_items
for insert
to authenticated
with check (public.can_manage_organization(organization_id));

drop policy if exists "inventory_items_update_manager" on public.inventory_items;
create policy "inventory_items_update_manager"
on public.inventory_items
for update
to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

drop policy if exists "inventory_items_delete_manager" on public.inventory_items;
create policy "inventory_items_delete_manager"
on public.inventory_items
for delete
to authenticated
using (public.can_manage_organization(organization_id));
