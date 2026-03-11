import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { RouteMapPreview } from "../components/RouteMapPreview";
import { SaveRouteModal } from "../components/SaveRouteModal";
import { exportPolylineAsGpx } from "../lib/gpx";
import type { RoutesStackParamList } from "../navigation/types";
import { useSavedRoutes } from "../providers/SavedRoutesProvider";

type Props = NativeStackScreenProps<RoutesStackParamList, "RouteDetail">;

export function RouteDetailScreen({ navigation, route }: Props) {
  const {
    route: selectedRoute,
    activity,
    surface,
    timeLabel,
  } = route.params;
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { getSavedRouteForCandidate, removeSavedRoute, saveRoute } =
    useSavedRoutes();
  const polyline = (selectedRoute.polyline ?? []).filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );

  const elevationLabel =
    typeof selectedRoute.elevationGainM === "number" &&
    Number.isFinite(selectedRoute.elevationGainM)
      ? `${selectedRoute.elevationGainM} m`
      : "N/A";
  const resolvedTimeLabel =
    timeLabel ??
    (Math.floor(selectedRoute.estimatedDurationMinutes / 60) > 0
      ? `${Math.floor(selectedRoute.estimatedDurationMinutes / 60)}h `
      : "") + `${Math.round(selectedRoute.estimatedDurationMinutes % 60)}m`;
  const savedRoute = getSavedRouteForCandidate(selectedRoute);

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

  const onToggleSaved = async () => {
    try {
      if (savedRoute) {
        setIsSavingRoute(true);
        await removeSavedRoute(savedRoute.id);
        return;
      }
      setShowSaveModal(true);
    } catch (error) {
      Alert.alert(
        "Saved routes",
        error instanceof Error
          ? error.message
          : "Could not update this saved route.",
      );
    } finally {
      setIsSavingRoute(false);
    }
  };

  const onConfirmSave = async (customName: string) => {
    setIsSavingRoute(true);
    try {
      await saveRoute({
        customName,
        route: selectedRoute,
        activity: activity ?? null,
        surface: surface ?? null,
      });
      setShowSaveModal(false);
    } catch (error) {
      Alert.alert(
        "Saved routes",
        error instanceof Error
          ? error.message
          : "Could not save this route right now.",
      );
    } finally {
      setIsSavingRoute(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapCard}>
          <RouteMapPreview polyline={polyline} height={240} interactive />
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
              <Text style={styles.statValue}>{resolvedTimeLabel}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>ELEVATION</Text>
              <Text style={styles.statValue}>{elevationLabel}</Text>
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
            label={savedRoute ? "Remove saved" : "Save"}
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => void onToggleSaved()}
            loading={isSavingRoute}
          />
        </View>
        <SaveRouteModal
          visible={showSaveModal}
          initialValue={selectedRoute.name}
          loading={isSavingRoute}
          onCancel={() => setShowSaveModal(false)}
          onConfirm={(name) => void onConfirmSave(name)}
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
});
