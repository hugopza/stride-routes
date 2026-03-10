import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Chip } from "../components/Chip";
import { RouteCard } from "../components/RouteCard";
import type { CandidateRoute } from "../types/route";

const DUMMY_ROUTES: (CandidateRoute & {
  location: string;
  tags: string[];
  isSaved: boolean;
})[] = [
  {
    id: "1",
    name: "Morning Run",
    location: "Central Park, NY",
    distanceKm: 5.2,
    estimatedDurationMinutes: 28,
    elevationGainM: 45,
    polyline: [],
    tags: ["ASPHALT", "EASY"],
    isSaved: true,
  },
  {
    id: "2",
    name: "Beach Loop",
    location: "Santa Monica, CA",
    distanceKm: 12.0,
    estimatedDurationMinutes: 65,
    elevationGainM: 12,
    polyline: [],
    tags: ["MIXED", "BALANCED"],
    isSaved: true,
  },
  {
    id: "3",
    name: "Forest Trail",
    location: "Portland, OR",
    distanceKm: 8.5,
    estimatedDurationMinutes: 52,
    elevationGainM: 210,
    polyline: [],
    tags: ["TRAIL", "HARD"],
    isSaved: true,
  },
];

const FILTERS = ["All", "Trail", "Asphalt", "Mixed"];

export function SavedRoutesScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved routes"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {FILTERS.map((filter, index) => (
              <Chip
                key={filter}
                label={filter}
                selected={index === 0}
                style={styles.chip}
              />
            ))}
          </ScrollView>
        </View>

        {/* Routes List */}
        <View style={styles.listContainer}>
          {DUMMY_ROUTES.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              location={route.location}
              tags={route.tags}
              showMap={false}
              isSaved={route.isSaved}
              onPress={() => {}}
            />
          ))}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60, // approximate safe area top
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6", // very subtle standard border
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
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
    marginTop: 16,
    marginBottom: 24,
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
    paddingBottom: 32,
  },
});
