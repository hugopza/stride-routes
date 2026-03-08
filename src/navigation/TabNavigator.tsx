import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { ProfileScreen } from "../screens/ProfileScreen";
import { SavedRoutesScreen } from "../screens/SavedRoutesScreen";
import { RoutesStack } from "./RoutesStack";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Generate"
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 20 },
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#111827",
      }}
    >
      <Tab.Screen
        name="Generate"
        component={RoutesStack}
        options={{ headerShown: false, tabBarLabel: "Generate" }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedRoutesScreen}
        options={{ title: "Saved routes", tabBarLabel: "Saved" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
