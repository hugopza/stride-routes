import { StyleSheet, Text, View } from "react-native";

export function SavedRoutesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Saved routes</Text>
        <Text style={styles.text}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
  },
  card: {
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
    color: "#4b5563",
  },
});
