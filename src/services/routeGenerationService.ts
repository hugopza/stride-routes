import type { CandidateRoute, RouteParams } from "../types/route";
import { FakeRouteProvider } from "../lib/route-providers/FakeRouteProvider";
import { OpenRouteServiceProvider } from "../lib/route-providers/OpenRouteServiceProvider";
import type { RouteProvider } from "../lib/route-providers/RouteProvider";
import { env } from "../config/env";

class RouteGenerationService {
  constructor(
    private readonly fakeProvider: RouteProvider,
    private readonly openRouteServiceProvider: RouteProvider,
  ) {}

  private shouldUseOpenRouteService(params: RouteParams): boolean {
    return Boolean(
      env.openRouteServiceApiKey &&
        params.circular === false &&
        params.startCoordinate &&
        params.endCoordinate,
    );
  }

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    if (this.shouldUseOpenRouteService(params)) {
      try {
        return await this.openRouteServiceProvider.generateRoutes(params);
      } catch {
        // Fallback keeps the flow working when ORS is unavailable.
      }
    }

    return this.fakeProvider.generateRoutes(params);
  }
}

export const routeGenerationService = new RouteGenerationService(
  new FakeRouteProvider(),
  new OpenRouteServiceProvider(),
);
