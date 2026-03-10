create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  home_location_name text null,
  home_lat double precision null,
  home_lng double precision null,
  default_activity text null,
  default_surface text null,
  default_route_type text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_default_activity_check
    check (
      default_activity is null
      or default_activity in ('running', 'walking')
    ),
  constraint profiles_default_surface_check
    check (
      default_surface is null
      or default_surface in ('asphalt', 'mixed', 'trail')
    ),
  constraint profiles_default_route_type_check
    check (
      default_route_type is null
      or default_route_type in ('point_to_point', 'circular')
    ),
  constraint profiles_home_lat_check
    check (home_lat is null or home_lat between -90 and 90),
  constraint profiles_home_lng_check
    check (home_lng is null or home_lng between -180 and 180)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
