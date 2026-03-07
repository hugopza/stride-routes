import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { FakeRouteProvider } from "../lib/route-providers/FakeRouteProvider";
import { ResultsScreen } from "../screens/ResultsScreen";
import { RouteDetailScreen } from "../screens/RouteDetailScreen";
import type { RoutesStackParamList } from "./types";

const Stack = createNativeStackNavigator<RoutesStackParamList>();
const fakeRouteProvider = new FakeRouteProvider();

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
          // Initial params are static; async providers are used from screen actions.
          routes: fakeRouteProvider.generatePreviewRoutes(defaultParams),
        }}
      />
      <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
    </Stack.Navigator>
  );
}
