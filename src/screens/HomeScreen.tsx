import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
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
import type { RouteParams } from "../types/route";

type Props = BottomTabScreenProps<RootTabParamList, "Explore">;

type RouteParamsWithUi = RouteParams & {
  circular: boolean;
  start?: string;
  end?: string;
  surface: string;
  intensity: string;
  safety: string;
  waypoints: string[];
};

function parsePace(raw: string): number | null {
  const value = raw.trim();

  if (!value) {
    return null;
  }

  if (value.includes(":")) {
    const [minutesText, secondsText] = value.split(":");
    const minutes = Number(minutesText);
    const seconds = Number(secondsText);

    if (
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return null;
    }

    return minutes + seconds / 60;
  }

  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function HomeScreen({ navigation }: Props) {
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [pace, setPace] = useState("5:30");
  const [isCircular, setIsCircular] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [waypoints] = useState<string[]>([]);
  const [surface, setSurface] = useState("Mixed");
  const [intensity, setIntensity] = useState("Balanced");
  const [safety, setSafety] = useState("Safer streets");
  const [isGenerating, setIsGenerating] = useState(false);

  const hasShownStartSoon = useRef(false);
  const hasShownEndSoon = useRef(false);

  useEffect(() => {
    if (isCircular) {
      setEnd("");
    }
  }, [isCircular]);

  const parsedHours = Number(hours) || 0;
  const parsedMinutes = Number(minutes) || 0;
  const totalMinutes = parsedHours * 60 + parsedMinutes;
  const normalizedPace = parsePace(pace);

  const estimatedKm =
    normalizedPace && totalMinutes > 0 ? totalMinutes / normalizedPace : null;

  const distanceHint = estimatedKm
    ? `Estimated distance: ~${estimatedKm.toFixed(1)} km`
    : undefined;

  const paceError =
    pace.length > 0 && normalizedPace === null
      ? "Use mm:ss or decimal format (e.g. 5:30, 5.5, 5,5)."
      : undefined;

  const onGenerate = () => {
    if (totalMinutes <= 0 || normalizedPace === null) {
      Alert.alert(
        "Invalid input",
        "Enter valid positive time and pace values.",
      );
      return;
    }

    const params: RouteParamsWithUi = {
      timeMinutes: totalMinutes,
      paceMinPerKm: normalizedPace,
      circular: isCircular,
      start: start.trim() || undefined,
      end: !isCircular && end.trim() ? end.trim() : undefined,
      surface,
      intensity,
      safety,
      waypoints,
    };

    setIsGenerating(true);

    setTimeout(() => {
      const routes = generateRoutes(params);

      navigation.navigate("Routes", {
        screen: "Results",
        params: { params, routes },
      });

      setIsGenerating(false);
    }, 180);
  };

  const isFormValid = totalMinutes > 0 && normalizedPace !== null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>START</Text>
        <InputRow
          label="Start"
          placeholder="Search location..."
          value={start}
          onChangeText={setStart}
          onFocus={() => {
            if (!hasShownStartSoon.current) {
              hasShownStartSoon.current = true;
              Alert.alert(
                "Coming soon",
                "Place search is coming soon. You can type manually for now.",
              );
            }
          }}
        />
        {!isCircular && (
          <InputRow
            label="End"
            placeholder="Set destination..."
            value={end}
            onChangeText={setEnd}
            onFocus={() => {
              if (!hasShownEndSoon.current) {
                hasShownEndSoon.current = true;
                Alert.alert(
                  "Coming soon",
                  "Destination search is coming soon. You can type manually for now.",
                );
              }
            }}
          />
        )}
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
          keyboardType={Platform.select({
            ios: "numbers-and-punctuation",
            default: "default",
          })}
          hint={distanceHint}
          error={paceError}
          autoCapitalize="none"
          autoCorrect={false}
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
          <Button
            variant="ghost"
            label="+ Add waypoint"
            onPress={() =>
              Alert.alert("Coming soon", "Waypoint editing is coming soon.")
            }
          />
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
          loading={isGenerating}
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
