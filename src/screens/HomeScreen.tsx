import { MaterialIcons } from "@expo/vector-icons";
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
import { PlaceAutocompleteField } from "../components/PlaceAutocompleteField";
import { searchPlaces, type PlaceSuggestion } from "../lib/place-search";
import type { RoutesStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { routeGenerationService } from "../services/routeGenerationService";
import type { RouteCoordinate, RouteParams } from "../types/route";

type Props = NativeStackScreenProps<RoutesStackParamList, "Home">;

type RouteParamsWithUi = RouteParams & {
  activity?: "foot" | "road_cycling";
  circular: boolean;
  start?: string;
  end?: string;
  surface: string;
  waypointLabels: string[];
};

type WaypointInput = {
  id: string;
  label: string;
  coordinate?: RouteCoordinate;
};

type MapSelectionMode =
  | { type: "start" }
  | { type: "end" }
  | { type: "waypoint"; waypointId?: string };

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

function parseAverageSpeed(raw: string): number | null {
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

function getStraightLineDistanceKm(points: RouteCoordinate[]): number {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineKm(points[index - 1], points[index]);
  }

  return total;
}

export function HomeScreen({ navigation }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const nonceCounterRef = useRef(0);
  const originSearchRequestRef = useRef(0);
  const destinationSearchRequestRef = useRef(0);
  const touchedDefaultsRef = useRef({
    activity: false,
    routeType: false,
    start: false,
    surface: false,
  });
  const appliedProfileDefaultsRef = useRef<string | null>(null);
  const { profile } = useAuth();

  const [goalMode, setGoalMode] = useState<"time" | "distance">("time");
  const [routeType, setRouteType] = useState<"point_to_point" | "circular">(
    "point_to_point",
  );
  const [activity, setActivity] = useState<"foot" | "road_cycling">("foot");

  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [distanceKm, setDistanceKm] = useState("8");
  const [pace, setPace] = useState("5:30");
  const [averageSpeed, setAverageSpeed] = useState("24");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypointInputs, setWaypointInputs] = useState<WaypointInput[]>([]);
  const [surface, setSurface] = useState("Mixed");
  const [isGenerating, setIsGenerating] = useState(false);

  const [startCoordinate, setStartCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);
  const [endCoordinate, setEndCoordinate] = useState<
    RouteCoordinate | undefined
  >(undefined);

  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<MapSelectionMode>({
    type: "start",
  });
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
  const confirmedWaypointCount = waypointInputs.filter((waypoint) =>
    Boolean(waypoint.coordinate),
  ).length;
  const selectedWaypoint =
    selectionMode.type === "waypoint" && selectionMode.waypointId
      ? waypointInputs.find(
          (waypoint) => waypoint.id === selectionMode.waypointId,
        )
      : undefined;
  const selectedWaypointIsConfirmed = Boolean(selectedWaypoint?.coordinate);
  const selectedWaypointNumber = selectedWaypoint
    ? waypointInputs.findIndex(
        (waypoint) => waypoint.id === selectedWaypoint.id,
      ) + 1
    : null;
  const firstIncompleteWaypointIndex = waypointInputs.findIndex(
    (waypoint) => !waypoint.coordinate,
  );
  const nextWaypointNumber =
    firstIncompleteWaypointIndex >= 0
      ? firstIncompleteWaypointIndex + 1
      : Math.min(waypointInputs.length + 1, 3);
  const profileDefaultsSignature = profile
    ? [
        profile.id,
        profile.updated_at,
        profile.home_location_name ?? "",
        profile.home_lat ?? "",
        profile.home_lng ?? "",
        profile.default_activity ?? "",
        profile.default_surface ?? "",
        profile.default_route_type ?? "",
      ].join(":")
    : null;

  useEffect(() => {
    if (
      !profile ||
      appliedProfileDefaultsRef.current === profileDefaultsSignature
    ) {
      return;
    }

    if (
      !touchedDefaultsRef.current.start &&
      !start.trim() &&
      profile.home_location_name
    ) {
      setStart(profile.home_location_name);
      if (profile.home_lat != null && profile.home_lng != null) {
        setStartCoordinate({
          latitude: profile.home_lat,
          longitude: profile.home_lng,
        });
      }
    }

    if (!touchedDefaultsRef.current.routeType && profile.default_route_type) {
      setRouteType(profile.default_route_type);
    }

    if (!touchedDefaultsRef.current.surface && profile.default_surface) {
      setSurface(
        profile.default_surface.charAt(0).toUpperCase() +
          profile.default_surface.slice(1),
      );
    }

    if (!touchedDefaultsRef.current.activity && profile.default_activity) {
      setActivity(profile.default_activity);
    }

    appliedProfileDefaultsRef.current = profileDefaultsSignature;
  }, [profile, profileDefaultsSignature, start]);

  useEffect(() => {
    if (activity === "road_cycling" && surface !== "Asphalt") {
      setSurface("Asphalt");
    }
  }, [activity, surface]);

  useEffect(() => {
    if (isCircular) {
      setEnd("");
      setEndCoordinate(undefined);
      setDestinationSuggestions([]);
      if (selectionMode.type === "end") {
        setSelectionMode({ type: "start" });
      }
    }
  }, [isCircular, selectionMode]);

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
  const normalizedAverageSpeed = parseAverageSpeed(averageSpeed);
  const normalizedDistance = parseDistance(distanceKm);

  const directDistanceKm =
    startCoordinate &&
    (isCircular || endCoordinate) &&
    waypointInputs.every((waypoint) => waypoint.coordinate)
      ? Math.max(
          0.2,
          getStraightLineDistanceKm([
            startCoordinate,
            ...waypointInputs
              .map((waypoint) => waypoint.coordinate)
              .filter((point): point is RouteCoordinate => Boolean(point)),
            ...(isCircular
              ? [startCoordinate]
              : endCoordinate
                ? [endCoordinate]
                : []),
          ]) * 1.2,
        )
      : 0;

  const targetDistanceKm = isCircular
    ? goalMode === "time"
      ? activity === "road_cycling"
        ? totalMinutes > 0 && normalizedAverageSpeed
          ? (totalMinutes / 60) * normalizedAverageSpeed
          : 0
        : totalMinutes > 0 && normalizedPace
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

  const waypointErrors = waypointInputs.map((waypoint) =>
    submitAttempted && !waypoint.coordinate
      ? "Select a valid waypoint from search results."
      : undefined,
  );

  const paceError =
    submitAttempted &&
    isCircular &&
    activity !== "road_cycling" &&
    goalMode === "time" &&
    normalizedPace === null
      ? "Pace is required. Use mm:ss or decimal format."
      : undefined;

  const averageSpeedError =
    submitAttempted &&
    isCircular &&
    activity === "road_cycling" &&
    goalMode === "time" &&
    normalizedAverageSpeed === null
      ? "Average speed is required and must be greater than 0."
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
      ? activity === "road_cycling"
        ? totalMinutes > 0 && normalizedAverageSpeed !== null
        : totalMinutes > 0 && normalizedPace !== null
      : normalizedDistance !== null;

  const isFormValid =
    Boolean(startCoordinate) &&
    waypointInputs.every((waypoint) => waypoint.coordinate) &&
    (isCircular ? isCircularInputValid : Boolean(endCoordinate));

  const centerMap = () => {
    const selectedWaypoint =
      selectionMode.type === "waypoint" && selectionMode.waypointId
        ? waypointInputs.find(
            (waypoint) => waypoint.id === selectionMode.waypointId,
          )?.coordinate
        : undefined;
    const center =
      selectedWaypoint ?? startCoordinate ?? userLocation ?? DEFAULT_REGION;
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
    touchedDefaultsRef.current.start = true;
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

    if (selectionMode.type === "start") {
      touchedDefaultsRef.current.start = true;
      setStartCoordinate(coordinate);
      setStart(
        `Pinned origin (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`,
      );
      setOriginSuggestions([]);
      return;
    }

    if (selectionMode.type === "end" && !isCircular) {
      setEndCoordinate(coordinate);
      setEnd(
        `Pinned destination (${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)})`,
      );
      setDestinationSuggestions([]);
      return;
    }

    if (selectionMode.type === "waypoint") {
      const nextWaypointId =
        selectionMode.waypointId ??
        waypointInputs.find((waypoint) => !waypoint.coordinate)?.id;

      if (!nextWaypointId) {
        if (waypointInputs.length >= 3) {
          Alert.alert(
            "Waypoints",
            "You can add up to 3 waypoints in this MVP.",
          );
          return;
        }

        const nextIndex = waypointInputs.length + 1;
        setWaypointInputs((current) => [
          ...current,
          {
            id: `waypoint-${Date.now()}-${nextIndex}`,
            coordinate,
            label: `Pinned waypoint ${nextIndex} (${coordinate.latitude.toFixed(
              5,
            )}, ${coordinate.longitude.toFixed(5)})`,
          },
        ]);
        return;
      }

      setWaypointInputs((current) =>
        current.map((waypoint, index) =>
          waypoint.id === nextWaypointId
            ? {
                ...waypoint,
                coordinate,
                label:
                  waypoint.label ||
                  `Pinned waypoint ${index + 1} (${coordinate.latitude.toFixed(
                    5,
                  )}, ${coordinate.longitude.toFixed(5)})`,
              }
            : waypoint,
        ),
      );
      return;
    }
  };

  const onAddWaypoint = (openMap = false) => {
    const existingDraft = waypointInputs.find(
      (waypoint) => !waypoint.coordinate,
    );
    if (existingDraft) {
      if (openMap) {
        setSelectionMode({ type: "waypoint", waypointId: existingDraft.id });
        setIsMapPickerOpen(true);
        setTimeout(centerMap, 200);
      }
      return;
    }

    if (openMap) {
      setSelectionMode({ type: "waypoint" });
      setIsMapPickerOpen(true);
      setTimeout(centerMap, 200);
      return;
    }

    if (waypointInputs.length >= 3) {
      Alert.alert("Waypoints", "You can add up to 3 waypoints in this MVP.");
      return;
    }

    const nextWaypoint = {
      id: `waypoint-${Date.now()}-${waypointInputs.length + 1}`,
      label: "",
    };

    setWaypointInputs((current) => [...current, nextWaypoint]);
  };

  const onWaypointLabelChange = (waypointId: string, label: string) => {
    setWaypointInputs((current) =>
      current.map((waypoint) =>
        waypoint.id === waypointId
          ? { ...waypoint, label, coordinate: undefined }
          : waypoint,
      ),
    );
  };

  const onWaypointSelect = (
    waypointId: string,
    suggestion: PlaceSuggestion,
  ) => {
    setWaypointInputs((current) =>
      current.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              label: suggestion.label,
              coordinate: suggestion.coordinate,
            }
          : waypoint,
      ),
    );
  };

  const onRemoveWaypoint = (waypointId: string) => {
    setWaypointInputs((current) =>
      current.filter((waypoint) => waypoint.id !== waypointId),
    );
    if (
      selectionMode.type === "waypoint" &&
      selectionMode.waypointId === waypointId
    ) {
      setSelectionMode({ type: "waypoint" });
    }
  };

  const onEditWaypointOnMap = (waypointId: string) => {
    setSelectionMode({ type: "waypoint", waypointId });
    if (!isMapPickerOpen) {
      setIsMapPickerOpen(true);
      setTimeout(centerMap, 200);
    } else {
      setTimeout(centerMap, 100);
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
      activity,
      goalMode,
      timeMinutes: isCircular && goalMode === "time" ? totalMinutes : undefined,
      paceMinPerKm:
        activity === "road_cycling"
          ? normalizedAverageSpeed
            ? 60 / normalizedAverageSpeed
            : undefined
          : (normalizedPace ?? undefined),
      targetDistanceKm,
      generationNonce,
      circular: isCircular,
      startCoordinate,
      endCoordinate: isCircular ? undefined : endCoordinate,
      start: start.trim() || undefined,
      end: !isCircular ? end.trim() || undefined : undefined,
      waypoints: waypointInputs
        .map((waypoint) => waypoint.coordinate)
        .filter((point): point is RouteCoordinate => Boolean(point)),
      surface,
      waypointLabels: waypointInputs.map((waypoint) => waypoint.label),
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
            onPress={() => {
              touchedDefaultsRef.current.routeType = true;
              setRouteType("point_to_point");
            }}
            style={{ flex: 1 }}
          />
          <Chip
            label="Circular"
            selected={isCircular}
            onPress={() => {
              touchedDefaultsRef.current.routeType = true;
              setRouteType("circular");
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVITY</Text>
        <View style={styles.goalRow}>
          <Chip
            label="Foot"
            selected={activity === "foot"}
            onPress={() => {
              touchedDefaultsRef.current.activity = true;
              setActivity("foot");
            }}
            style={{ flex: 1 }}
            leftAccessory={
              <MaterialIcons
                name="directions-walk"
                size={20}
                color={activity === "foot" ? "#fff" : "#111827"}
              />
            }
          />
          <Chip
            label="Road cycling"
            selected={activity === "road_cycling"}
            onPress={() => {
              touchedDefaultsRef.current.activity = true;
              setActivity("road_cycling");
            }}
            style={{ flex: 1 }}
            leftAccessory={
              <MaterialIcons
                name="directions-bike"
                size={20}
                color={activity === "road_cycling" ? "#fff" : "#111827"}
              />
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ORIGIN</Text>
        <InputRow
          containerStyle={{ flex: 1 }}
          placeholder="Search address, city, postcode, POI..."
          value={start}
          onChangeText={(text) => {
            touchedDefaultsRef.current.start = true;
            setStart(text);
            setStartCoordinate(undefined);
          }}
          error={originError}
          rightAccessory={
            <MaterialIcons name="location-on" size={20} color="#9ca3af" />
          }
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
            containerStyle={{ flex: 1 }}
            placeholder="Search destination..."
            value={end}
            onChangeText={(text) => {
              setEnd(text);
              setEndCoordinate(undefined);
            }}
            error={destinationError}
            rightAccessory={
              <MaterialIcons name="location-on" size={20} color="#9ca3af" />
            }
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
                  containerStyle={{ flex: 1 }}
                  label="Hours"
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="numeric"
                />
                <InputRow
                  containerStyle={{ flex: 1 }}
                  label="Minutes"
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="numeric"
                />
              </View>
              <InputRow
                containerStyle={{ flex: 1 }}
                label={
                  activity === "road_cycling"
                    ? "Average speed (km/h)"
                    : "Target pace (min/km)"
                }
                placeholder={
                  activity === "road_cycling" ? "e.g. 24" : undefined
                }
                hint={
                  activity === "road_cycling"
                    ? "Used to estimate distance from available time."
                    : undefined
                }
                value={activity === "road_cycling" ? averageSpeed : pace}
                onChangeText={
                  activity === "road_cycling" ? setAverageSpeed : setPace
                }
                keyboardType={
                  activity === "road_cycling"
                    ? "decimal-pad"
                    : Platform.select({
                        ios: "numbers-and-punctuation",
                        default: "default",
                      })
                }
                error={
                  activity === "road_cycling" ? averageSpeedError : paceError
                }
              />
            </>
          ) : (
            <InputRow
              containerStyle={{ flex: 1 }}
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
                selected={selectionMode.type === "start"}
                onPress={() => setSelectionMode({ type: "start" })}
                style={{ flex: 1 }}
              />
              {!isCircular ? (
                <Chip
                  label="Pick destination"
                  selected={selectionMode.type === "end"}
                  onPress={() => setSelectionMode({ type: "end" })}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Chip
                label={
                  selectedWaypointIsConfirmed
                    ? `Waypoint ${selectedWaypointNumber}`
                    : confirmedWaypointCount === 0
                      ? "Add waypoint"
                      : "Waypoints"
                }
                selected={selectionMode.type === "waypoint"}
                onPress={() => setSelectionMode({ type: "waypoint" })}
                style={{ flex: 1 }}
              />
            </View>
            <View style={styles.mapModeBanner}>
              <MaterialIcons name="touch-app" size={16} color="#4b5563" />
              <Text style={styles.mapModeText}>
                {selectionMode.type === "start"
                  ? "Tap the map to place the origin."
                  : selectionMode.type === "end"
                    ? "Tap the map to place the destination."
                    : selectedWaypointIsConfirmed
                      ? "Tap the map to update this waypoint."
                      : confirmedWaypointCount === 0
                        ? "Tap the map to add your first waypoint."
                        : `Tap the map to add waypoint ${nextWaypointNumber}.`}
              </Text>
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
              {waypointInputs.map((waypoint, index) =>
                waypoint.coordinate ? (
                  <Marker
                    key={waypoint.id}
                    coordinate={waypoint.coordinate}
                    title={`Waypoint ${index + 1}`}
                    description={waypoint.label || "Pass-through point"}
                  >
                    <View style={styles.waypointMarker}>
                      <Text style={styles.waypointMarkerText}>{index + 1}</Text>
                    </View>
                  </Marker>
                ) : null,
              )}
            </MapView>
            <Text style={styles.mapHelpText}>
              Use the map to add or adjust points quickly.
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SURFACE</Text>
        {activity === "road_cycling" ? (
          <View style={styles.chipRow}>
            {["Asphalt"].map((s) => (
              <Chip
                key={s}
                label={s}
                selected={surface === s}
                onPress={() => {
                  touchedDefaultsRef.current.surface = true;
                  setSurface(s);
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.chipRow}>
            {["Trail", "Asphalt", "Mixed"].map((s) => (
              <Chip
                key={s}
                label={s}
                selected={surface === s}
                onPress={() => {
                  touchedDefaultsRef.current.surface = true;
                  setSurface(s);
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WAYPOINTS</Text>
        <View style={styles.waypointsBox}>
          {waypointInputs.length === 0 ? (
            <Text style={styles.waypointsEmpty}>
              Add waypoints from the map to force the route through places you
              care about.
            </Text>
          ) : (
            <View style={styles.waypointList}>
              {waypointInputs.map((waypoint, index) => (
                <View key={waypoint.id} style={styles.waypointItem}>
                  <View style={styles.waypointItemHeader}>
                    <View style={styles.waypointBadge}>
                      <Text style={styles.waypointBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.waypointInfo}>
                      <Text
                        style={styles.waypointTitle}
                      >{`Waypoint ${index + 1}`}</Text>
                      <Text style={styles.waypointLabelText}>
                        {waypoint.label || "Pick on map or search below"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.waypointActions}>
                    <Button
                      label="Set on map"
                      variant="outline"
                      onPress={() => onEditWaypointOnMap(waypoint.id)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Remove"
                      variant="ghost"
                      onPress={() => onRemoveWaypoint(waypoint.id)}
                    />
                  </View>
                  <PlaceAutocompleteField
                    label="Search instead"
                    placeholder="Search waypoint..."
                    value={waypoint.label}
                    selectedCoordinate={waypoint.coordinate}
                    error={waypointErrors[index]}
                    onChangeText={(text) =>
                      onWaypointLabelChange(waypoint.id, text)
                    }
                    onSelectSuggestion={(suggestion) =>
                      onWaypointSelect(waypoint.id, suggestion)
                    }
                  />
                </View>
              ))}
            </View>
          )}
          <View style={styles.waypointFooterActions}>
            <Button
              variant="outline"
              label="+ Add from map"
              onPress={() => onAddWaypoint(true)}
              style={{ flex: 1 }}
            />
            <Button
              variant="ghost"
              label="+ Search"
              onPress={() => onAddWaypoint(false)}
            />
          </View>
          {waypointInputs.length > 0 ? (
            <Text style={styles.waypointFootnote}>
              {isCircular
                ? "The route will pass through these points in order before returning to the start."
                : "The route will pass through these points in order before reaching the destination."}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Generate your route"
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
  lockedField: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  lockedFieldText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  waypointsBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 16,
    alignItems: "stretch",
    gap: 12,
  },
  waypointHeader: {
    gap: 4,
  },
  waypointSummary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  waypointSummaryHint: {
    fontSize: 12,
    color: "#6b7280",
  },
  waypointsEmpty: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  waypointList: {
    width: "100%",
    gap: 12,
  },
  waypointItem: {
    gap: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  waypointItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  waypointBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  waypointBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  waypointInfo: {
    flex: 1,
    gap: 2,
  },
  waypointTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  waypointLabelText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  waypointActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  waypointFooterActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  waypointFootnote: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
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
  mapModeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
  },
  mapModeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#4b5563",
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
  waypointMarker: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  waypointMarkerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
});
