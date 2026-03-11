import type { CandidateRoute, RouteParams } from "../types/route";
import {
  NoSurfaceMatchError,
  OpenRouteServiceProvider,
} from "../lib/route-providers/OpenRouteServiceProvider";
import type { RouteProvider } from "../lib/route-providers/RouteProvider";
import { env } from "../config/env";

class RouteGenerationService {
  constructor(private readonly openRouteServiceProvider: RouteProvider) {}

  private debugLog(message: string, payload?: unknown): void {
    if (!env.routingDebug) {
      return;
    }

    if (payload === undefined) {
      console.log(message);
      return;
    }

    console.log(message, payload);
  }

  private shouldUseOpenRouteService(params: RouteParams): boolean {
    const shouldUse = Boolean(env.openRouteServiceApiKey && params.startCoordinate);
    this.debugLog("[routing] provider-check", {
      hasApiKey: Boolean(env.openRouteServiceApiKey),
      circular: params.circular,
      hasStart: Boolean(params.startCoordinate),
      hasEnd: Boolean(params.endCoordinate),
      selected: shouldUse ? "openrouteservice" : "none",
    });
    return shouldUse;
  }

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    const hasRequiredWaypoints = (params.waypoints?.length ?? 0) > 0;

    if (this.shouldUseOpenRouteService(params)) {
      try {
        const routes = await this.openRouteServiceProvider.generateRoutes(params);
        this.debugLog("[routing] provider-used", {
          provider: "openrouteservice",
          routes: routes.length,
        });
        return routes;
      } catch (error) {
        if (error instanceof NoSurfaceMatchError) {
          this.debugLog("[routing] no-surface-match", {
            provider: "openrouteservice",
            surface: params.surface ?? "mixed",
          });
          return [];
        }

        throw new Error(
          hasRequiredWaypoints
            ? "Could not build a route through all selected waypoints."
            : "Real route provider failed. Please try again.",
        );
      }
    }

    throw new Error(
      "Real route provider is unavailable for the current request.",
    );
  }
}

export const routeGenerationService = new RouteGenerationService(
  new OpenRouteServiceProvider(),
);
