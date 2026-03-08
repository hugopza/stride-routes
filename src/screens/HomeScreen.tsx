import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { InputRow } from "../components/InputRow";
import { searchPlaces, type PlaceSuggestion } from "../lib/place-search";
import type { RoutesStackParamList } from "../navigation/types";
import { routeGenerationService } from "../services/routeGenerationService";
import type { RouteCoordinate, RouteParams } from "../types/route";

type Props = NativeStackScreenProps<RoutesStackParamList, "Home">;

type RouteParamsWithUi = RouteParams & {
  circular: boolean;
  start?: string;
  end?: string;
  surface: string;
  intensity: string;
  waypoints: string[];
};

const DEFAULT_REGION = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

function parsePace(raw: string): number | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.includes(":")) {
    const [minutesText, secondsText] = value.split(":");
    const minutes = Number(minutesText);
    const seconds = Number(secondsText);

    if (
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return null;
    }

    return minutes + seconds / 60;
  }

  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseDistance(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function haversineKm(a: RouteCoordinate, b: RouteCoordinate): number {
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

export function HomeScreen({ navigation }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const nonceCounterRef = useRef(0);
  const originSearchRequestRef = useRef(0);
  const destinationSearchRequestRef = useRef(0);

  const [goalMode, setGoalMode] = useState<"time" | "distance">("time");
  const [routeType, setRouteType] = useState<"point_to_point" | "circular">(
    "point_to_point",
  );

  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [distanceKm, setDistanceKm] = useState("8");
  const [pace, setPace] = useState("5:30");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints] = useState<string[]>([]);
  const [surface, setSurface] = useState("Mixed");
  const [intensity, setIntensity] = useState("Balanced");
  const [isGenerating, setIsGenerating] = useState(false);

  const [startCoordinate, setStartCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);
  const [endCoordinate, setEndCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);

  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectingPoint, setSelectingPoint] = useState<"start" | "end">(
    "start",
  );
  const [userLocation, setUserLocation] = useState<RouteCoordinate | undefined>(
    undefined,
  );

  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);

  const isCircular = routeType === "circular";

  useEffect(() => {
    if (isCircular) {
      setEnd("");
      setEndCoordinate(undefined);
      setDestinationSuggestions([]);
      if (selectingPoint === "end") {
        setSelectingPoint("start");
      }
    }
  }, [isCircular, selectingPoint]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition?.(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // Keep silent fallback to default region.
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const query = start.trim();
      if (query.length < 3) {
        setOriginSuggestions([]);
        setIsSearchingOrigin(false);
        return;
      }

      const requestId = originSearchRequestRef.current + 1;
      originSearchRequestRef.current = requestId;
      setIsSearchingOrigin(true);
      const results = await searchPlaces(query, controller.signal);
      if (
        requestId !== originSearchRequestRef.current ||
        controller.signal.aborted
      ) {
        return;
      }
      setOriginSuggestions(results);
      setIsSearchingOrigin(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
      originSearchRequestRef.current += 1;
    };
  }, [start]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const query = end.trim();
      if (query.length < 3 || isCircular) {
        setDestinationSuggestions([]);
        setIsSearchingDestination(false);
        return;
      }

      const requestId = destinationSearchRequestRef.current + 1;
      destinationSearchRequestRef.current = requestId;
      setIsSearchingDestination(true);
      const results = await searchPlaces(query, controller.signal);
      if (
        requestId !== destinationSearchRequestRef.current ||
        controller.signal.aborted
      ) {
        return;
      }
      setDestinationSuggestions(results);
      setIsSearchingDestination(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
      destinationSearchRequestRef.current += 1;
    };
  }, [end, isCircular]);

  const parsedHours = Number(hours) || 0;
  const parsedMinutes = Number(minutes) || 0;
  const totalMinutes = parsedHours * 60 + parsedMinutes;
  const normalizedPace = parsePace(pace);
  const normalizedDistance = parseDistance(distanceKm);

  const directDistanceKm =
    startCoordinate && endCoordinate
      ? Math.max(0.2, haversineKm(startCoordinate, endCoordinate) * 1.2)
      : 0;

  const targetDistanceKm = isCircular
    ? goalMode === "time"
      ? totalMinutes > 0 && normalizedPace
        ? totalMinutes / normalizedPace
        : 0
      : (normalizedDistance ?? 0)
    : directDistanceKm;

  const originError =
    submitAttempted && !startCoordinate
      ? "Origin is required. Select from search results or map."
      : undefined;

  const destinationError =
    submitAttempted && !isCircular && !endCoordinate
      ? "Destination is required for point-to-point routes."
      : undefined;

  const paceError =
    submitAttempted &&
    isCircular &&
    goalMode === "time" &&
    normalizedPace === null
      ? "Pace is required. Use mm:ss or decimal format."
      : undefined;

  const distanceError =
    submitAttempted &&
    isCircular &&
    goalMode === "distance" &&
    normalizedDistance === null
      ? "Distance must be greater than 0."
      : undefined;

  const isCircularInputValid =
    goalMode === "time"
      ? totalMinutes > 0 && normalizedPace !== null
      : normalizedDistance !== null;

  const isFormValid = Boolean(startCoordinate) && (isCircular
    ? isCircularInputValid
    : Boolean(endCoordinate));

  const centerMap = () => {
    const center = startCoordinate ?? userLocation ?? DEFAULT_REGION;
    mapRef.current?.animateToRegion({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: DEFAULT_REGION.latitudeDelta,
      longitudeDelta: DEFAULT_REGION.longitudeDelta,
    });
  };

  const toggleMapPicker = () => {
    const next = !isMapPickerOpen;
    setIsMapPickerOpen(next);
    if (next) {
      setTimeout(centerMap, 200);
    }
  };

  const onSelectOrigin = (suggestion: PlaceSuggestion) => {
    setStart(suggestion.label);
    setStartCoordinate(suggestion.coordinate);
    setOriginSuggestions([]);
  };

  const onSelectDestination = (suggestion: PlaceSuggestion) => {
    setEnd(suggestion.label);
    setEndCoordinate(suggestion.coordinate);
    setDestinationSuggestions([]);
  };

  const onMapPress = (event: MapPressEvent) => {
    const coordinate = event.nativeEvent.coordinate;

    if (selectingPoint === "start") {
      setStartCoordinate(coordinate);
      setStart(
        `Pinned origin (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`,
      );
      setOriginSuggestions([]);
      return;
    }

    if (!isCircular) {
      setEndCoordinate(coordinate);
      setEnd(
        `Pinned destination (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`,
      );
      setDestinationSuggestions([]);
    }
  };

  const onGenerate = () => {
    setSubmitAttempted(true);
    if (!isFormValid) {
      Alert.alert("Invalid input", "Please fix the highlighted fields.");
      return;
    }

    nonceCounterRef.current += 1;
    const generationNonce = Date.now() + nonceCounterRef.current;

    const params: RouteParamsWithUi = {
      goalMode,
      timeMinutes:
        isCircular && goalMode === "time" ? totalMinutes : undefined,
      paceMinPerKm: normalizedPace ?? undefined,
      targetDistanceKm,
      generationNonce,
      circular: isCircular,
      startCoordinate,
      endCoordinate: isCircular ? undefined : endCoordinate,
      start: start.trim() || undefined,
      end: !isCircular ? end.trim() || undefined : undefined,
      surface,
      intensity,
      waypoints,
    };

    setIsGenerating(true);

    setTimeout(async () => {
      try {
        const routes = await routeGenerationService.generateRoutes(params);
        navigation.navigate("Results", { params, routes });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not generate routes right now.";
        Alert.alert("Route error", message);
      } finally {
        setIsGenerating(false);
      }
    }, 180);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Build your next route</Text>
        <Text style={styles.heroSubtitle}>
          Choose your preferences, then review generated alternatives on the next screen.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GOAL</Text>
        <View style={styles.goalRow}>
          <Chip
            label="By time"
            selected={goalMode === "time"}
            onPress={() => setGoalMode("time")}
            style={{ flex: 1 }}
          />
          <Chip
            label="By distance"
            selected={goalMode === "distance"}
            onPress={() => setGoalMode("distance")}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROUTE TYPE</Text>
        <View style={styles.goalRow}>
          <Chip
            label="Point to point"
            selected={!isCircular}
            onPress={() => setRouteType("point_to_point")}
            style={{ flex: 1 }}
          />
          <Chip
            label="Circular"
            selected={isCircular}
            onPress={() => setRouteType("circular")}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ORIGIN</Text>
        <InputRow
          placeholder="Search address, city, postcode, POI..."
          value={start}
          onChangeText={(text) => {
            setStart(text);
            setStartCoordinate(undefined);
          }}
          error={originError}
        />
        {isSearchingOrigin ? (
          <Text style={styles.searchHint}>Searching...</Text>
        ) : null}
        {originSuggestions.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelectOrigin(item)}
            style={styles.suggestionItem}
          >
            <Text style={styles.suggestionText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {!isCircular ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESTINATION</Text>
          <InputRow
            placeholder="Search destination..."
            value={end}
            onChangeText={(text) => {
              setEnd(text);
              setEndCoordinate(undefined);
            }}
            error={destinationError}
          />
          {isSearchingDestination ? (
            <Text style={styles.searchHint}>Searching...</Text>
          ) : null}
          {destinationSuggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelectDestination(item)}
              style={styles.suggestionItem}
            >
              <Text style={styles.suggestionText}>{item.label}</Text>
            </Pressable>
          ))}
          {startCoordinate && endCoordinate ? (
            <Text style={styles.mapHelpText}>
              Estimated distance: ~{directDistanceKm.toFixed(1)} km
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CIRCULAR SETTINGS</Text>
          {goalMode === "time" ? (
            <>
              <View style={styles.row}>
                <InputRow
                  label="Hours"
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="numeric"
                />
                <InputRow
                  label="Minutes"
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="numeric"
                />
              </View>
              <InputRow
                label="Target pace (min/km)"
                value={pace}
                onChangeText={setPace}
                keyboardType={Platform.select({
                  ios: "numbers-and-punctuation",
                  default: "default",
                })}
                error={paceError}
              />
            </>
          ) : (
            <InputRow
              label="Target distance (km)"
              value={distanceKm}
              onChangeText={setDistanceKm}
              keyboardType="decimal-pad"
              error={distanceError}
            />
          )}
        </View>
      )}

      <View style={styles.section}>
        <Pressable onPress={toggleMapPicker} style={styles.mapToggle}>
          <Text style={styles.sectionTitle}>MAP POINTS (MANUAL)</Text>
          <Text style={styles.mapToggleLabel}>
            {isMapPickerOpen ? "Hide" : "Show"}
          </Text>
        </Pressable>

        {isMapPickerOpen ? (
          <>
            <View style={styles.goalRow}>
              <Chip
                label="Pick origin"
                selected={selectingPoint === "start"}
                onPress={() => setSelectingPoint("start")}
                style={{ flex: 1 }}
              />
              {!isCircular ? (
                <Chip
                  label="Pick destination"
                  selected={selectingPoint === "end"}
                  onPress={() => setSelectingPoint("end")}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
            <MapView
              ref={mapRef}
              style={styles.pointPickerMap}
              initialRegion={DEFAULT_REGION}
              onPress={onMapPress}
            >
              {startCoordinate ? (
                <Marker coordinate={startCoordinate} title="Origin" />
              ) : null}
              {!isCircular && endCoordinate ? (
                <Marker coordinate={endCoordinate} title="End" />
              ) : null}
            </MapView>
            <Text style={styles.mapHelpText}>
              Search is primary. Use map to fine-tune points manually.
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SURFACE</Text>
        <View style={styles.chipRow}>
          {["Trail", "Asphalt", "Mixed"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={surface === s}
              onPress={() => setSurface(s)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INTENSITY</Text>
        <View style={styles.chipRow}>
          {["Easy (flatter)", "Balanced", "Hard (hills)"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={intensity === s}
              onPress={() => setIntensity(s)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WAYPOINTS</Text>
        <View style={styles.waypointsBox}>
          <Text style={styles.waypointsEmpty}>No waypoints added</Text>
          <Button
            variant="ghost"
            label="+ Add waypoint"
            onPress={() =>
              Alert.alert("Coming soon", "Waypoint editing is coming soon.")
            }
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Generate route"
          onPress={onGenerate}
          disabled={!isFormValid}
          loading={isGenerating}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 56,
  },
  hero: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  goalRow: {
    flexDirection: "row",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  waypointsBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  waypointsEmpty: {
    color: "#9ca3af",
    fontSize: 14,
  },
  footer: {
    marginTop: 8,
    gap: 12,
  },
  pointPickerMap: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
  },
  mapHelpText: {
    fontSize: 12,
    color: "#6b7280",
  },
  suggestionItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
  },
  suggestionText: {
    fontSize: 13,
    color: "#111827",
  },
  searchHint: {
    fontSize: 12,
    color: "#6b7280",
  },
  mapToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapToggleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
});
