import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { CandidateRoute } from "../types/route";
import { Button } from "./Button";
import { RouteMapPreview } from "./RouteMapPreview";

interface RouteCardProps {
  route: CandidateRoute;
  onPress: () => void;
  tags?: string[];
  showMap?: boolean;
  location?: string;
  isSaved?: boolean;
  onToggleSaved?: () => void;
  isSaveLoading?: boolean;
  title?: string;
  timeLabel?: string;
}

export function RouteCard({
  route,
  onPress,
  tags,
  showMap = true,
  location,
  isSaved,
  onToggleSaved,
  isSaveLoading,
  title,
  timeLabel,
}: RouteCardProps) {
  const elevationLabel =
    typeof route.elevationGainM === "number" &&
    Number.isFinite(route.elevationGainM)
      ? `+${route.elevationGainM} m`
      : "N/A";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {showMap ? (
        <View style={styles.mapContainer}>
          <RouteMapPreview polyline={route.polyline ?? []} height={140} />
        </View>
      ) : null}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.name}>{title ?? route.name}</Text>
            {location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color="#6b7280" />
                <Text style={styles.location}>{location}</Text>
              </View>
            ) : null}
          </View>
          {isSaved !== undefined ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onToggleSaved?.();
              }}
              disabled={!onToggleSaved || isSaveLoading}
              hitSlop={8}
            >
              {isSaveLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Ionicons
                  name={isSaved ? "star" : "star-outline"}
                  size={24}
                  color={isSaved ? "#111827" : "#d1d5db"}
                />
              )}
            </Pressable>
          ) : (
            <Text style={styles.star}>*</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>{route.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={styles.statValue}>
              {timeLabel ?? `${route.estimatedDurationMinutes} min`}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>ELEV.</Text>
            <Text style={styles.statValue}>{elevationLabel}</Text>
          </View>
        </View>

        {tags && tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Button label="View Details" onPress={onPress} style={styles.button} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 16,
  },
  mapContainer: {
    height: 140,
    backgroundColor: "#f3f4f6",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: "#6b7280",
  },
  star: {
    fontSize: 20,
    color: "#d1d5db",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
    letterSpacing: 0.5,
  },
  button: {
    paddingVertical: 12,
    backgroundColor: "#111827",
    elevation: 0,
    shadowOpacity: 0,
  },
});
