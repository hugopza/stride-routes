import { MaterialIcons } from "@expo/vector-icons";
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
import { SaveRouteModal } from "../components/SaveRouteModal";
import type { RoutesStackParamList } from "../navigation/types";
import { useSavedRoutes } from "../providers/SavedRoutesProvider";
import { routeGenerationService } from "../services/routeGenerationService";
import type { CandidateRoute } from "../types/route";
import type { SavedRouteSurface } from "../types/saved-route";

type Props = NativeStackScreenProps<RoutesStackParamList, "Results">;

export function ResultsScreen({ navigation, route }: Props) {
  const { params, routes } = route.params;
  const { getSavedRouteForCandidate, removeSavedRoute, saveRoute } =
    useSavedRoutes();

  const [list, setList] = useState<CandidateRoute[]>(routes);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generationNonce, setGenerationNonce] = useState(
    params.generationNonce ?? Date.now(),
  );
  const [routeToSave, setRouteToSave] = useState<CandidateRoute | null>(null);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null);

  useEffect(() => {
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
      headerBackVisible: false,
      headerLeft: () => null,
      headerRight: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Refine </Text>
          <MaterialIcons name="manage-search" size={18} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const onRegenerate = () => {
    const previousList = list;
    const nextGenerationNonce = generationNonce + 1;

    setIsRegenerating(true);
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
      } catch (error) {
        setList(previousList);
        const message =
          error instanceof Error
            ? error.message
            : "Could not regenerate routes right now.";
        Alert.alert("Route error", message);
      } finally {
        setIsRegenerating(false);
      }
    }, 180);
  };

  const normalizedSurface =
    params.surface === "asphalt" ||
    params.surface === "mixed" ||
    params.surface === "trail"
      ? (params.surface as SavedRouteSurface)
      : null;

  const onToggleSaved = async (candidate: CandidateRoute, index: number) => {
    const existing = getSavedRouteForCandidate(candidate);

    try {
      if (existing) {
        setSavingRouteId(candidate.id);
        await removeSavedRoute(existing.id);
        return;
      }

      setRouteToSave({ ...candidate, name: `Route ${index + 1}` });
    } catch (error) {
      Alert.alert(
        "Saved routes",
        error instanceof Error
          ? error.message
          : "Could not update this saved route.",
      );
      setSavingRouteId(null);
    }
  };

  const onConfirmSave = async (customName: string) => {
    if (!routeToSave) {
      return;
    }

    setIsSavingRoute(true);
    try {
      await saveRoute({
        customName,
        route: routeToSave,
        surface: normalizedSurface,
      });
      setRouteToSave(null);
    } catch (error) {
      Alert.alert(
        "Saved routes",
        error instanceof Error
          ? error.message
          : "Could not save this route right now.",
      );
    } finally {
      setIsSavingRoute(false);
      setSavingRouteId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            title={`Route ${index + 1}`}
            timeLabel={params.goalMode === "time" ? undefined : "N/A"}
            isSaved={Boolean(getSavedRouteForCandidate(candidate))}
            onToggleSaved={() => void onToggleSaved(candidate, index)}
            isSaveLoading={savingRouteId === candidate.id}
            onPress={() => {
              navigation.navigate("RouteDetail", {
                route: candidate,
                surface: normalizedSurface,
              });
            }}
            tags={
              index === 0 ? ["FLATTER", "MIXED"] : index === 1 ? ["URBAN"] : []
            }
          />
        ))
      )}
      <View style={styles.footer}>
        <Button
          label="Regenerate"
          variant="outline"
          onPress={onRegenerate}
          style={styles.regenerateButton}
          loading={isRegenerating}
        />
      </View>
      <SaveRouteModal
        visible={routeToSave !== null}
        initialValue={routeToSave?.name}
        loading={isSavingRoute}
        onCancel={() => {
          setRouteToSave(null);
          setSavingRouteId(null);
        }}
        onConfirm={(name) => void onConfirmSave(name)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    marginTop: 8,
  },
  regenerateButton: {
    backgroundColor: "#f9fafb",
  },
});
