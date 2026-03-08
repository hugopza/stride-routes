import type {
  CandidateRoute,
  RouteCoordinate,
  RouteParams,
} from "../../types/route";
import type { RouteProvider } from "./RouteProvider";

const DEFAULT_START: RouteCoordinate = {
  latitude: 40.4168,
  longitude: -3.7038,
};

const KM_PER_LAT_DEGREE = 111.32;

function kmPerLonDegree(latitude: number): number {
  return 111.32 * Math.cos((latitude * Math.PI) / 180);
}

function metersToDeltaLat(meters: number): number {
  return (meters / 1000) / KM_PER_LAT_DEGREE;
}

function metersToDeltaLon(meters: number, latitude: number): number {
  const km = meters / 1000;
  const perDegree = kmPerLonDegree(latitude);
  return perDegree > 0 ? km / perDegree : 0;
}

function offsetCoordinate(
  origin: RouteCoordinate,
  distanceMeters: number,
  bearingRadians: number,
): RouteCoordinate {
  const northMeters = Math.cos(bearingRadians) * distanceMeters;
  const eastMeters = Math.sin(bearingRadians) * distanceMeters;

  return {
    latitude: origin.latitude + metersToDeltaLat(northMeters),
    longitude: origin.longitude + metersToDeltaLon(eastMeters, origin.latitude),
  };
}

function segmentDistanceMeters(a: RouteCoordinate, b: RouteCoordinate): number {
  const dLatMeters = (b.latitude - a.latitude) * KM_PER_LAT_DEGREE * 1000;
  const avgLat = (a.latitude + b.latitude) / 2;
  const dLonMeters =
    (b.longitude - a.longitude) * kmPerLonDegree(avgLat) * 1000;

  return Math.hypot(dLatMeters, dLonMeters);
}

function polylineDistanceKm(points: RouteCoordinate[]): number {
  if (points.length < 2) {
    return 0;
  }

  let meters = 0;
  for (let i = 1; i < points.length; i += 1) {
    meters += segmentDistanceMeters(points[i - 1], points[i]);
  }

  return meters / 1000;
}

function interpolatePath(
  anchors: RouteCoordinate[],
  spacingMeters: number,
): RouteCoordinate[] {
  if (anchors.length < 2) {
    return anchors;
  }

  const points: RouteCoordinate[] = [anchors[0]];

  for (let i = 1; i < anchors.length; i += 1) {
    const from = anchors[i - 1];
    const to = anchors[i];
    const segmentMeters = segmentDistanceMeters(from, to);
    const steps = Math.max(1, Math.ceil(segmentMeters / spacingMeters));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      points.push({
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
      });
    }
  }

  return points;
}

function createRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return ((h >>> 0) % 1000000) / 1000000;
  };
}

function generateCircularPolyline(
  start: RouteCoordinate,
  targetDistanceKm: number,
  seed: string,
): RouteCoordinate[] {
  const targetMeters = Math.max(1200, targetDistanceKm * 1000);
  const rng = createRng(seed);
  const turnCount = 4 + Math.floor(rng() * 5); // 4-8

  const baseRadius = targetMeters / (2 * Math.PI);
  let angle = rng() * Math.PI * 2;

  const anchors: RouteCoordinate[] = [start];

  for (let i = 0; i < turnCount; i += 1) {
    angle += (Math.PI * 2) / turnCount + (rng() - 0.5) * 0.8;
    const radius = baseRadius * (0.6 + rng() * 0.8);
    anchors.push(offsetCoordinate(start, radius, angle));
  }

  anchors.push(start);

  return interpolatePath(anchors, 55);
}

