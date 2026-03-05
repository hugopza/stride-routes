import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { generateRoutes } from "../lib/generate-routes";
import { ResultsScreen } from "../screens/ResultsScreen";
import { RouteDetailScreen } from "../screens/RouteDetailScreen";
import type { RoutesStackParamList } from "./types";

const Stack = createNativeStackNavigator<RoutesStackParamList>();

const defaultParams = {
  goalMode: "time" as const,
  timeMinutes: 45,
  paceMinPerKm: 5.5,
  targetDistanceKm: 45 / 5.5,
};

export function RoutesStack() {
  return (
    <Stack.Navigator
      initialRouteName="Results"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 20 },
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#111827",
      }}
    >
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ title: "Routes" }}
        initialParams={{
          params: defaultParams,
          routes: generateRoutes(defaultParams),
        }}
      />
      <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
    </Stack.Navigator>
  );
}
