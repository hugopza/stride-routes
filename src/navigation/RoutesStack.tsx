import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeScreen } from "../screens/HomeScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { RouteDetailScreen } from "../screens/RouteDetailScreen";
import type { RoutesStackParamList } from "./types";

const Stack = createNativeStackNavigator<RoutesStackParamList>();

export function RoutesStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 20 },
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#111827",
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Build your route" }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ title: "Generated routes" }}
      />
      <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
    </Stack.Navigator>
  );
}
