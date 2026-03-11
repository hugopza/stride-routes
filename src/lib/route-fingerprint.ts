import type { CandidateRoute, RouteCoordinate } from "../types/route";

function serializePoint(point: RouteCoordinate): string {
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
}

function fnv1a32(value: string): string {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function getRouteFingerprint(route: CandidateRoute): string {
  const polylineKey = (route.polyline ?? []).map(serializePoint).join("|");
  const rawFingerprint = [
    route.provider ?? "unknown",
    route.distanceKm.toFixed(2),
    route.estimatedDurationMinutes,
    route.elevationGainM ?? "na",
    polylineKey,
  ].join("::");

  return [
    fnv1a32(rawFingerprint),
    fnv1a32(`${rawFingerprint}::a`),
    fnv1a32(`${rawFingerprint}::b`),
  ].join("");
}
