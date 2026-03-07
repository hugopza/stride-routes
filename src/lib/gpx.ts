import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { RouteCoordinate } from "../types/route";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeFilePart(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const cleaned = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "route";
}

function timestampForFile(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

export function polylineToGpx(routeName: string, polyline: RouteCoordinate[]): string {
  const trkpts = polyline
    .map(
      (point) =>
        `      <trkpt lat="${point.latitude.toFixed(6)}" lon="${point.longitude.toFixed(6)}"></trkpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Stride App" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

export async function exportPolylineAsGpx(routeName: string, polyline: RouteCoordinate[]): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error("No writable document directory available on this device.");
  }

  const gpx = polylineToGpx(routeName, polyline);
  const filename = `${safeFilePart(routeName)}-${timestampForFile()}.gpx`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, gpx, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new Error(
      "Sharing is unavailable on this device. GPX was saved locally, but cannot be shared here.",
    );
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "application/gpx+xml",
    dialogTitle: "Export GPX",
    UTI: "public.xml",
  });
}
