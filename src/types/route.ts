export type RouteParams = {
  goalMode?: "time" | "distance";
  timeMinutes?: number;
  paceMinPerKm?: number;
  targetDistanceKm: number;
};

export type CandidateRoute = {
  id: string;
  name: string;
  distanceKm: number;
  estimatedDurationMinutes: number;
  elevationGainM: number;
};
