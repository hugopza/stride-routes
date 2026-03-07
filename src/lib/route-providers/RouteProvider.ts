import type { CandidateRoute, RouteParams } from "../../types/route";

export interface RouteProvider {
  generateRoutes(params: RouteParams): CandidateRoute[];
}
