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
    extras?: {
      surface?: OrsExtraInfo;
      waytype?: OrsExtraInfo;
      waytypes?: OrsExtraInfo;
      waycategory?: OrsExtraInfo;
      waycategories?: OrsExtraInfo;
    };
  };
};

type OrsResponse = {
  features?: OrsFeature[];
};

type OrsExtraSummaryItem = {
  value?: number | string;
  distance?: number;
  amount?: number;
};

type OrsExtraInfo = {
  summary?: OrsExtraSummaryItem[];
};

type SurfacePreference = "asphalt" | "mixed" | "trail";

type SegmentClass = "asphalt" | "trail" | "both" | "ignored";

type ClassDistances = {
  asphaltDistance: number;
  trailDistance: number;
  bothDistance: number;
  ignoredDistance: number;
  countedDistance: number;
  totalDistance: number;
};

type ExtraClassBreakdown = {
  asphaltDistance: number;
  trailDistance: number;
  bothDistance: number;
  ignoredDistance: number;
  sourceTotalDistance: number;
};

type SurfaceProfile = {
  asphaltRatio: number;
  nonAsphaltRatio: number;
  trailRatio: number;
  asphaltDistance: number;
  trailDistance: number;
  bothDistance: number;
  countedDistance: number;
  ignoredDistance: number;
  ignoredRatio: number;
  majorRoadRatio: number;
};

type MappedRoute = {
  route: CandidateRoute;
  surfaceProfile: SurfaceProfile;
};

type EndpointCandidate = {
  endpoint: RouteCoordinate;
  bearingDeg: number;
  radiusKm: number;
};

type EvaluatedCandidate = {
  route: CandidateRoute;
  surfaceProfile: SurfaceProfile;
  endpoint: RouteCoordinate;
  bearingDeg: number;
  radiusKm: number;
  score: number;
  hardScore: number;
  preferenceScore: number;
};

type CircularLoopCandidate = {
  via1: RouteCoordinate;
  via2: RouteCoordinate;
  baseBearing: number;
  radiusKm: number;
};

type RouteMode = "directed" | "start-only-noncircular" | "start-only-circular";

type EvaluationBatch = {
  results: EvaluatedCandidate[];
  mappedCandidates: number;
};

type GeneratedBatch = {
  routes: CandidateRoute[];
  mappedCandidates: number;
};

const KM_PER_LAT_DEGREE = 111.32;
const MAX_IGNORED_RATIO = 0.35;
const ASPHALT_GATE_RATIO = 0.8;
const TRAIL_GATE_RATIO = 0.65;

export class NoSurfaceMatchError extends Error {
  constructor(surface: SurfacePreference) {
    super(`No routes match the selected surface requirement (${surface}).`);
    this.name = "NoSurfaceMatchError";
  }
}

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

