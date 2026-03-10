import { getSupabaseClient } from "../lib/supabase";
import type {
  CreateProfileInput,
  Profile,
  UpdateProfileInput,
} from "../types/profile";

type ProfileRow = {
  id: string;
  display_name: string | null;
  home_location_name: string | null;
  home_lat: number | null;
  home_lng: number | null;
  default_activity: string | null;
  default_surface: string | null;
  default_route_type: string | null;
  created_at: string;
  updated_at: string;
};

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
    throw new Error("You must be signed in to access your profile.");
  }

  return user.id;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function normalizeActivity(
  value: string | null | undefined,
): Profile["default_activity"] {
  if (value === undefined || value === null) {
    return null;
  }
  if (value === "road_cycling") {
    return "road_cycling";
  }
  if (value === "running" || value === "walking" || value === "foot") {
    return "foot";
  }
  return null;
}

function normalizeProfile(row: ProfileRow): Profile {
  const defaultActivity = normalizeActivity(row.default_activity);
  const defaultSurface =
    defaultActivity === "road_cycling"
      ? "asphalt"
      : row.default_surface === "asphalt" ||
          row.default_surface === "mixed" ||
          row.default_surface === "trail"
        ? row.default_surface
        : null;

  return {
    ...row,
    default_activity: defaultActivity,
    default_surface: defaultSurface,
    default_route_type:
      row.default_route_type === "point_to_point" ||
      row.default_route_type === "circular"
        ? row.default_route_type
        : null,
  };
}

function normalizeProfileInput(
  input: CreateProfileInput | UpdateProfileInput,
): CreateProfileInput | UpdateProfileInput {
  const normalizedActivity =
    input.default_activity === undefined
      ? undefined
      : normalizeActivity(input.default_activity);

  return stripUndefined({
    ...input,
    default_activity: normalizedActivity,
    default_surface:
      normalizedActivity === "road_cycling"
        ? "asphalt"
        : input.default_surface,
  });
}

function buildCreateProfilePayload(input: CreateProfileInput): CreateProfileInput {
  const normalized = normalizeProfileInput(input);
  const defaultActivity = normalized.default_activity ?? "foot";
  const defaultSurface =
    defaultActivity === "road_cycling"
      ? "asphalt"
      : normalized.default_surface ?? "mixed";

  return {
    ...normalized,
    default_activity: defaultActivity,
    default_surface: defaultSurface,
    default_route_type: normalized.default_route_type ?? "point_to_point",
  };
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeProfile(data as ProfileRow) : null;
}

export async function createMyProfile(
  input: CreateProfileInput = {},
): Promise<Profile> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const payload = {
    id: userId,
    ...buildCreateProfilePayload(input),
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProfile(data as ProfileRow);
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<Profile> {
  const supabase = getSupabaseClient();
  const userId = await requireAuthenticatedUserId();
  const payload = normalizeProfileInput(input);

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProfile(data as ProfileRow);
}
