import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useLayoutEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { InputRow } from "../components/InputRow";
import { generateRoutes } from "../lib/generate-routes";
import type { RootTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<RootTabParamList, "Explore">;

export function HomeScreen({ navigation }: Props) {
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [pace, setPace] = useState("5:30");
  const [isCircular, setIsCircular] = useState(true);
  const [surface, setSurface] = useState("Mixed");
  const [intensity, setIntensity] = useState("Balanced");
  const [safety, setSafety] = useState("Safer streets");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <Text style={{ fontSize: 24 }}>⚙️</Text>,
    });
  }, [navigation]);

  const onGenerate = () => {
    // Parse time
    const parsedHours = Number(hours) || 0;
    const parsedMinutes = Number(minutes) || 0;
    const totalMinutes = parsedHours * 60 + parsedMinutes;

    // Parse pace (e.g. "5:30" -> 5.5)
    let parsedPace = 0;
    if (pace.includes(":")) {
      const [m, s] = pace.split(":");
      parsedPace = Number(m) + Number(s) / 60;
    } else {
      parsedPace = Number(pace);
    }

    if (totalMinutes <= 0 || !parsedPace || parsedPace <= 0) {
      Alert.alert(
        "Invalid input",
        "Enter valid positive values for time and pace.",
      );
      return;
    }

    const params = {
      timeMinutes: totalMinutes,
      paceMinPerKm: parsedPace,
    };

    // UI Only states for the other fields (Surface, etc) are ignored by logic per constraints
    const routes = generateRoutes(params);

    navigation.navigate("Routes", {
      screen: "Results",
      params: { params, routes },
    });
  };

  const isFormValid =
    (Number(hours) > 0 || Number(minutes) > 0) && pace.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>START</Text>
        <InputRow placeholder="Search location..." />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROUTE TYPE</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Circular route</Text>
          <Switch
            value={isCircular}
            onValueChange={setIsCircular}
            trackColor={{ true: "#111827" }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TIME & PACE</Text>
        <View style={styles.row}>
          <InputRow
            label="Hours"
            value={hours}
            onChangeText={setHours}
            keyboardType="numeric"
          />
          <InputRow
            label="Minutes"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="numeric"
          />
        </View>
        <InputRow
          label="Target pace (min/km)"
          value={pace}
          onChangeText={setPace}
          keyboardType="numeric"
          hint="Estimated distance: 8.2 km"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SURFACE</Text>
        <View style={styles.chipRow}>
          {["Trail", "Asphalt", "Mixed"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={surface === s}
              onPress={() => setSurface(s)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INTENSITY</Text>
        <View style={styles.chipRow}>
          {["Easy (flatter)", "Balanced", "Hard (hills)"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={intensity === s}
              onPress={() => setIntensity(s)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WAYPOINTS</Text>
        <View style={styles.waypointsBox}>
          <Text style={styles.waypointsEmpty}>No waypoints added</Text>
          <Button variant="ghost" label="+ Add waypoint" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SAFETY</Text>
        <View style={styles.chipRow}>
          {["Safer streets", "Normal"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={safety === s}
              onPress={() => setSafety(s)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <Text style={styles.hintText}>Safer may reduce options</Text>
      </View>

      <View style={styles.footer}>
        <Button
          label="Generate 5 routes"
          onPress={onGenerate}
          disabled={!isFormValid}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#111827",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  waypointsBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  waypointsEmpty: {
    color: "#9ca3af",
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: -4,
  },
  footer: {
    marginTop: 8,
    gap: 12,
  },
});
