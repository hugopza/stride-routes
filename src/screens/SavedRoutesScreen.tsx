import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Chip } from "../components/Chip";
import { RouteCard } from "../components/RouteCard";
import type { RootTabParamList } from "../navigation/types";
import { useSavedRoutes } from "../providers/SavedRoutesProvider";
import type { SavedRoute, SavedRouteActivity } from "../types/saved-route";

const ACTIVITY_FILTERS = ["All", "Foot", "Bike"] as const;

function getActivityLabel(activity: SavedRouteActivity): string {
  if (activity === "road_cycling") {
    return "Bike";
  }
  return "Foot";
}

function toLocationLabel(route: SavedRoute): string | undefined {
  if (route.activity === "road_cycling") {
    return "Road cycling route";
  }
  if (route.activity === "foot" && route.surface) {
    return `${route.surface.charAt(0).toUpperCase()}${route.surface.slice(1)} foot route`;
  }
  if (route.activity === "foot") {
    return "Foot route";
  }
  return undefined;
}

export function SavedRoutesScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const {
    savedRoutes,
    isSavedRoutesReady,
    savedRoutesError,
    refreshSavedRoutes,
    removeSavedRoute,
  } = useSavedRoutes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    (typeof ACTIVITY_FILTERS)[number]
  >("All");
  const [removingRouteId, setRemovingRouteId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshSavedRoutes();
    }, [refreshSavedRoutes]),
  );

  const filteredRoutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return savedRoutes.filter((route) => {
      const matchesSearch =
        !query || route.custom_name.toLowerCase().includes(query);
      const matchesFilter =
        selectedFilter === "All" ||
        (selectedFilter === "Bike"
          ? route.activity === "road_cycling"
          : route.activity === "foot");

      return matchesSearch && matchesFilter;
    });
  }, [savedRoutes, searchQuery, selectedFilter]);

  const onToggleSaved = async (route: SavedRoute) => {
    setRemovingRouteId(route.id);
    try {
      await removeSavedRoute(route.id);
    } finally {
      setRemovingRouteId(null);
    }
  };

  const hasSearch = searchQuery.trim().length > 0;
  const hasActiveFilter = selectedFilter !== "All";

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved routes"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Activity</Text>
          {hasActiveFilter ? (
            <Text style={styles.filterSummary}>{selectedFilter} routes</Text>
          ) : (
            <Text style={styles.filterSummary}>All saved routes</Text>
          )}
        </View>
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {ACTIVITY_FILTERS.map((filter) => (
              <Chip
                key={filter}
                label={filter}
                selected={selectedFilter === filter}
                style={styles.chip}
                onPress={() => setSelectedFilter(filter)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          {!isSavedRoutesReady ? (
            <View style={styles.stateCard}>
              <Ionicons name="bookmark-outline" size={24} color="#9ca3af" />
              <Text style={styles.stateTitle}>Loading saved routes</Text>
              <Text style={styles.stateText}>
                Fetching your saved routes from Supabase.
              </Text>
            </View>
          ) : savedRoutesError ? (
            <View style={styles.stateCard}>
              <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
              <Text style={styles.stateTitle}>Could not load saved routes</Text>
              <Text style={styles.stateText}>{savedRoutesError}</Text>
            </View>
          ) : filteredRoutes.length === 0 ? (
            <View style={styles.stateCard}>
              <Ionicons name="bookmark-outline" size={24} color="#9ca3af" />
              <Text style={styles.stateTitle}>
                {hasSearch || hasActiveFilter
                  ? "No routes match these filters"
                  : "No saved routes yet"}
              </Text>
              <Text style={styles.stateText}>
                {hasSearch || hasActiveFilter
                  ? "Try a different activity filter or search term."
                  : "Save a generated route to see it here."}
              </Text>
            </View>
          ) : (
            filteredRoutes.map((savedRoute) => (
              <RouteCard
                key={savedRoute.id}
                route={savedRoute.route}
                title={savedRoute.custom_name}
                location={toLocationLabel(savedRoute)}
                tags={[
                  getActivityLabel(savedRoute.activity),
                  ...(savedRoute.activity === "foot" && savedRoute.surface
                    ? [savedRoute.surface]
                    : []),
                ]}
                showMap={false}
                isSaved
                isSaveLoading={removingRouteId === savedRoute.id}
                onToggleSaved={() => void onToggleSaved(savedRoute)}
                onPress={() =>
                  navigation.navigate("Generate", {
                    screen: "RouteDetail",
                    params: {
                      route: savedRoute.route,
                      activity: savedRoute.activity,
                      surface: savedRoute.surface,
                    },
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    height: "100%",
  },
  filtersWrapper: {
    marginTop: 10,
    marginBottom: 24,
  },
  filterHeader: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  filterSummary: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderWidth: 0,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  stateCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
    textAlign: "center",
  },
});
