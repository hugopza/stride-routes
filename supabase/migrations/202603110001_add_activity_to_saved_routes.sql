alter table public.saved_routes
add column if not exists activity text null;

alter table public.saved_routes
drop constraint if exists saved_routes_activity_check;

alter table public.saved_routes
add constraint saved_routes_activity_check
check (
  activity is null
  or activity in ('foot', 'road_cycling')
);

create index if not exists saved_routes_activity_idx
  on public.saved_routes (user_id, activity);
