import type { CandidateRoute, RouteParams } from '../types/route';

export function generateRoutes(params: RouteParams): CandidateRoute[] {
  const baseDistance = params.timeMinutes / params.paceMinPerKm;
  const baseDuration = Math.round(baseDistance * params.paceMinPerKm);

  return [
    {
      id: 'route-1',
      name: 'Riverside Loop',
      distanceKm: Number((baseDistance * 0.95).toFixed(2)),
      estimatedDurationMinutes: Math.max(5, Math.round(baseDuration * 0.95)),
      elevationGainM: 42,
    },
    {
      id: 'route-2',
      name: 'City Park Circuit',
      distanceKm: Number(baseDistance.toFixed(2)),
      estimatedDurationMinutes: Math.max(5, baseDuration),
      elevationGainM: 58,
    },
    {
      id: 'route-3',
      name: 'Hill Tempo Route',
      distanceKm: Number((baseDistance * 1.05).toFixed(2)),
      estimatedDurationMinutes: Math.max(5, Math.round(baseDuration * 1.05)),
      elevationGainM: 91,
    },
  ];
}
