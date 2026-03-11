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

  private async generateFakeRoutesForDevelopment(
    params: RouteParams,
    reason: string,
  ): Promise<CandidateRoute[]> {
    const fallbackRoutes = await this.fakeProvider.generateRoutes(params);
    this.debugLog("[routing] fake-provider-used", {
      reason,
      routes: fallbackRoutes.length,
    });
    return fallbackRoutes;
  }

  private shouldUseOpenRouteService(params: RouteParams): boolean {
    const shouldUse = Boolean(env.openRouteServiceApiKey && params.startCoordinate);
    this.debugLog("[routing] provider-check", {
      hasApiKey: Boolean(env.openRouteServiceApiKey),
      circular: params.circular,
      hasStart: Boolean(params.startCoordinate),
      hasEnd: Boolean(params.endCoordinate),
      selected: shouldUse
        ? "openrouteservice"
        : env.allowFakeRoutes
          ? "fake"
          : "none",
      allowFakeRoutes: env.allowFakeRoutes,
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

        if (env.allowFakeRoutes && !hasRequiredWaypoints) {
          return this.generateFakeRoutesForDevelopment(
            params,
            error instanceof Error ? error.message : "Unknown ORS error",
          );
        }

        throw new Error(
          hasRequiredWaypoints
            ? "Could not build a route through all selected waypoints."
            : "Real route provider failed. Please try again.",
        );
      }
    }

    if (env.allowFakeRoutes && !hasRequiredWaypoints) {
      return this.generateFakeRoutesForDevelopment(
        params,
        "OpenRouteService unavailable for current inputs",
      );
    }

    throw new Error(
      "Real route provider is unavailable for the current request.",
    );
  }
}

export const routeGenerationService = new RouteGenerationService(
  new FakeRouteProvider(),
  new OpenRouteServiceProvider(),
);
