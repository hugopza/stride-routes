import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";

import { TabNavigator } from "./navigation/TabNavigator";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { AuthScreen } from "./screens/AuthScreen";

function AppShell() {
  const { session, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Loading app</Text>
          <Text style={styles.stateText}>
            Restoring your session and preparing the app.
          </Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <TabNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppShell />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
  },
  stateCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stateText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#4b5563",
    textAlign: "center",
  },
});
