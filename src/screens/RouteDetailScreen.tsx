import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { exportPolylineAsGpx } from "../lib/gpx";
import type { RoutesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RoutesStackParamList, "RouteDetail">;

export function RouteDetailScreen({ navigation, route }: Props) {
  const { route: selectedRoute } = route.params;
  const [feedback, setFeedback] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const polyline = selectedRoute.polyline ?? [];
  const start = polyline[0];
  const end = polyline[polyline.length - 1];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: selectedRoute.name,
      headerRight: () => (
        <Pressable
          onPress={() => Alert.alert("Share", "Sharing route...")}
          style={{ paddingLeft: 10 }}
        >
          <Text style={{ fontSize: 20 }}>Share</Text>
        </Pressable>
      ),
    });
  }, [navigation, selectedRoute.name]);

  useEffect(() => {
    if (polyline.length < 2) {
      return;
    }

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(polyline, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }, 120);

    return () => clearTimeout(timeout);
  }, [polyline]);

  const toggleFeedback = (f: string) => {
    if (feedback.includes(f)) {
      setFeedback(feedback.filter((item) => item !== f));
    } else {
      setFeedback([...feedback, f]);
    }
  };

  const onExportGpx = async () => {
    if (polyline.length < 2) {
      Alert.alert("Export GPX", "This route cannot be exported yet.");
      return;
    }

    try {
      setIsExporting(true);
      await exportPolylineAsGpx(selectedRoute.name, polyline);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to export GPX. Please try again.";
      Alert.alert("Export GPX", message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapCard}>
          {polyline.length > 1 ? (
            <MapView ref={mapRef} style={styles.map}>
              <Polyline
                coordinates={polyline}
                strokeColor="#0f172a"
                strokeWidth={4}
              />
              {start ? <Marker coordinate={start} title="Start" /> : null}
              {end ? <Marker coordinate={end} title="End" /> : null}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>Route preview unavailable</Text>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>
                {selectedRoute.distanceKm.toFixed(1)} km
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValue}>
                {Math.floor(selectedRoute.estimatedDurationMinutes / 60) > 0
                  ? `${Math.floor(selectedRoute.estimatedDurationMinutes / 60)}h `
                  : ""}
                {Math.round(selectedRoute.estimatedDurationMinutes % 60)}m
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>ELEVATION</Text>
              <Text style={styles.statValue}>
                {selectedRoute.elevationGainM} m
              </Text>
            </View>
          </View>
          <Text style={styles.surfaceText}>Surface estimate: Mixed</Text>
        </View>

        <Button
          label="Download GPX"
          onPress={onExportGpx}
          loading={isExporting}
          style={styles.actionButton}
        />

        <View style={styles.secondaryActions}>
          <Button
            label="Save"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => Alert.alert("Save", "Saved.")}
          />
        </View>

        <Text style={styles.feedbackTitle}>FEEDBACK AFTER RUN</Text>

        <View style={styles.feedbackChips}>
          {["Too hilly", "Too much traffic", "Too long/short", "Loved it"].map(
            (f) => (
              <Chip
                key={f}
                label={f}
                selected={feedback.includes(f)}
                onPress={() => toggleFeedback(f)}
                style={styles.feedbackChip}
              />
            ),
          )}
        </View>

        <Button
          label="Submit feedback"
          variant="outline"
          style={{ backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }}
          onPress={() => Alert.alert("Feedback", "Submitted.")}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  mapCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    height: 240,
    width: "100%",
  },
  mapPlaceholder: {
    height: 240,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  mapText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
  },
  statsCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCol: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    height: "100%",
  },
  surfaceText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
  },
  actionButton: {
    marginBottom: 12,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  feedbackChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  feedbackChip: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 20,
  },
});
