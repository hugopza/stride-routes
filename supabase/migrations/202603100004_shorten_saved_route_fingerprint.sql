update public.saved_routes
set route_fingerprint = md5(route_fingerprint)
where char_length(route_fingerprint) > 64;

alter table public.saved_routes
drop constraint if exists saved_routes_route_fingerprint_length_check;

alter table public.saved_routes
add constraint saved_routes_route_fingerprint_length_check
check (char_length(route_fingerprint) <= 64);
