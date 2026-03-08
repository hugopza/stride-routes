import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { InputRow } from "../components/InputRow";
import { searchPlaces, type PlaceSuggestion } from "../lib/place-search";
import type { RootTabParamList } from "../navigation/types";
import { routeGenerationService } from "../services/routeGenerationService";
import type { RouteCoordinate, RouteParams } from "../types/route";

type Props = BottomTabScreenProps<RootTabParamList, "Explore">;

type RouteParamsWithUi = RouteParams & {
  circular: boolean;
  start?: string;
  end?: string;
  surface: string;
  intensity: string;
  safety: string;
  waypoints: string[];
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

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseDistance(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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
  const [goalMode, setGoalMode] = useState<"time" | "distance">("time");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [distanceKm, setDistanceKm] = useState("8");
  const [pace, setPace] = useState("5:30");
  const [isCircular, setIsCircular] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints] = useState<string[]>([]);
  const [surface, setSurface] = useState("Mixed");
  const [intensity, setIntensity] = useState("Balanced");
  const [safety, setSafety] = useState("Safer streets");
  const [isGenerating, setIsGenerating] = useState(false);
  const [startCoordinate, setStartCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);
  const [endCoordinate, setEndCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);
  const [selectingPoint, setSelectingPoint] = useState<"start" | "end">(
    "start",
  );
  const [destinationMode, setDestinationMode] = useState<"direct" | "longer">(
    "direct",
  );
  const [extraDistanceKm, setExtraDistanceKm] = useState("2");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = start.trim();
      if (query.length < 3) {
        setOriginSuggestions([]);
        setIsSearchingOrigin(false);
        return;
      }

      setIsSearchingOrigin(true);
      const results = await searchPlaces(query);
      setOriginSuggestions(results);
      setIsSearchingOrigin(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [start]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = end.trim();
      if (query.length < 3) {
        setDestinationSuggestions([]);
        setIsSearchingDestination(false);
        return;
      }

      setIsSearchingDestination(true);
      const results = await searchPlaces(query);
      setDestinationSuggestions(results);
      setIsSearchingDestination(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [end]);

  useEffect(() => {
    if (isCircular) {
      setEnd("");
      setEndCoordinate(undefined);
      setDestinationSuggestions([]);
    }
  }, [isCircular]);

  const parsedHours = Number(hours) || 0;
  const parsedMinutes = Number(minutes) || 0;
  const totalMinutes = parsedHours * 60 + parsedMinutes;
  const normalizedPace = parsePace(pace);
  const normalizedDistance = parseDistance(distanceKm);

  const isTimeMode = goalMode === "time";
  const isTimeValid = totalMinutes > 0 && normalizedPace !== null;
  const isDistanceValid = normalizedDistance !== null;
  const destinationRequested = end.trim().length > 0;
  const hasDestination = destinationRequested && Boolean(endCoordinate);

  const baseDirectDistanceKm =
    startCoordinate && endCoordinate
      ? Math.max(0.2, haversineKm(startCoordinate, endCoordinate) * 1.2)
      : 0;
  const parsedExtraDistanceKm = parseDistance(extraDistanceKm);

  const targetDistanceKm = hasDestination
    ? destinationMode === "longer"
      ? baseDirectDistanceKm + (parsedExtraDistanceKm ?? 0)
      : baseDirectDistanceKm
    : isTimeMode
      ? isTimeValid && normalizedPace
        ? totalMinutes / normalizedPace
        : 0
      : (normalizedDistance ?? 0);

  const distanceHint =
    !destinationRequested && isTimeMode && targetDistanceKm > 0
      ? `Estimated distance: ~${targetDistanceKm.toFixed(1)} km`
      : undefined;

  const paceError =
    !destinationRequested && isTimeMode
      ? normalizedPace === null
        ? "Pace is required. Use mm:ss or decimal format (e.g. 5:30, 5.5, 5,5)."
        : undefined
      : pace.trim().length > 0 && normalizedPace === null
        ? "Invalid pace. Use mm:ss or decimal format."
        : undefined;

  const distanceError =
    !destinationRequested && !isTimeMode && !isDistanceValid
      ? "Distance must be greater than 0."
      : undefined;

  const originError =
    submitAttempted && !startCoordinate
      ? "Origin is required. Select from search results or map."
      : undefined;

  const destinationError =
    submitAttempted && destinationRequested && !endCoordinate
      ? "Destination text was provided, but no destination point was selected."
      : undefined;

  const extraDistanceError =
    submitAttempted &&
    hasDestination &&
    destinationMode === "longer" &&
    parsedExtraDistanceKm === null
      ? "Extra distance must be greater than 0."
      : undefined;

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
      console.log("[routing-ui] origin-picked-map", coordinate);
      return;
    }

    setEndCoordinate(coordinate);
    setEnd(
      `Pinned destination (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`,
    );
    setDestinationSuggestions([]);
    console.log("[routing-ui] destination-picked-map", coordinate);
  };

  const isGeneratedFlowValid = isTimeMode ? isTimeValid : isDistanceValid;
  const isDestinationFlowValid =
    hasDestination &&
    (destinationMode === "direct" || parsedExtraDistanceKm !== null);

  const isFormValid =
    Boolean(startCoordinate) &&
    (destinationRequested ? isDestinationFlowValid : isGeneratedFlowValid);

  const onGenerate = () => {
    setSubmitAttempted(true);

    if (!isFormValid) {
      Alert.alert("Invalid input", "Please fix the highlighted fields.");
      return;
    }

    const params: RouteParamsWithUi = {
      goalMode,
      timeMinutes: destinationRequested
        ? totalMinutes > 0
          ? totalMinutes
          : undefined
        : isTimeMode
          ? totalMinutes
          : normalizedDistance && normalizedPace
            ? Math.round(normalizedDistance * normalizedPace)
            : undefined,
      paceMinPerKm: normalizedPace ?? undefined,
      targetDistanceKm,
      circular: destinationRequested ? false : isCircular,
      startCoordinate,
      endCoordinate: destinationRequested ? endCoordinate : undefined,
      start: start.trim() || undefined,
      end: destinationRequested ? end.trim() || undefined : undefined,
      surface,
      intensity,
      safety,
      waypoints,
    };

    console.log("[routing-ui] generate", {
      destinationRequested,
      startCoordinate: params.startCoordinate,
      endCoordinate: params.endCoordinate,
      circular: params.circular,
      targetDistanceKm: params.targetDistanceKm,
    });

    setIsGenerating(true);

    setTimeout(async () => {
      try {
        const routes = await routeGenerationService.generateRoutes(params);

        navigation.navigate("Routes", {
          screen: "Results",
          params: { params, routes },
        });
      } catch {
        Alert.alert("Route error", "Could not generate routes right now.");
      } finally {
        setIsGenerating(false);
      }
    }, 180);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GOAL</Text>
        <View style={styles.goalRow}>
          <Chip
            label="By time"
            selected={isTimeMode}
            onPress={() => setGoalMode("time")}
            style={{ flex: 1 }}
          />
          <Chip
            label="By distance"
            selected={!isTimeMode}
            onPress={() => setGoalMode("distance")}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DESTINATION (OPTIONAL)</Text>
        <InputRow
          placeholder="Search destination or leave empty"
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MAP POINTS (MANUAL)</Text>
        <View style={styles.goalRow}>
          <Chip
            label="Pick origin"
            selected={selectingPoint === "start"}
            onPress={() => setSelectingPoint("start")}
            style={{ flex: 1 }}
          />
          <Chip
            label="Pick destination"
            selected={selectingPoint === "end"}
            onPress={() => setSelectingPoint("end")}
            style={{ flex: 1 }}
          />
        </View>
        <MapView
          style={styles.pointPickerMap}
          initialRegion={{
            latitude: 40.4168,
            longitude: -3.7038,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
          onPress={onMapPress}
        >
          {startCoordinate ? (
            <Marker coordinate={startCoordinate} title="Origin" />
          ) : null}
          {endCoordinate ? (
            <Marker coordinate={endCoordinate} title="End" />
          ) : null}
        </MapView>
        <Text style={styles.mapHelpText}>
          Tap map to set {selectingPoint === "start" ? "origin" : "destination"}
          .
        </Text>
      </View>

      {!destinationRequested ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ROUTE TYPE</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Circular route</Text>
              <Switch
                value={isCircular}
                onValueChange={setIsCircular}
                trackColor={{ true: "#111827" }}
              />
            </View>
          </View>

          {isTimeMode ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TIME & PACE</Text>
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
                hint={distanceHint}
                error={paceError}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DISTANCE</Text>
              <InputRow
                label="Distance (km)"
                value={distanceKm}
                onChangeText={setDistanceKm}
                keyboardType="decimal-pad"
                error={distanceError}
              />
            </View>
          )}
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESTINATION ROUTING</Text>
          <View style={styles.goalRow}>
            <Chip
              label="Direct"
              selected={destinationMode === "direct"}
              onPress={() => setDestinationMode("direct")}
              style={{ flex: 1 }}
            />
            <Chip
              label="Longer route"
              selected={destinationMode === "longer"}
              onPress={() => setDestinationMode("longer")}
              style={{ flex: 1 }}
            />
          </View>
          <Text style={styles.mapHelpText}>
            {hasDestination
              ? `Direct estimate: ~${baseDirectDistanceKm.toFixed(1)} km`
              : "Select destination to estimate route distance."}
          </Text>
          {destinationMode === "longer" ? (
            <InputRow
              label="Extra distance (km)"
              value={extraDistanceKm}
              onChangeText={setExtraDistanceKm}
              keyboardType="decimal-pad"
              error={extraDistanceError}
            />
          ) : null}

          <Text style={styles.sectionTitle}>TIME & PACE (OPTIONAL)</Text>
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
            label="Pace (optional)"
            value={pace}
            onChangeText={setPace}
            keyboardType={Platform.select({
              ios: "numbers-and-punctuation",
              default: "default",
            })}
            error={paceError}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SAFETY</Text>
        <View style={styles.chipRow}>
          {["Safer streets", "Normal"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={safety === s}
              onPress={() => setSafety(s)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <Text style={styles.hintText}>Safer may reduce options</Text>
      </View>

      <View style={styles.footer}>
        <Button
          label="Generate routes"
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
    paddingBottom: 40,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#111827",
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
  hintText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: -4,
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
});
