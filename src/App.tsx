import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";

import { HomeScreen } from "./screens/HomeScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { RouteDetailScreen } from "./screens/RouteDetailScreen";
import type { RootStackParamList } from "./types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
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
          options={{ title: "Generate route" }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{ title: "Routes" }}
        />
        <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
