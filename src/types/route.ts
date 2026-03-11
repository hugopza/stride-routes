export type RouteParams = {
  activity?: "foot" | "road_cycling" | string;
  goalMode?: "time" | "distance";
  timeMinutes?: number;
  paceMinPerKm?: number;
  targetDistanceKm: number;
  generationNonce?: number;
  surface?: "asphalt" | "mixed" | "trail" | string;
  circular?: boolean;
  startCoordinate?: RouteCoordinate;
  endCoordinate?: RouteCoordinate;
  waypoints?: RouteCoordinate[];
};

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type CandidateRoute = {
  id: string;
  name: string;
  provider?: "real";
  distanceKm: number;
  estimatedDurationMinutes: number;
  elevationGainM: number | null;
  polyline: RouteCoordinate[];
};
