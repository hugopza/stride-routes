import type { CandidateRoute, RouteParams } from "../types/route";
import { FakeRouteProvider } from "../lib/route-providers/FakeRouteProvider";
import {
  NoSurfaceMatchError,
  OpenRouteServiceProvider,
} from "../lib/route-providers/OpenRouteServiceProvider";
import type { RouteProvider } from "../lib/route-providers/RouteProvider";
import { env } from "../config/env";

class RouteGenerationService {
  constructor(
    private readonly fakeProvider: RouteProvider,
    private readonly openRouteServiceProvider: RouteProvider,
  ) {}

  private shouldUseOpenRouteService(params: RouteParams): boolean {
    const shouldUse = Boolean(
      env.openRouteServiceApiKey &&
        params.startCoordinate,
    );
    console.log("[routing] provider-check", {
      hasApiKey: Boolean(env.openRouteServiceApiKey),
      circular: params.circular,
      hasStart: Boolean(params.startCoordinate),
      hasEnd: Boolean(params.endCoordinate),
      selected: shouldUse ? "openrouteservice" : "fake",
    });
    return shouldUse;
  }

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    if (this.shouldUseOpenRouteService(params)) {
      try {
        const routes = await this.openRouteServiceProvider.generateRoutes(params);
        console.log("[routing] provider-used", {
          provider: "openrouteservice",
          routes: routes.length,
        });
        return routes;
      } catch (error) {
        if (error instanceof NoSurfaceMatchError) {
          console.log("[routing] no-surface-match", {
            provider: "openrouteservice",
            surface: params.surface ?? "mixed",
          });
          return [];
        }
        console.log("[routing] fallback", {
          from: "openrouteservice",
          to: "fake",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const fallbackRoutes = await this.fakeProvider.generateRoutes(params);
    console.log("[routing] provider-used", {
      provider: "fake",
      routes: fallbackRoutes.length,
    });
    return fallbackRoutes;
  }
}

export const routeGenerationService = new RouteGenerationService(
  new FakeRouteProvider(),
  new OpenRouteServiceProvider(),
);
