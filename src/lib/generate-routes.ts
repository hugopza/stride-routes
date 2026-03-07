import type { CandidateRoute, RouteParams } from "../types/route";
import { routeGenerationService } from "../services/routeGenerationService";

// Backward-compatible wrapper while callers are migrated to routeGenerationService.
export function generateRoutes(params: RouteParams): CandidateRoute[] {
  return routeGenerationService.generateRoutes(params);
}
