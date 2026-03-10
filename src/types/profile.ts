export type Profile = {
  id: string;
  display_name: string | null;
  home_location_name: string | null;
  home_lat: number | null;
  home_lng: number | null;
  default_activity: "foot" | "road_cycling" | null;
  default_surface: "asphalt" | "mixed" | "trail" | null;
  default_route_type: "point_to_point" | "circular" | null;
  created_at: string;
  updated_at: string;
};

export type CreateProfileInput = {
  display_name?: string | null;
  home_location_name?: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
  default_activity?: Profile["default_activity"];
  default_surface?: Profile["default_surface"];
  default_route_type?: Profile["default_route_type"];
};

export type UpdateProfileInput = Partial<CreateProfileInput>;
