import type { CandidateRoute, RouteParams } from "../types/route";
import { FakeRouteProvider } from "../lib/route-providers/FakeRouteProvider";
import type { RouteProvider } from "../lib/route-providers/RouteProvider";

class RouteGenerationService {
  constructor(private readonly provider: RouteProvider) {}

  generateRoutes(params: RouteParams): CandidateRoute[] {
    return this.provider.generateRoutes(params);
  }
}

export const routeGenerationService = new RouteGenerationService(
  new FakeRouteProvider(),
);