function normalizeSurfacePreference(surface: RouteParams["surface"]): SurfacePreference {
  const normalized = String(surface ?? "mixed").trim().toLowerCase();
  if (normalized === "asphalt") {
    return "asphalt";
  }
  if (normalized === "trail") {
    return "trail";
  }
  return "mixed";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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

  private classifySurfaceValue(value: number | string): SegmentClass {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(numeric)) {
      if ([1, 3, 4, 14].includes(numeric)) {
        return "asphalt";
      }
      if ([2, 8, 10, 11, 12, 15, 17, 18].includes(numeric)) {
        return "trail";
      }
      if ([6, 7].includes(numeric)) {
        return "both";
      }
      if ([0, 13].includes(numeric)) {
        return "ignored";
      }
      return "ignored";
    }

    const text = String(value).toLowerCase();
    if (
      text.includes("asphalt") ||
      text.includes("concrete") ||
      text.includes("paving_stones") ||
      text.includes("paved")
    ) {
      return "asphalt";
    }
    if (
      text.includes("gravel") ||
      text.includes("dirt") ||
      text.includes("ground") ||
      text.includes("sand") ||
      text.includes("unpaved") ||
      text.includes("trail")
    ) {
      return "trail";
    }
    if (text.includes("metal") || text.includes("wood")) {
      return "both";
    }
    if (text.includes("ice") || text.includes("ferry")) {
      return "ignored";
    }
    return "ignored";
  }

  private classifyWaytypeValue(value: number | string): SegmentClass {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(numeric)) {
      if ([1, 2, 3, 7].includes(numeric)) {
        return "asphalt";
      }
      if ([4, 5].includes(numeric)) {
        return "trail";
      }
      if ([0, 6, 8, 9, 10].includes(numeric)) {
        return "ignored";
      }
      return "ignored";
    }

    const text = String(value).toLowerCase();
    if (
      text.includes("state_road") ||
      text.includes("road") ||
      text.includes("street") ||
      text.includes("path")
    ) {
      return "asphalt";
    }
    if (text.includes("track") || text.includes("trail")) {
      return "trail";
    }
    if (text.includes("ferry")) {
      return "ignored";
    }
    return "ignored";
  }

  private isMajorWaycategory(value: number | string): boolean {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(numeric)) {
      // waycategory is a bit field; bit 1 means "Highway".
      // Example: 97 = 64 (paved) + 32 (tunnel) + 1 (highway).
      return numeric > 0 && (numeric & 1) === 1;
    }

    const text = String(value).toLowerCase();
    return (
      text.includes("motorway") ||
      text.includes("trunk") ||
      text.includes("primary") ||
      text.includes("state_road") ||
      text.includes("county_road")
    );
  }

  private getSummaryItemDistanceMeters(
    item: OrsExtraSummaryItem,
    totalDistanceMeters: number,
  ): number {
    if (typeof item.distance === "number" && item.distance > 0) {
      return item.distance;
    }
    if (typeof item.amount !== "number" || item.amount <= 0) {
      return 0;
    }
    if (totalDistanceMeters <= 0) {
      return item.amount;
    }
    if (item.amount <= 1) {
      return item.amount * totalDistanceMeters;
    }
    if (item.amount <= 100) {
      return (item.amount / 100) * totalDistanceMeters;
    }
    return item.amount;
  }

  private summarizeExtraByClass(
    info: OrsExtraInfo | undefined,
    classifier: (value: number | string) => SegmentClass,
    totalDistanceMeters: number,
  ): ExtraClassBreakdown | null {
    const summary = info?.summary ?? [];
    if (summary.length === 0) {
      return null;
    }

    let asphaltDistance = 0;
    let trailDistance = 0;
    let bothDistance = 0;
    let ignoredDistance = 0;

    for (const item of summary) {
      const value = item.value;
      if (value === undefined) {
        continue;
      }
      const weight = this.getSummaryItemDistanceMeters(item, totalDistanceMeters);
      const bucket = classifier(value);
      if (bucket === "asphalt") {
        asphaltDistance += weight;
      } else if (bucket === "trail") {
        trailDistance += weight;
      } else if (bucket === "both") {
        bothDistance += weight;
      } else {
        ignoredDistance += weight;
      }
    }

    const sourceTotalDistance =
      asphaltDistance + trailDistance + bothDistance + ignoredDistance;
    if (sourceTotalDistance <= 0) {
      return null;
    }

    return {
      asphaltDistance,
      trailDistance,
      bothDistance,
      ignoredDistance,
      sourceTotalDistance,
    };
  }

  private mergeClassDistances(
    totalDistanceMeters: number,
    surface: ExtraClassBreakdown | null,
    waytype: ExtraClassBreakdown | null,
  ): ClassDistances {
    const sources = [surface, waytype].filter(
      (item): item is ExtraClassBreakdown =>
        Boolean(item && item.sourceTotalDistance > 0),
    );

    const fallbackTotalDistance =
      totalDistanceMeters > 0
        ? totalDistanceMeters
        : sources.length > 0
          ? sources.reduce((sum, item) => sum + item.sourceTotalDistance, 0) /
            sources.length
          : 0;

    if (sources.length === 0 || fallbackTotalDistance <= 0) {
      return {
        asphaltDistance: 0,
        trailDistance: 0,
        bothDistance: 0,
        countedDistance: 0,
        ignoredDistance: Math.max(0, fallbackTotalDistance),
        totalDistance: Math.max(0, fallbackTotalDistance),
      };
    }

    const averageRatio = (
      selector: (item: ExtraClassBreakdown) => number,
    ): number =>
      sources.reduce(
        (sum, item) => sum + selector(item) / item.sourceTotalDistance,
        0,
      ) / sources.length;

    const rawAsphaltRatio = averageRatio((item) => item.asphaltDistance);
    const rawTrailRatio = averageRatio((item) => item.trailDistance);
    const rawBothRatio = averageRatio((item) => item.bothDistance);
    const rawIgnoredRatio = averageRatio((item) => item.ignoredDistance);
    const ratioSum =
      rawAsphaltRatio + rawTrailRatio + rawBothRatio + rawIgnoredRatio;
    const normalizedSum = ratioSum > 0 ? ratioSum : 1;

    const asphaltRatio = rawAsphaltRatio / normalizedSum;
    const trailRatio = rawTrailRatio / normalizedSum;
    const bothRatio = rawBothRatio / normalizedSum;
    const ignoredRatio = rawIgnoredRatio / normalizedSum;

    const asphaltDistance = Math.max(0, fallbackTotalDistance * asphaltRatio);
    const trailDistance = Math.max(0, fallbackTotalDistance * trailRatio);
    const bothDistance = Math.max(0, fallbackTotalDistance * bothRatio);
    const countedDistance = asphaltDistance + trailDistance + bothDistance;
    const ignoredDistance = Math.max(0, fallbackTotalDistance - countedDistance);

    return {
      asphaltDistance,
      trailDistance,
      bothDistance,
      countedDistance,
      ignoredDistance,
      totalDistance: fallbackTotalDistance,
    };
  }

  private getSurfaceProfile(feature: OrsFeature): SurfaceProfile {
    const extras = feature.properties?.extras;
    const totalDistanceMeters = Math.max(
      0,
      feature.properties?.summary?.distance ?? 0,
    );
    const surface = this.summarizeExtraByClass(
      extras?.surface,
      this.classifySurfaceValue.bind(this),
      totalDistanceMeters,
    );
    const waytype = this.summarizeExtraByClass(
      extras?.waytype ?? extras?.waytypes,
      this.classifyWaytypeValue.bind(this),
      totalDistanceMeters,
    );
    const classDistances = this.mergeClassDistances(
      totalDistanceMeters,
      surface,
      waytype,
    );
    const countedDistance = classDistances.countedDistance;
    const asphaltRatio =
      countedDistance > 0
        ? clamp01(
            (classDistances.asphaltDistance + classDistances.bothDistance) /
              countedDistance,
          )
        : 0;
    const trailRatio =
      countedDistance > 0
        ? clamp01(
            (classDistances.trailDistance + classDistances.bothDistance) /
              countedDistance,
          )
        : 0;
    const ignoredRatio =
      classDistances.totalDistance > 0
        ? clamp01(classDistances.ignoredDistance / classDistances.totalDistance)
        : 1;
    const waycategorySummary = extras?.waycategory?.summary ?? extras?.waycategories?.summary ?? [];
    let majorRoadWeight = 0;
    let totalWaycategoryWeight = 0;
    const waycategoryDebug: Array<{
      value: number | string;
      major: boolean;
      weight: number;
    }> = [];
    for (const item of waycategorySummary) {
      const value = item.value;
      if (value === undefined) {
        continue;
      }
      const weight =
        typeof item.distance === "number"
          ? item.distance
          : typeof item.amount === "number"
            ? item.amount
            : 0;
      totalWaycategoryWeight += weight;
      const isMajor = this.isMajorWaycategory(value);
      waycategoryDebug.push({ value, major: isMajor, weight });
      if (isMajor) {
        majorRoadWeight += weight;
      }
    }
    const majorRoadRatio =
      totalWaycategoryWeight > 0 ? majorRoadWeight / totalWaycategoryWeight : 0.25;

    console.log("[ors] waycategory-summary", {
      rawValues: waycategorySummary.map((item) => item.value),
      buckets: waycategoryDebug,
      majorRoadRatio: Number(majorRoadRatio.toFixed(3)),
    });

    console.log("[ors] surface-profile", {
      surfaceRawValues: (extras?.surface?.summary ?? []).map((item) => item.value),
      waytypeRawValues: (extras?.waytype?.summary ?? extras?.waytypes?.summary ?? []).map(
        (item) => item.value,
      ),
      asphaltDistance: Number((classDistances.asphaltDistance / 1000).toFixed(2)),
      trailDistance: Number((classDistances.trailDistance / 1000).toFixed(2)),
      bothDistance: Number((classDistances.bothDistance / 1000).toFixed(2)),
      ignoredDistance: Number((classDistances.ignoredDistance / 1000).toFixed(2)),
      countedDistance: Number((classDistances.countedDistance / 1000).toFixed(2)),
      ignoredRatio: Number(ignoredRatio.toFixed(2)),
      asphaltRatio: Number(asphaltRatio.toFixed(2)),
      trailRatio: Number(trailRatio.toFixed(2)),
    });

    return {
      asphaltRatio: clamp01(asphaltRatio),
      nonAsphaltRatio: clamp01(trailRatio),
      trailRatio: clamp01(trailRatio),
      asphaltDistance: classDistances.asphaltDistance,
      trailDistance: classDistances.trailDistance,
      bothDistance: classDistances.bothDistance,
      countedDistance: classDistances.countedDistance,
      ignoredDistance: classDistances.ignoredDistance,
      ignoredRatio: clamp01(ignoredRatio),
      majorRoadRatio: clamp01(majorRoadRatio),
    };
  }

  private surfacePreferencePenalty(
    profile: SurfaceProfile,
    preference: SurfacePreference,
  ): number {
    if (preference === "mixed") {
      return 0;
    }
    if (preference === "asphalt") {
      return 1 - profile.asphaltRatio;
    }
    return 1 - profile.trailRatio;
  }

  private passesSurfaceGate(
    profile: SurfaceProfile,
    preference: SurfacePreference,
  ): boolean {
    if (profile.countedDistance <= 0) {
      return false;
    }
    if (profile.ignoredRatio > MAX_IGNORED_RATIO) {
      return false;
    }
    if (preference === "mixed") {
      return true;
    }
    if (preference === "asphalt") {
      return profile.asphaltRatio >= ASPHALT_GATE_RATIO;
    }
    return profile.trailRatio >= TRAIL_GATE_RATIO;
  }

  private applySurfaceGate(
    candidates: MappedRoute[],
    preference: SurfacePreference,
    context: string,
  ): MappedRoute[] {
    const inspected = candidates.map((candidate) => {
      const passed = this.passesSurfaceGate(candidate.surfaceProfile, preference);
      return {
        candidate,
        passed,
      };
    });

    console.log("[ors] surface-gate", {
      mode: preference,
      context,
      candidates: inspected.map((item) => ({
        id: item.candidate.route.id,
        asphaltRatio: Number(item.candidate.surfaceProfile.asphaltRatio.toFixed(2)),
        trailRatio: Number(item.candidate.surfaceProfile.trailRatio.toFixed(2)),
        nonAsphaltRatio: Number(
          item.candidate.surfaceProfile.nonAsphaltRatio.toFixed(2),
        ),
        ignoredRatio: Number(item.candidate.surfaceProfile.ignoredRatio.toFixed(2)),
        asphaltDistanceKm: Number(
          (item.candidate.surfaceProfile.asphaltDistance / 1000).toFixed(2),
        ),
        trailDistanceKm: Number(
          (item.candidate.surfaceProfile.trailDistance / 1000).toFixed(2),
        ),
        bothDistanceKm: Number(
          (item.candidate.surfaceProfile.bothDistance / 1000).toFixed(2),
        ),
        countedDistanceKm: Number(
          (item.candidate.surfaceProfile.countedDistance / 1000).toFixed(2),
        ),
        passed: item.passed,
      })),
      validCandidates: inspected.filter((item) => item.passed).length,
    });

    return inspected.filter((item) => item.passed).map((item) => item.candidate);
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
        extra_info: ["surface", "waytype", "waycategory"],
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
  ): MappedRoute[] {
    const mapped = (data.features ?? [])
      .map((feature, index) => {
        const route = mapFeatureToCandidateRoute(feature, index, pace);
        if (!route) {
          return null;
        }
        return {
          route,
          surfaceProfile: this.getSurfaceProfile(feature),
        };
      })
      .filter((item): item is MappedRoute => item !== null);

    console.log("[ors] mapped", {
      routes: mapped.length,
      pointsPerRoute: mapped.map((item) => item.route.polyline.length),
      firstRouteStart: mapped[0]?.route.polyline[0],
      firstRouteEnd:
        mapped[0]?.route.polyline[mapped[0].route.polyline.length - 1],
      asphaltRatios: mapped.map((item) =>
        Number(item.surfaceProfile.asphaltRatio.toFixed(2)),
      ),
      trailRatios: mapped.map((item) =>
        Number(item.surfaceProfile.trailRatio.toFixed(2)),
      ),
      ignoredRatios: mapped.map((item) =>
        Number(item.surfaceProfile.ignoredRatio.toFixed(2)),
      ),
      majorRoadRatios: mapped.map((item) =>
        Number(item.surfaceProfile.majorRoadRatio.toFixed(2)),
      ),
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

  private scoreStartOnlyNonCircular(
    route: CandidateRoute,
    profile: SurfaceProfile,
    targetDistanceKm: number,
    surfacePreference: SurfacePreference,
  ): { hard: number; preference: number; total: number } {
    const diffKm = Math.abs(route.distanceKm - targetDistanceKm);
    const normalizedDistanceError =
      diffKm / Math.max(0.5, targetDistanceKm);
    const outlierToleranceKm = Math.max(1.0, targetDistanceKm * 0.2);
    const outlierPenalty =
      diffKm > outlierToleranceKm
        ? ((diffKm - outlierToleranceKm) / Math.max(0.5, outlierToleranceKm)) * 4.5
        : 0;
    const majorRoadPenalty = profile.majorRoadRatio * 5.2;
    const geometryPenalty = route.polyline.length >= 20 ? 0 : 0.35;
    const hard =
      normalizedDistanceError * 4 +
      diffKm * 0.4 +
      outlierPenalty +
      majorRoadPenalty +
      geometryPenalty;
    const preference = this.surfacePreferencePenalty(profile, surfacePreference);
    return { hard, preference, total: hard + preference * 0.22 };
  }

  private scoreDirected(
    route: CandidateRoute,
    profile: SurfaceProfile,
    targetDistanceKm: number,
    surfacePreference: SurfacePreference,
  ): { hard: number; preference: number; total: number } {
    const diffKm = Math.abs(route.distanceKm - targetDistanceKm);
    const normalizedDistanceError =
      diffKm / Math.max(0.5, targetDistanceKm);
    const majorRoadPenalty = profile.majorRoadRatio * 6.8;
    const geometryPenalty = route.polyline.length >= 20 ? 0 : 0.35;
    const hard =
      majorRoadPenalty +
      normalizedDistanceError * 1.4 +
      diffKm * 0.18 +
      geometryPenalty;
    const preference = this.surfacePreferencePenalty(profile, surfacePreference);
    return { hard, preference, total: hard + preference * 0.18 };
  }

  private computePolygonAreaKm2(points: RouteCoordinate[]): number {
    if (points.length < 3) {
      return 0;
    }

    const avgLat =
      points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
    const kmPerLon = this.kmPerLonDegree(avgLat);
    const projected = points.map((point) => ({
      x: point.longitude * kmPerLon,
      y: point.latitude * KM_PER_LAT_DEGREE,
    }));

    let sum = 0;
    for (let i = 0; i < projected.length; i += 1) {
      const current = projected[i];
      const next = projected[(i + 1) % projected.length];
      sum += current.x * next.y - next.x * current.y;
    }

    return Math.abs(sum) / 2;
  }

  private scoreCircularCandidate(
    route: CandidateRoute,
    profile: SurfaceProfile,
    start: RouteCoordinate,
    targetDistanceKm: number,
    surfacePreference: SurfacePreference,
  ): { hard: number; preference: number; total: number } {
    const diffKm = Math.abs(route.distanceKm - targetDistanceKm);
    const normalizedDistanceError =
      diffKm / Math.max(0.5, targetDistanceKm);

    const end = route.polyline[route.polyline.length - 1];
    const closureDistanceKm = this.haversineKm(start, end);
    const closurePenalty = Math.min(1.2, closureDistanceKm * 8);

    const areaKm2 = this.computePolygonAreaKm2(route.polyline);
    const areaExpectation = Math.max(0.02, (targetDistanceKm * targetDistanceKm) / 18);
    const loopShapePenalty = areaKm2 >= areaExpectation ? 0 : (areaExpectation - areaKm2) / areaExpectation;

    const geometryPenalty = route.polyline.length >= 30 ? 0 : 0.35;

    const toleranceKm = Math.max(1.0, targetDistanceKm * 0.18);
    const outlierPenalty =
      diffKm > toleranceKm
        ? ((diffKm - toleranceKm) / Math.max(0.5, toleranceKm)) * 4
        : 0;
    const majorRoadPenalty = profile.majorRoadRatio * 4.6;
    const hard =
      normalizedDistanceError * 4.2 +
      diffKm * 0.65 +
      outlierPenalty +
      majorRoadPenalty +
      closurePenalty * 0.9 +
      loopShapePenalty * 0.8 +
      geometryPenalty;
    const preference = this.surfacePreferencePenalty(profile, surfacePreference);
    return { hard, preference, total: hard + preference * 0.24 };
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
    const bestHard = scored.reduce(
      (best, item) => Math.min(best, item.hardScore),
      Number.POSITIVE_INFINITY,
    );
    const qualityThreshold = bestHard + 1.4;
    const qualityFiltered = scored.filter(
      (item) => item.hardScore <= qualityThreshold,
    );
    const ranked = qualityFiltered.length > 0 ? qualityFiltered : scored;

    const selected: EvaluatedCandidate[] = [];
    const minSeparationKm = Math.max(0.25, Math.min(1.5, targetDistanceKm * 0.15));

    for (const candidate of ranked) {
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

    // Prefer fewer quality routes over backfilling weak options.

    return selected.map((item, index) => ({
      ...item.route,
      id: `ors-generated-${index + 1}`,
      name: index === 0 ? "OpenStreetMap Route" : `Alternative ${index + 1}`,
    }));
  }

  private pickDiverseCircularBest(
    scored: EvaluatedCandidate[],
    targetDistanceKm: number,
  ): CandidateRoute[] {
    const strictToleranceKm = Math.max(1.2, targetDistanceKm * 0.22);
    const acceptable = scored.filter(
      (item) => Math.abs(item.route.distanceKm - targetDistanceKm) <= strictToleranceKm,
    );
    const basePool = acceptable.length > 0 ? acceptable : scored;
    const bestHard = basePool.reduce(
      (best, item) => Math.min(best, item.hardScore),
      Number.POSITIVE_INFINITY,
    );
    const qualityThreshold = bestHard + 1.5;
    const qualityFiltered = basePool.filter(
      (item) => item.hardScore <= qualityThreshold,
    );
    const ranked =
      qualityFiltered.length > 0 ? qualityFiltered : basePool;

    const selected: EvaluatedCandidate[] = [];
    const minSeparationKm = Math.max(0.18, Math.min(0.9, targetDistanceKm * 0.08));

    for (const candidate of ranked) {
      const candidateMid = candidate.route.polyline[
        Math.floor(candidate.route.polyline.length / 2)
      ];
      const isTooClose = selected.some((chosen) => {
        const chosenMid =
          chosen.route.polyline[Math.floor(chosen.route.polyline.length / 2)];
        return this.haversineKm(candidateMid, chosenMid) < minSeparationKm;
      });

      if (!isTooClose) {
        selected.push(candidate);
      }
      if (selected.length === 3) {
        break;
      }
    }

    // Intentionally do not backfill with poor-distance outliers.
    // Returning fewer high-quality loops is better than 3 weak alternatives.

    return selected.map((item, index) => ({
      ...item.route,
      id: `ors-circular-${index + 1}`,
      name: index === 0 ? "OpenStreetMap Loop" : `Loop Alternative ${index + 1}`,
    }));
  }

  private computeModeScore(
    mode: RouteMode,
    route: CandidateRoute,
    profile: SurfaceProfile,
    targetDistanceKm: number,
    surfacePreference: SurfacePreference,
    start?: RouteCoordinate,
  ): { hard: number; preference: number; total: number } {
    if (mode === "directed") {
      return this.scoreDirected(route, profile, targetDistanceKm, surfacePreference);
    }
    if (mode === "start-only-circular") {
      if (!start) {
        return this.scoreDirected(route, profile, targetDistanceKm, surfacePreference);
      }
      return this.scoreCircularCandidate(
        route,
        profile,
        start,
        targetDistanceKm,
        surfacePreference,
      );
    }
    return this.scoreStartOnlyNonCircular(
      route,
      profile,
      targetDistanceKm,
      surfacePreference,
    );
  }

  private compareByDistanceThenQuality(
    a: {
      route: CandidateRoute;
      hard?: number;
      preference?: number;
      hardScore?: number;
      preferenceScore?: number;
    },
    b: {
      route: CandidateRoute;
      hard?: number;
      preference?: number;
      hardScore?: number;
      preferenceScore?: number;
    },
    targetDistanceKm: number,
  ): number {
    const hardA = a.hard ?? a.hardScore ?? Number.POSITIVE_INFINITY;
    const hardB = b.hard ?? b.hardScore ?? Number.POSITIVE_INFINITY;
    const preferenceA = a.preference ?? a.preferenceScore ?? 0;
    const preferenceB = b.preference ?? b.preferenceScore ?? 0;
    const distanceDeltaA = Math.abs(a.route.distanceKm - targetDistanceKm);
    const distanceDeltaB = Math.abs(b.route.distanceKm - targetDistanceKm);
    const distanceTieThresholdKm = Math.max(0.15, targetDistanceKm * 0.03);

    if (Math.abs(distanceDeltaA - distanceDeltaB) > distanceTieThresholdKm) {
      return distanceDeltaA - distanceDeltaB;
    }
    if (Math.abs(hardA - hardB) > 0.01) {
      return hardA - hardB;
    }
    return preferenceA - preferenceB;
  }

  private generateCircularLoopCandidates(
    start: RouteCoordinate,
    targetDistanceKm: number,
  ): CircularLoopCandidate[] {
    const radiusKm = Math.max(0.25, Math.min(6, targetDistanceKm / 3.4));
    const bases = [0, 60, 120, 180, 240, 300];

    return bases.map((baseBearing) => ({
      via1: this.offsetCoordinate(start, radiusKm * 0.95, baseBearing - 35),
      via2: this.offsetCoordinate(start, radiusKm * 1.05, baseBearing + 80),
      baseBearing,
      radiusKm,
    }));
  }

  private createCircularRefinements(
    start: RouteCoordinate,
    evaluated: EvaluatedCandidate[],
    targetDistanceKm: number,
  ): CircularLoopCandidate[] {
    const refinements: CircularLoopCandidate[] = [];

    for (let i = 0; i < Math.min(2, evaluated.length); i += 1) {
      const result = evaluated[i];
      const ratio = Math.min(
        1.3,
        Math.max(0.75, targetDistanceKm / Math.max(0.2, result.route.distanceKm)),
      );
      const tunedRadius = Math.max(0.2, Math.min(7, result.radiusKm * ratio));

      const variants = [result.bearingDeg - 15, result.bearingDeg + 15];
      for (const bearing of variants) {
        refinements.push({
          via1: this.offsetCoordinate(start, tunedRadius * 0.95, bearing - 35),
          via2: this.offsetCoordinate(start, tunedRadius * 1.05, bearing + 80),
          baseBearing: bearing,
          radiusKm: tunedRadius,
        });
      }
    }

    return refinements;
  }

  private async requestCircularLoop(
    start: RouteCoordinate,
    via1: RouteCoordinate,
    via2: RouteCoordinate,
  ): Promise<OrsResponse> {
    console.log("[ors] request-circular", {
      start,
      via1,
      via2,
      end: start,
      coordOrder: "[lon, lat]",
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
          [via1.longitude, via1.latitude],
          [via2.longitude, via2.latitude],
          [start.longitude, start.latitude],
        ],
        extra_info: ["surface", "waytype", "waycategory"],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.log("[ors] circular-response-error", {
        status: response.status,
        body: errorBody.slice(0, 500),
      });
      throw new Error(`ORS circular request failed (${response.status}).`);
    }

    return (await response.json()) as OrsResponse;
  }

  private async evaluateCircularCandidates(
    start: RouteCoordinate,
    pace: number,
    targetDistanceKm: number,
    surfacePreference: SurfacePreference,
    candidates: CircularLoopCandidate[],
  ): Promise<EvaluationBatch> {
    const results: EvaluatedCandidate[] = [];
    let mappedCandidates = 0;

    for (const candidate of candidates) {
      try {
        const data = await this.requestCircularLoop(
          start,
          candidate.via1,
          candidate.via2,
        );
        const mapped = this.mapFeaturesToRoutes(data, pace);
        mappedCandidates += mapped.length;
        const gated = this.applySurfaceGate(
          mapped,
          surfacePreference,
          `start-only-circular-${candidate.baseBearing}`,
        );
        if (gated.length > 0) {
          const scored = gated.map((item) => {
            const score = this.computeModeScore(
              "start-only-circular",
              item.route,
              item.surfaceProfile,
              targetDistanceKm,
              surfacePreference,
              start,
            );
            return {
              ...item,
              hard: score.hard,
              preference: score.preference,
            };
          });
          const best = scored.sort((a, b) =>
            this.compareByDistanceThenQuality(a, b, targetDistanceKm),
          )[0];
          const score = this.computeModeScore(
            "start-only-circular",
            best.route,
            best.surfaceProfile,
            targetDistanceKm,
            surfacePreference,
            start,
          );
          results.push({
            route: best.route,
            surfaceProfile: best.surfaceProfile,
            endpoint: best.route.polyline[best.route.polyline.length - 1],
            bearingDeg: candidate.baseBearing,
            radiusKm: candidate.radiusKm,
            score: score.total,
            hardScore: score.hard,
            preferenceScore: score.preference,
          });
        }
      } catch (error) {
        console.log("[ors] circular-candidate-failed", {
          baseBearing: candidate.baseBearing,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { results, mappedCandidates };
  }

  private async evaluateCandidates(
    start: RouteCoordinate,
    pace: number,
    targetDistanceKm: number,
    surfacePreference: SurfacePreference,
    candidates: EndpointCandidate[],
  ): Promise<EvaluationBatch> {
    const results: EvaluatedCandidate[] = [];
    let mappedCandidates = 0;

    for (const candidate of candidates) {
      try {
        const data = await this.requestDirections(start, candidate.endpoint, false);
        const mapped = this.mapFeaturesToRoutes(data, pace);
        mappedCandidates += mapped.length;
        const gated = this.applySurfaceGate(
          mapped,
          surfacePreference,
          `start-only-noncircular-${candidate.bearingDeg}`,
        );
        if (gated.length > 0) {
          const scored = gated.map((item) => {
            const score = this.computeModeScore(
              "start-only-noncircular",
              item.route,
              item.surfaceProfile,
              targetDistanceKm,
              surfacePreference,
            );
            return {
              ...item,
              hard: score.hard,
              preference: score.preference,
            };
          });
          const best = scored.sort((a, b) =>
            this.compareByDistanceThenQuality(a, b, targetDistanceKm),
          )[0];
          const score = this.computeModeScore(
            "start-only-noncircular",
            best.route,
            best.surfaceProfile,
            targetDistanceKm,
            surfacePreference,
          );
          results.push({
            route: best.route,
            surfaceProfile: best.surfaceProfile,
            endpoint: candidate.endpoint,
            bearingDeg: candidate.bearingDeg,
            radiusKm: candidate.radiusKm,
            score: score.total,
            hardScore: score.hard,
            preferenceScore: score.preference,
          });
        }
      } catch (error) {
        console.log("[ors] candidate-failed", {
          end: candidate.endpoint,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { results, mappedCandidates };
  }

  private async generateFromStartOnly(
    start: RouteCoordinate,
    targetDistanceKm: number,
    pace: number,
    surfacePreference: SurfacePreference,
  ): Promise<GeneratedBatch> {
    const initialCandidates = this.generateCandidateEndpoints(start, targetDistanceKm);
    const initialEvaluation = await this.evaluateCandidates(
      start,
      pace,
      targetDistanceKm,
      surfacePreference,
      initialCandidates,
    );
    const topInitial = [...initialEvaluation.results]
      .sort((a, b) =>
        this.compareByDistanceThenQuality(a, b, targetDistanceKm),
      )
      .slice(0, 3);

    const refinementCandidates = this.createRefinementEndpoints(
      start,
      targetDistanceKm,
      topInitial,
    );
    const refinementEvaluation = await this.evaluateCandidates(
      start,
      pace,
      targetDistanceKm,
      surfacePreference,
      refinementCandidates,
    );

    const combined = [
      ...initialEvaluation.results,
      ...refinementEvaluation.results,
    ].sort((a, b) =>
      this.compareByDistanceThenQuality(a, b, targetDistanceKm),
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

    return {
      routes: picked,
      mappedCandidates:
        initialEvaluation.mappedCandidates +
        refinementEvaluation.mappedCandidates,
    };
  }

  private async generateCircularFromStartOnly(
    start: RouteCoordinate,
    targetDistanceKm: number,
    pace: number,
    surfacePreference: SurfacePreference,
  ): Promise<GeneratedBatch> {
    const initial = this.generateCircularLoopCandidates(start, targetDistanceKm);
    const initialEvaluation = await this.evaluateCircularCandidates(
      start,
      pace,
      targetDistanceKm,
      surfacePreference,
      initial,
    );
    const bestInitial = [...initialEvaluation.results]
      .sort((a, b) =>
        this.compareByDistanceThenQuality(a, b, targetDistanceKm),
      )
      .slice(0, 2);

    const refinement = this.createCircularRefinements(
      start,
      bestInitial,
      targetDistanceKm,
    );
    const refinementEvaluation = await this.evaluateCircularCandidates(
      start,
      pace,
      targetDistanceKm,
      surfacePreference,
      refinement,
    );

    const combined = [
      ...initialEvaluation.results,
      ...refinementEvaluation.results,
    ].sort((a, b) =>
      this.compareByDistanceThenQuality(a, b, targetDistanceKm),
    );
    const picked = this.pickDiverseCircularBest(combined, targetDistanceKm);

    console.log("[ors] generated-circular", {
      attempted: initial.length + refinement.length,
      initialAttempted: initial.length,
      refinementAttempted: refinement.length,
      usable: combined.length,
      returned: picked.length,
      strictToleranceKm: Math.max(1.2, targetDistanceKm * 0.22),
      distances: picked.map((route) => route.distanceKm),
    });

    return {
      routes: picked,
      mappedCandidates:
        initialEvaluation.mappedCandidates +
        refinementEvaluation.mappedCandidates,
    };
  }

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    if (!env.openRouteServiceApiKey) {
      throw new Error("Missing EXPO_PUBLIC_ORS_API_KEY");
    }
    if (!params.startCoordinate) {
      throw new Error("Missing start coordinate for ORS request.");
    }
    const surfacePreference = normalizeSurfacePreference(params.surface);
    const pace = params.paceMinPerKm && params.paceMinPerKm > 0 ? params.paceMinPerKm : 6;

    if (params.endCoordinate) {
      const rawMapped = this.mapFeaturesToRoutes(
        await this.requestDirections(
          params.startCoordinate,
          params.endCoordinate,
          true,
        ),
        pace,
      );
      const gated = this.applySurfaceGate(
        rawMapped,
        surfacePreference,
        "directed",
      );

      if (rawMapped.length > 0 && gated.length === 0) {
        throw new NoSurfaceMatchError(surfacePreference);
      }

      const scored = gated
        .map((item) => {
          const score = this.computeModeScore(
            "directed",
            item.route,
            item.surfaceProfile,
            params.targetDistanceKm,
            surfacePreference,
          );
          return {
            ...item,
            hard: score.hard,
            preference: score.preference,
          };
        })
        .sort((a, b) =>
          this.compareByDistanceThenQuality(a, b, params.targetDistanceKm),
        );

      const bestHard = scored.reduce(
        (best, item) => Math.min(best, item.hard),
        Number.POSITIVE_INFINITY,
      );
      const qualityFiltered = scored.filter((item) => item.hard <= bestHard + 1.2);
      const finalRoutes = (qualityFiltered.length > 0 ? qualityFiltered : scored)
        .slice(0, 3)
        .map((item) => item.route);

      console.log("[ors] directed-final", {
        surfaceMode: surfacePreference,
        validCandidates: finalRoutes.length,
        distances: finalRoutes.map((route) => route.distanceKm),
      });

      if (finalRoutes.length === 0) {
        throw new Error("ORS returned no usable routes.");
      }

      return finalRoutes;
    }

    const generated = params.circular
      ? await this.generateCircularFromStartOnly(
          params.startCoordinate,
          params.targetDistanceKm,
          pace,
          surfacePreference,
        )
      : await this.generateFromStartOnly(
          params.startCoordinate,
          params.targetDistanceKm,
          pace,
          surfacePreference,
        );

    if (generated.routes.length === 0 && generated.mappedCandidates > 0) {
      throw new NoSurfaceMatchError(surfacePreference);
    }

    if (generated.routes.length === 0) {
      throw new Error("ORS returned no usable routes.");
    }

    return generated.routes;
  }
}
