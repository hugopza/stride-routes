export type RouteParams = {
  goalMode?: "time" | "distance";
  timeMinutes?: number;
  paceMinPerKm?: number;
  targetDistanceKm: number;
  generationNonce?: number;
  surface?: "asphalt" | "mixed" | "trail" | string;
  circular?: boolean;
  startCoordinate?: RouteCoordinate;
  endCoordinate?: RouteCoordinate;
};

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type CandidateRoute = {
  id: string;
  name: string;
  distanceKm: number;
  estimatedDurationMinutes: number;
  elevationGainM: number;
  polyline: RouteCoordinate[];
};
