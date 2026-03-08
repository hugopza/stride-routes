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

type EndpointCandidate = {
  endpoint: RouteCoordinate;
  bearingDeg: number;
  radiusKm: number;
};

type EvaluatedCandidate = {
  route: CandidateRoute;
  endpoint: RouteCoordinate;
  bearingDeg: number;
  radiusKm: number;
  score: number;
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
  ): EndpointCandidate[] {
    const radiusKm = Math.max(0.35, Math.min(8, targetDistanceKm * 0.52));
    const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
    return bearings.map((bearingDeg) => ({
      endpoint: this.offsetCoordinate(start, radiusKm, bearingDeg),
      bearingDeg,
      radiusKm,
    }));
  }

  private haversineKm(a: RouteCoordinate, b: RouteCoordinate): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const value =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    return earthRadiusKm * c;
  }

  private scoreCandidate(route: CandidateRoute, targetDistanceKm: number): number {
    const diffKm = Math.abs(route.distanceKm - targetDistanceKm);
    const normalizedDistanceError =
      diffKm / Math.max(0.5, targetDistanceKm);
    const geometryPenalty = route.polyline.length >= 20 ? 0 : 0.35;
    return normalizedDistanceError * 2.8 + diffKm * 0.2 + geometryPenalty;
  }

  private createRefinementEndpoints(
    start: RouteCoordinate,
    targetDistanceKm: number,
    seed: EvaluatedCandidate[],
  ): EndpointCandidate[] {
    const refined: EndpointCandidate[] = [];

    for (const item of seed.slice(0, 2)) {
      const ratio = Math.min(
        1.35,
        Math.max(0.7, targetDistanceKm / Math.max(0.2, item.route.distanceKm)),
      );
      const tunedRadius = Math.max(0.3, Math.min(9, item.radiusKm * ratio));

      const localVariants = [
        { bearingDeg: item.bearingDeg - 14, radiusKm: tunedRadius * 0.95 },
        { bearingDeg: item.bearingDeg + 14, radiusKm: tunedRadius * 1.05 },
      ];

      for (const variant of localVariants) {
        refined.push({
          endpoint: this.offsetCoordinate(
            start,
            variant.radiusKm,
            variant.bearingDeg,
          ),
          bearingDeg: variant.bearingDeg,
          radiusKm: variant.radiusKm,
        });
      }
    }

    return refined;
  }

  private pickDiverseBest(
    scored: EvaluatedCandidate[],
    targetDistanceKm: number,
  ): CandidateRoute[] {
    const selected: EvaluatedCandidate[] = [];
    const minSeparationKm = Math.max(0.25, Math.min(1.5, targetDistanceKm * 0.15));

    for (const candidate of scored) {
      const candidateEnd =
        candidate.route.polyline[candidate.route.polyline.length - 1];
      const isTooClose = selected.some((chosen) => {
        const chosenEnd = chosen.route.polyline[chosen.route.polyline.length - 1];
        return this.haversineKm(candidateEnd, chosenEnd) < minSeparationKm;
      });

      if (!isTooClose) {
        selected.push(candidate);
      }
      if (selected.length === 3) {
        break;
      }
    }

    // Fill remaining slots with best-scored routes if diversity was too strict.
    if (selected.length < 3) {
      for (const candidate of scored) {
        if (!selected.includes(candidate)) {
          selected.push(candidate);
        }
        if (selected.length === 3) {
          break;
        }
      }
    }

    return selected.map((item, index) => ({
      ...item.route,
      id: `ors-generated-${index + 1}`,
      name: index === 0 ? "OpenStreetMap Route" : `Alternative ${index + 1}`,
    }));
  }

  private async evaluateCandidates(
    start: RouteCoordinate,
    pace: number,
    targetDistanceKm: number,
    candidates: EndpointCandidate[],
  ): Promise<EvaluatedCandidate[]> {
    const results: EvaluatedCandidate[] = [];

    for (const candidate of candidates) {
      try {
        const data = await this.requestDirections(start, candidate.endpoint, false);
        const mapped = this.mapFeaturesToRoutes(data, pace);
        if (mapped.length > 0) {
          const route = mapped[0];
          results.push({
            route,
            endpoint: candidate.endpoint,
            bearingDeg: candidate.bearingDeg,
            radiusKm: candidate.radiusKm,
            score: this.scoreCandidate(route, targetDistanceKm),
          });
        }
      } catch (error) {
        console.log("[ors] candidate-failed", {
          end: candidate.endpoint,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  private async generateFromStartOnly(
    start: RouteCoordinate,
    targetDistanceKm: number,
    pace: number,
  ): Promise<CandidateRoute[]> {
    const initialCandidates = this.generateCandidateEndpoints(start, targetDistanceKm);
    const initialResults = await this.evaluateCandidates(
      start,
      pace,
      targetDistanceKm,
      initialCandidates,
    );
    const topInitial = [...initialResults]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const refinementCandidates = this.createRefinementEndpoints(
      start,
      targetDistanceKm,
      topInitial,
    );
    const refinementResults = await this.evaluateCandidates(
      start,
      pace,
      targetDistanceKm,
      refinementCandidates,
    );

    const combined = [...initialResults, ...refinementResults].sort(
      (a, b) => a.score - b.score,
    );
    const picked = this.pickDiverseBest(combined, targetDistanceKm);

    console.log("[ors] generated-candidates", {
      attempted: initialCandidates.length + refinementCandidates.length,
      initialAttempted: initialCandidates.length,
      refinementAttempted: refinementCandidates.length,
      usable: combined.length,
      returned: picked.length,
      bestDistances: picked.map((route) => route.distanceKm),
    });

    return picked;
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
