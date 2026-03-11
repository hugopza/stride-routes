# Route Generator

Mobile route-generation app built with Expo and React Native for planning outdoor walking and road cycling routes, previewing them on a map, saving them, and exporting GPX files.

## Project Status

This project is an active MVP under development.

Core pieces are already implemented:

- real route generation with OpenRouteService
- user authentication and saved routes with Supabase
- GPX export from generated and saved routes

Routing quality, long-route tuning, and some UX refinements are still in progress.

## Main Features

Current MVP capabilities:

- Email/password authentication with Supabase
- Auto-created user profiles in `public.profiles`
- Route generation for:
  - origin + destination
  - origin only + circular route
- Activities:
  - `foot`
  - `road_cycling`
- Surface preferences:
  - `foot`: `asphalt`, `mixed`, `trail`
  - `road_cycling`: `asphalt` only
- Optional waypoints:
  - 1 to 3 waypoints
  - preserved in the exact order selected
  - treated as mandatory route pass-through points
- Generated routes list with map previews
- Interactive route detail map
- Saved routes backed by Supabase
- GPX export via native share sheet
- Profile defaults reused in the generator

## Tech Stack

- Expo
- React Native
- React Navigation
- Supabase Auth + Postgres
- OpenRouteService Directions API
- `react-native-maps`

## App Flow

Unauthenticated users land on the auth screen.

Authenticated users use the app through this main flow:

1. `Generate`
2. `Generated routes`
3. `Saved`
4. `Profile`

## Project Structure

The active app code lives under `src/`.

- [App.tsx](./App.tsx): root entry point, re-exports `src/App.tsx`
- [src/App.tsx](./src/App.tsx): auth gate, providers, navigation container
- `src/navigation/`: bottom tabs + generate/results stack
- `src/screens/`: app screens
- `src/services/`: app-side Supabase and route services
- `src/lib/`: ORS provider, GPX export, Supabase client, helpers
- `src/providers/`: auth and saved-routes state
- `src/types/`: route, navigation, profile, and saved-route types
- `supabase/migrations/`: SQL migrations used by the project

The repository still contains an `app/` directory from the Expo starter scaffold, but it is not the active app flow. The live navigation flow is the React Navigation setup under `src/`.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
EXPO_PUBLIC_ORS_API_KEY=your_openrouteservice_api_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_DEBUG_ROUTING=false
```

Notes:

- use the Supabase anon key only on the client
- do not use a service role key in the app
- `EXPO_PUBLIC_DEBUG_ROUTING` is optional and intended for development only

## Setup

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npx expo start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Supabase Notes

This repository expects an existing Supabase project.

The app currently uses:

- `auth.users`
- `public.profiles`
- `public.saved_routes`

If your remote database is not already aligned with the codebase, apply the migrations in `supabase/migrations/`.

Relevant saved-route migrations:

- `202603100003_create_saved_routes.sql`
- `202603100004_shorten_saved_route_fingerprint.sql`
- `202603110001_add_activity_to_saved_routes.sql`

## Routing Notes

Routing uses OpenRouteService only. There is no fake or demo route fallback anymore.

Current routing behavior:

- `foot` uses ORS `foot-walking`
- `road_cycling` uses ORS `cycling-road`
- circular generation uses ORS round-trip first, then waypoint-pattern fallback when needed
- waypoints are optional, limited to 1 to 3, and must preserve order
- provided waypoints are mandatory route constraints
- surface filtering and scoring are activity-aware

## Saved Routes

Saved routes persist enough data to reopen them later:

- custom name
- activity
- surface
- distance
- duration
- elevation gain
- polyline

The Saved screen currently supports filtering by:

- `All`
- `Foot`
- `Bike`

## GPX Export

GPX export is implemented in-app using the current route polyline:

- generates a local `.gpx` file
- opens the native share sheet

## Validation

Recommended local checks:

```bash
npx tsc --noEmit
npx expo lint
```

## Current Limitations

- Route quality still depends on ORS metadata and round-trip behavior
- Long circular routes are still harder than point-to-point routes
- Waypoint support is intentionally MVP-scoped to 1 to 3 waypoints
- Saved-route activity filtering relies on persisted activity data and load-time normalization for older rows
- The Expo starter scaffold still exists in the repository outside the active `src/` app flow

## Development Notes

- Keep new application code under `src/`
- Preserve the current React Navigation structure
- Prefer extending the existing ORS provider/service flow instead of introducing parallel routing logic
- Reuse the current Supabase services and providers instead of duplicating client calls in screens
