import type { CandidateRoute, RouteCoordinate, RouteParams } from "../../types/route";
import { env } from "../../config/env";
import type { RouteProvider } from "./RouteProvider";

type OrsFeature = {
  geometry?: {
    coordinates?: number[][];
  };
  properties?: {
    summary?: {
      distance?: number;
      duration?: number;
      ascent?: number;
    };
  };
};

type OrsResponse = {
  features?: OrsFeature[];
};

const KM_PER_LAT_DEGREE = 111.32;

function toPolyline(coordinates: number[][]): RouteCoordinate[] {
  return coordinates
    .filter((coordinate) => coordinate.length >= 2)
    .map((coordinate) => ({
      longitude: coordinate[0],
      latitude: coordinate[1],
    }));
}

function mapFeatureToCandidateRoute(
  feature: OrsFeature,
  index: number,
  fallbackPaceMinPerKm: number,
): CandidateRoute | null {
  const rawCoordinates = feature.geometry?.coordinates ?? [];
  const polyline = toPolyline(rawCoordinates);

  if (polyline.length < 2) {
    return null;
  }

  const distanceKm = Number(
    ((feature.properties?.summary?.distance ?? 0) / 1000).toFixed(2),
  );
  const durationMinutes = Math.max(
    5,
    Math.round((feature.properties?.summary?.duration ?? distanceKm * fallbackPaceMinPerKm * 60) / 60),
  );
  const elevationGainM = Math.max(
    0,
    Math.round(feature.properties?.summary?.ascent ?? 0),
  );

  return {
    id: `ors-route-${index + 1}`,
    name: index === 0 ? "OpenStreetMap Route" : `Alternative ${index + 1}`,
    distanceKm,
    estimatedDurationMinutes: durationMinutes,
    elevationGainM,
    polyline,
  };
}

export class OpenRouteServiceProvider implements RouteProvider {
  private readonly endpoint =
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

  private kmPerLonDegree(latitude: number): number {
    return 111.32 * Math.cos((latitude * Math.PI) / 180);
  }

  private offsetCoordinate(
    origin: RouteCoordinate,
    distanceKm: number,
    bearingDeg: number,
  ): RouteCoordinate {
    const bearing = (bearingDeg * Math.PI) / 180;
    const northKm = Math.cos(bearing) * distanceKm;
    const eastKm = Math.sin(bearing) * distanceKm;

    return {
      latitude: origin.latitude + northKm / KM_PER_LAT_DEGREE,
      longitude:
        origin.longitude + eastKm / this.kmPerLonDegree(origin.latitude),
    };
  }

  private async requestDirections(
    start: RouteCoordinate,
    end: RouteCoordinate,
    allowAlternatives: boolean,
  ): Promise<OrsResponse> {
    console.log("[ors] request", {
      profile: "foot-walking",
      start,
      end,
      coordOrder: "[lon, lat]",
      allowAlternatives,
    });

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: env.openRouteServiceApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
        ...(allowAlternatives
          ? {
              alternative_routes: {
                target_count: 2,
                share_factor: 0.7,
                weight_factor: 1.5,
              },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.log("[ors] response-error", {
        status: response.status,
        body: errorBody.slice(0, 500),
      });
      throw new Error(`ORS request failed (${response.status}).`);
    }

    const data = (await response.json()) as OrsResponse;
    console.log("[ors] response-ok", {
      features: data.features?.length ?? 0,
    });
    return data;
  }

  private mapFeaturesToRoutes(
    data: OrsResponse,
    pace: number,
  ): CandidateRoute[] {
    const mapped = (data.features ?? [])
      .map((feature, index) => mapFeatureToCandidateRoute(feature, index, pace))
      .filter((route): route is CandidateRoute => route !== null);

    console.log("[ors] mapped", {
      routes: mapped.length,
      pointsPerRoute: mapped.map((route) => route.polyline.length),
      firstRouteStart: mapped[0]?.polyline[0],
      firstRouteEnd: mapped[0]?.polyline[mapped[0].polyline.length - 1],
    });

    return mapped;
  }

  private generateCandidateEndpoints(
    start: RouteCoordinate,
    targetDistanceKm: number,
  ): RouteCoordinate[] {
    const radiusKm = Math.max(0.35, Math.min(8, targetDistanceKm * 0.55));
    const bearings = [0, 40, 80, 120, 160, 200, 240, 300];
    return bearings.map((bearing) =>
      this.offsetCoordinate(start, radiusKm, bearing),
    );
  }

  private scoreCandidate(route: CandidateRoute, targetDistanceKm: number): number {
    const normalizedDistanceError =
      Math.abs(route.distanceKm - targetDistanceKm) / Math.max(0.5, targetDistanceKm);
    const geometryPenalty = route.polyline.length >= 20 ? 0 : 0.35;
    return normalizedDistanceError + geometryPenalty;
  }

  private async generateFromStartOnly(
    start: RouteCoordinate,
    targetDistanceKm: number,
    pace: number,
  ): Promise<CandidateRoute[]> {
    const endpoints = this.generateCandidateEndpoints(start, targetDistanceKm);
    const candidates: CandidateRoute[] = [];

    for (const end of endpoints) {
      try {
        const data = await this.requestDirections(start, end, false);
        const mapped = this.mapFeaturesToRoutes(data, pace);
        if (mapped.length > 0) {
          candidates.push(mapped[0]);
        }
      } catch (error) {
        console.log("[ors] candidate-failed", {
          end,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const scored = candidates
      .map((route) => ({
        route,
        score: this.scoreCandidate(route, targetDistanceKm),
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((item, index) => ({
        ...item.route,
        id: `ors-generated-${index + 1}`,
        name: index === 0 ? "OpenStreetMap Route" : `Alternative ${index + 1}`,
      }));

    console.log("[ors] generated-candidates", {
      attempted: endpoints.length,
      usable: candidates.length,
      returned: scored.length,
    });

    return scored;
  }

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    if (!env.openRouteServiceApiKey) {
      throw new Error("Missing EXPO_PUBLIC_ORS_API_KEY");
    }
    if (!params.startCoordinate) {
      throw new Error("Missing start coordinate for ORS request.");
    }
    const pace = params.paceMinPerKm && params.paceMinPerKm > 0 ? params.paceMinPerKm : 6;

    const mapped = params.endCoordinate
      ? this.mapFeaturesToRoutes(
          await this.requestDirections(
            params.startCoordinate,
            params.endCoordinate,
            true,
          ),
          pace,
        )
      : await this.generateFromStartOnly(
          params.startCoordinate,
          params.targetDistanceKm,
          pace,
        );

    if (mapped.length === 0) {
      throw new Error("ORS returned no usable routes.");
    }

    return mapped;
  }
}
