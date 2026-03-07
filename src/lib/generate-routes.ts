import type { CandidateRoute, RouteParams } from "../types/route";
import { routeGenerationService } from "../services/routeGenerationService";

// Backward-compatible wrapper while callers are migrated to routeGenerationService.
export async function generateRoutes(
  params: RouteParams,
): Promise<CandidateRoute[]> {
  return routeGenerationService.generateRoutes(params);
}