function generateNonCircularPolyline(
  start: RouteCoordinate,
  end: RouteCoordinate,
  targetDistanceKm: number,
  seed: string,
): RouteCoordinate[] {
  const rng = createRng(seed);
  const bendCount = 2 + Math.floor(rng() * 3);
  const anchors: RouteCoordinate[] = [start];
  const targetMeters = Math.max(800, targetDistanceKm * 1000);

  for (let i = 1; i <= bendCount; i += 1) {
    const t = i / (bendCount + 1);
    const center: RouteCoordinate = {
      latitude: start.latitude + (end.latitude - start.latitude) * t,
      longitude: start.longitude + (end.longitude - start.longitude) * t,
    };

    const dxMeters =
      (end.longitude - start.longitude) * kmPerLonDegree(start.latitude) * 1000;
    const dyMeters = (end.latitude - start.latitude) * KM_PER_LAT_DEGREE * 1000;
    const baseLength = Math.max(1, Math.hypot(dxMeters, dyMeters));

    const normalX = -dyMeters / baseLength;
    const normalY = dxMeters / baseLength;
    const offsetMeters = (rng() - 0.5) * targetMeters * 0.12;

    anchors.push({
      latitude: center.latitude + metersToDeltaLat(normalY * offsetMeters),
      longitude:
        center.longitude +
        metersToDeltaLon(normalX * offsetMeters, center.latitude),
    });
  }

  anchors.push(end);

  return interpolatePath(anchors, 55);
}

function toRoute(
  id: string,
  name: string,
  distanceKm: number,
  paceMinPerKm: number,
  elevationGainM: number,
  polyline: RouteCoordinate[],
): CandidateRoute {
  const geometryDistance = Math.max(0.4, polylineDistanceKm(polyline));
  const coherentDistanceKm = Number(
    (distanceKm * 0.35 + geometryDistance * 0.65).toFixed(2),
  );

  return {
    id,
    name,
    provider: "fake",
    distanceKm: coherentDistanceKm,
    estimatedDurationMinutes: Math.max(
      5,
      Math.round(coherentDistanceKm * paceMinPerKm),
    ),
    elevationGainM,
    polyline,
  };
}

export class FakeRouteProvider implements RouteProvider {
  private generateRoutesSync(params: RouteParams): CandidateRoute[] {
    const fallbackPace = 6;
    const pace =
      params.paceMinPerKm && params.paceMinPerKm > 0
        ? params.paceMinPerKm
        : fallbackPace;

    const baseDistance =
      params.targetDistanceKm > 0
        ? params.targetDistanceKm
        : params.timeMinutes && params.timeMinutes > 0
          ? params.timeMinutes / pace
          : 5;

    const start = params.startCoordinate ?? DEFAULT_START;
    const defaultEnd = offsetCoordinate(start, baseDistance * 800, 1.1);
    const end = params.endCoordinate ?? defaultEnd;
    const isCircular = params.circular !== false;

    const d1 = Number((baseDistance * 0.95).toFixed(2));
    const d2 = Number(baseDistance.toFixed(2));
    const d3 = Number((baseDistance * 1.05).toFixed(2));

    const p1 = isCircular
      ? generateCircularPolyline(start, d1, "route-1")
      : generateNonCircularPolyline(start, end, d1, "route-1");
    const p2 = isCircular
      ? generateCircularPolyline(start, d2, "route-2")
      : generateNonCircularPolyline(start, end, d2, "route-2");
    const p3 = isCircular
      ? generateCircularPolyline(start, d3, "route-3")
      : generateNonCircularPolyline(start, end, d3, "route-3");

    return [
      toRoute("route-1", "Riverside Loop", d1, pace, 42, p1),
      toRoute("route-2", "City Park Circuit", d2, pace, 58, p2),
      toRoute("route-3", "Hill Tempo Route", d3, pace, 91, p3),
    ];
  }

  async generateRoutes(params: RouteParams): Promise<CandidateRoute[]> {
    return this.generateRoutesSync(params);
  }

  generatePreviewRoutes(params: RouteParams): CandidateRoute[] {
    return this.generateRoutesSync(params);
  }
}
