create table if not exists public.saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_name text not null,
  route_fingerprint text not null,
  route_provider text null,
  surface text null,
  distance_km double precision not null,
  estimated_duration_minutes integer not null,
  elevation_gain_m integer null,
  polyline jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_routes_custom_name_check check (char_length(trim(custom_name)) > 0),
  constraint saved_routes_surface_check
    check (
      surface is null
      or surface in ('asphalt', 'mixed', 'trail')
    ),
  constraint saved_routes_distance_check check (distance_km >= 0),
  constraint saved_routes_duration_check check (estimated_duration_minutes >= 0),
  constraint saved_routes_polyline_is_array check (jsonb_typeof(polyline) = 'array'),
  constraint saved_routes_user_fingerprint_unique unique (user_id, route_fingerprint)
);

create index if not exists saved_routes_user_id_idx
  on public.saved_routes (user_id, created_at desc);

create index if not exists saved_routes_surface_idx
  on public.saved_routes (user_id, surface);

drop trigger if exists set_saved_routes_updated_at on public.saved_routes;

create trigger set_saved_routes_updated_at
before update on public.saved_routes
for each row
execute function public.set_updated_at();

alter table public.saved_routes enable row level security;

drop policy if exists "saved_routes_select_own" on public.saved_routes;
create policy "saved_routes_select_own"
on public.saved_routes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_routes_insert_own" on public.saved_routes;
create policy "saved_routes_insert_own"
on public.saved_routes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_routes_update_own" on public.saved_routes;
create policy "saved_routes_update_own"
on public.saved_routes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_routes_delete_own" on public.saved_routes;
create policy "saved_routes_delete_own"
on public.saved_routes
for delete
to authenticated
using (auth.uid() = user_id);
