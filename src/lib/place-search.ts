import type { RouteCoordinate } from "../types/route";

export type PlaceSuggestion = {
  id: string;
  label: string;
  coordinate: RouteCoordinate;
};

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    addressdetails: "0",
    limit: "5",
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "stride-app",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as NominatimItem[];
    return data
      .map((item) => ({
        id: String(item.place_id),
        label: item.display_name,
        coordinate: {
          latitude: Number(item.lat),
          longitude: Number(item.lon),
        },
      }))
      .filter(
        (item) =>
          !Number.isNaN(item.coordinate.latitude) &&
          !Number.isNaN(item.coordinate.longitude),
      );
  } catch {
    return [];
  }
}
