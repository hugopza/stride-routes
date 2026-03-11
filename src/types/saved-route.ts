import type { CandidateRoute } from "./route";

export type SavedRouteSurface = "asphalt" | "mixed" | "trail" | null;
export type SavedRouteActivity = "foot" | "road_cycling" | null;

export type SavedRoute = {
  id: string;
  user_id: string;
  custom_name: string;
  route_fingerprint: string;
  route_provider: "real" | null;
  activity: SavedRouteActivity;
  surface: SavedRouteSurface;
  route: CandidateRoute;
  created_at: string;
  updated_at: string;
};

export type CreateSavedRouteInput = {
  customName: string;
  route: CandidateRoute;
  activity?: SavedRouteActivity;
  surface?: SavedRouteSurface;
};
