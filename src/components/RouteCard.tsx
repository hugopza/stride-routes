import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CandidateRoute } from "../types/route";
import { Button } from "./Button";

interface RouteCardProps {
  route: CandidateRoute;
  onPress: () => void;
  tags?: string[];
}

export function RouteCard({ route, onPress, tags }: RouteCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Map Preview</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{route.name}</Text>
          <Text style={styles.star}>★</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{route.distanceKm} km</Text>
          <Text style={styles.statDot}>•</Text>
          <Text style={styles.stat}>{route.estimatedDurationMinutes} min</Text>
          <Text style={styles.statDot}>•</Text>
          <Text style={styles.stat}>+{route.elevationGainM} m</Text>
        </View>

        {tags && tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        )}

        <Button label="View details" onPress={onPress} style={styles.button} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
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
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mapText: {
    color: "#9ca3af",
    fontWeight: "600",
    position: "absolute",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  star: {
    fontSize: 20,
    color: "#d1d5db",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stat: {
    fontSize: 14,
    color: "#4b5563",
  },
  statDot: {
    fontSize: 14,
    color: "#9ca3af",
    marginHorizontal: 6,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4b5563",
    letterSpacing: 0.5,
  },
  button: {
    paddingVertical: 12,
  },
});
