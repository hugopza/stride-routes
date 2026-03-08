import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "../components/Button";
import { RouteCard } from "../components/RouteCard";
import type { RoutesStackParamList } from "../navigation/types";
import { routeGenerationService } from "../services/routeGenerationService";
import type { CandidateRoute } from "../types/route";

type Props = NativeStackScreenProps<RoutesStackParamList, "Results">;

export function ResultsScreen({ navigation, route }: Props) {
  const { params, routes } = route.params;

  const [list, setList] = useState<CandidateRoute[]>(routes);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [generationNonce, setGenerationNonce] = useState(
    params.generationNonce ?? Date.now(),
  );

  useEffect(() => {
    setSelectedRouteId(null);
    setGenerationNonce(params.generationNonce ?? Date.now());
    setList([]);
    const timeout = setTimeout(() => {
      setList(routes);
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    routes,
    params.generationNonce,
    params.surface,
    params.targetDistanceKm,
    params.circular,
    params.goalMode,
    params.paceMinPerKm,
    params.timeMinutes,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Refine</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const onRegenerate = () => {
    const previousList = list;
    const nextGenerationNonce = generationNonce + 1;

    setIsRegenerating(true);
    setSelectedRouteId(null);
    setList([]);
    setGenerationNonce(nextGenerationNonce);

    setTimeout(async () => {
      try {
        setList(
          await routeGenerationService.generateRoutes({
            ...params,
            generationNonce: nextGenerationNonce,
          }),
        );
      } catch {
        setList(previousList);
        Alert.alert("Route error", "Could not regenerate routes right now.");
      } finally {
        setIsRegenerating(false);
      }
    }, 180);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.eyebrow}>GENERATED ROUTES</Text>
          <Text style={styles.title}>{list.length} route{list.length === 1 ? "" : "s"} found</Text>
          <Text style={styles.subtitle}>
            Review alternatives below and open one to see full details.
          </Text>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>
              ~{params.targetDistanceKm.toFixed(1)} km
            </Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>
              {params.goalMode === "distance"
                ? "Distance goal"
                : `~${Math.round(params.timeMinutes ?? 0)} min`}
            </Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterText}>
              {params.paceMinPerKm
                ? `Pace ${params.paceMinPerKm.toFixed(2)}`
                : "Pace optional"}
            </Text>
          </View>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No routes available</Text>
            <Text style={styles.emptyText}>
              Try regenerating with the same inputs.
            </Text>
            <Button
              label="Regenerate"
              variant="outline"
              onPress={onRegenerate}
              loading={isRegenerating}
            />
          </View>
        ) : (
          list.map((candidate, index) => (
            <RouteCard
              key={`${candidate.id}-${index}`}
              route={candidate}
              onPress={() => {
                if (selectedRouteId !== candidate.id) {
                  setSelectedRouteId(candidate.id);
                }
                navigation.navigate("RouteDetail", { route: candidate });
              }}
              tags={
                index === 0
                  ? ["FLATTER", "MIXED"]
                  : index === 1
                    ? ["URBAN"]
                    : []
              }
            />
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Regenerate"
          variant="outline"
          onPress={onRegenerate}
          style={styles.regenerateButton}
          loading={isRegenerating}
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
  summaryCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.4,
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
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#4b5563",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  emptyState: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: "#f9fafb",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
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
