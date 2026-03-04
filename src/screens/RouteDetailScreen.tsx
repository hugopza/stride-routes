import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import type { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "RouteDetail">;

export function RouteDetailScreen({ navigation, route }: Props) {
  const { route: selectedRoute } = route.params;
  const [feedback, setFeedback] = useState<string[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: selectedRoute.name,
      headerRight: () => (
        <Pressable
          onPress={() => Alert.alert("Share", "Sharing route...")}
          style={{ paddingLeft: 10 }}
        >
          <Text style={{ fontSize: 20 }}>🔗</Text>
        </Pressable>
      ),
    });
  }, [navigation, selectedRoute.name]);

  const toggleFeedback = (f: string) => {
    if (feedback.includes(f)) {
      setFeedback(feedback.filter((item) => item !== f));
    } else {
      setFeedback([...feedback, f]);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapText}>Map placeholder</Text>
            {/* Simple lines just for wireframe parity effect */}
            <View style={styles.fakeLine1} />
            <View style={styles.fakeLine2} />
            <View style={styles.fakePointStart} />
            <View style={styles.fakePointEnd} />
          </View>
          <View style={styles.mapChips}>
            <View style={styles.mapChip}>
              <Text style={styles.mapChipText}>START</Text>
            </View>
            <View style={styles.mapChip}>
              <Text style={styles.mapChipText}>END</Text>
            </View>
          </View>
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
          label="↓ Download GPX"
          onPress={() => Alert.alert("Download GPX", "GPX export coming soon.")}
          style={styles.actionButton}
        />

        <View style={styles.secondaryActions}>
          <Button
            label="♥ Save"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => Alert.alert("Save", "Saved.")}
          />
          <Button
            label="↗ Start"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => Alert.alert("Start", "Navigation started.")}
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

      {/* Fake Bottom Tab Bar purely for visual matching of the wireframe */}
      <View style={styles.fakeTabBar}>
        <View style={styles.tabItem}>
          <Text style={styles.tabIconActive}>🧭</Text>
          <Text style={styles.tabTextActive}>Explore</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>🔀</Text>
          <Text style={styles.tabText}>Routes</Text>
        </View>
        <View style={styles.tabItem}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabText}>Profile</Text>
        </View>
      </View>
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
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mapText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
    zIndex: 10,
  },
  fakeLine1: {
    position: "absolute",
    width: 60,
    height: 4,
    backgroundColor: "#cbd5e1",
    transform: [{ rotate: "45deg" }],
    left: "35%",
    top: "40%",
  },
  fakeLine2: {
    position: "absolute",
    width: 100,
    height: 4,
    backgroundColor: "#cbd5e1",
    transform: [{ rotate: "-45deg" }],
    left: "45%",
    top: "35%",
  },
  fakePointStart: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#94a3b8",
    left: "25%",
    top: "55%",
  },
  fakePointEnd: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#94a3b8",
    right: "25%",
    top: "15%",
  },
  mapChips: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  mapChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mapChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
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
  submitFeedback: {
    marginBottom: 16,
  },
  fakeTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  tabItem: {
    alignItems: "center",
  },
  tabIconActive: {
    fontSize: 20,
    color: "#111827",
  },
  tabTextActive: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
});
