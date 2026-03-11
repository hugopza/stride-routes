import { getRouteFingerprint } from "../lib/route-fingerprint";
import { getSupabaseClient } from "../lib/supabase";
import type { RouteCoordinate } from "../types/route";
import type {
  CreateSavedRouteInput,
  SavedRouteActivity,
  SavedRoute,
  SavedRouteSurface,
} from "../types/saved-route";

type SavedRouteRow = {
  id: string;
  user_id: string;
  custom_name: string;
  route_fingerprint: string;
  route_provider: "real" | null;
  activity: SavedRouteActivity | string | undefined;
  surface: SavedRouteSurface;
  distance_km: number;
  estimated_duration_minutes: number;
  elevation_gain_m: number | null;
  polyline: RouteCoordinate[];
  created_at: string;
  updated_at: string;
};

function inferSavedRouteActivity(row: SavedRouteRow): SavedRouteActivity {
  if (row.surface === "trail" || row.surface === "mixed") {
    return "foot";
  }

  const durationHours = row.estimated_duration_minutes / 60;
  const averageSpeedKmh =
    durationHours > 0 ? row.distance_km / durationHours : 0;

  return averageSpeedKmh >= 15 ? "road_cycling" : "foot";
}

function normalizeSavedRouteActivity(row: SavedRouteRow): SavedRouteActivity {
  const value = typeof row.activity === "string" ? row.activity.trim() : row.activity;

  if (value === "road_cycling") {
    return "road_cycling";
  }

  if (value === "foot" || value === "running" || value === "walking") {
    return "foot";
  }

  return inferSavedRouteActivity(row);
}

function normalizeSavedRouteActivityInput(
  activity: CreateSavedRouteInput["activity"],
  surface: SavedRouteSurface | undefined,
  route: CreateSavedRouteInput["route"],
): SavedRouteActivity {
  if (activity === "road_cycling") {
    return "road_cycling";
  }

  if (activity === "foot") {
    return "foot";
  }

  return inferSavedRouteActivity({
    id: "",
    user_id: "",
    custom_name: "",
    route_fingerprint: "",
    route_provider: route.provider ?? null,
    activity: undefined,
    surface: surface ?? null,
    distance_km: route.distanceKm,
    estimated_duration_minutes: route.estimatedDurationMinutes,
    elevation_gain_m: route.elevationGainM,
    polyline: route.polyline,
    created_at: "",
    updated_at: "",
  });
}

async function requireAuthenticatedUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to access saved routes.");
  }

  return user.id;
}

function mapSavedRouteRow(row: SavedRouteRow): SavedRoute {
  const activity = normalizeSavedRouteActivity(row);

  return {
    id: row.id,
    user_id: row.user_id,
    custom_name: row.custom_name,
    route_fingerprint: row.route_fingerprint,
    route_provider: row.route_provider,
    activity,
    surface: row.surface,
    created_at: row.created_at,
    updated_at: row.updated_at,
    route: {
      id: row.id,
      name: row.custom_name,
      provider: row.route_provider === "real" ? "real" : undefined,
      distanceKm: row.distance_km,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      elevationGainM: row.elevation_gain_m,
      polyline: Array.isArray(row.polyline) ? row.polyline : [],
    },
  };
}

export async function listMySavedRoutes(): Promise<SavedRoute[]> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const { data, error } = await supabase
    .from("saved_routes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as SavedRouteRow[]).map(mapSavedRouteRow);
}

export async function createSavedRoute(
  input: CreateSavedRouteInput,
): Promise<SavedRoute> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const customName = input.customName.trim();

  if (!customName) {
    throw new Error("Route name is required.");
  }

  const payload = {
    user_id: userId,
    custom_name: customName,
    route_fingerprint: getRouteFingerprint(input.route),
    route_provider: input.route.provider ?? null,
    activity: normalizeSavedRouteActivityInput(
      input.activity,
      input.surface,
      input.route,
    ),
    surface: input.surface ?? null,
    distance_km: input.route.distanceKm,
    estimated_duration_minutes: input.route.estimatedDurationMinutes,
    elevation_gain_m: input.route.elevationGainM,
    polyline: input.route.polyline,
  };

  const { data, error } = await supabase
    .from("saved_routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSavedRouteRow(data as SavedRouteRow);
}

export async function deleteSavedRoute(savedRouteId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const { error } = await supabase
    .from("saved_routes")
    .delete()
    .eq("id", savedRouteId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
