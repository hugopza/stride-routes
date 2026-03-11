update public.profiles
set default_activity = 'foot'
where default_activity in ('running', 'walking');

alter table public.profiles
drop constraint if exists profiles_default_activity_check;

alter table public.profiles
add constraint profiles_default_activity_check
check (
  default_activity is null
  or default_activity in ('foot', 'road_cycling')
);
