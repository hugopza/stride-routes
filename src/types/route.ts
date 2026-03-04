export type RouteParams = {
  timeMinutes: number;
  paceMinPerKm: number;
};

export type CandidateRoute = {
  id: string;
  name: string;
  distanceKm: number;
  estimatedDurationMinutes: number;
  elevationGainM: number;
};
