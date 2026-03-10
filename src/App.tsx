import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";

import { TabNavigator } from "./navigation/TabNavigator";
import { AuthProvider } from "./providers/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <TabNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
