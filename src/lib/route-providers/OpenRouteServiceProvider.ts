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

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    if (!env.openRouteServiceApiKey) {
      throw new Error("Missing EXPO_PUBLIC_ORS_API_KEY");
    }
    if (!params.startCoordinate || !params.endCoordinate) {
      throw new Error("Missing start/end coordinates for ORS request.");
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: env.openRouteServiceApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [params.startCoordinate.longitude, params.startCoordinate.latitude],
          [params.endCoordinate.longitude, params.endCoordinate.latitude],
        ],
        alternative_routes: {
          target_count: 2,
          share_factor: 0.7,
          weight_factor: 1.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ORS request failed (${response.status}).`);
    }

    const data = (await response.json()) as OrsResponse;
    const pace = params.paceMinPerKm && params.paceMinPerKm > 0 ? params.paceMinPerKm : 6;
    const mapped = (data.features ?? [])
      .map((feature, index) => mapFeatureToCandidateRoute(feature, index, pace))
      .filter((route): route is CandidateRoute => route !== null);

    if (mapped.length === 0) {
      throw new Error("ORS returned no usable routes.");
    }

    return mapped;
  }
}
