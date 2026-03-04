import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/Button";
import { RouteCard } from "../components/RouteCard";
import type { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

export function ResultsScreen({ navigation, route }: Props) {
  const { params, routes } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>≡ Refine</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{routes.length} routes found</Text>

        <View style={styles.filterRow}>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>~{params.timeMinutes} min</Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>Mixed</Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>Circular</Text>
          </View>
        </View>

        {routes.map((candidate, index) => (
          <RouteCard
            key={candidate.id}
            route={candidate}
            onPress={() =>
              navigation.navigate("RouteDetail", { route: candidate })
            }
            tags={
              index === 0 ? ["FLATTER", "MIXED"] : index === 1 ? ["URBAN"] : []
            }
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="↻ Regenerate"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.regenerateButton}
        />
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
    paddingBottom: 100,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  regenerateButton: {
    backgroundColor: "#f9fafb",
  },
});
