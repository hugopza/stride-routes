import type { CandidateRoute } from "./route";

export type SavedRouteSurface = "asphalt" | "mixed" | "trail" | null;

export type SavedRoute = {
  id: string;
  user_id: string;
  custom_name: string;
  route_fingerprint: string;
  route_provider: "real" | null;
  surface: SavedRouteSurface;
  route: CandidateRoute;
  created_at: string;
  updated_at: string;
};

export type CreateSavedRouteInput = {
  customName: string;
  route: CandidateRoute;
  surface?: SavedRouteSurface;
};
