import type { CandidateRoute, RouteParams } from "../../types/route";

export interface RouteProvider {
  generateRoutes(params: RouteParams): Promise<CandidateRoute[]>;
}
