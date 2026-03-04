import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

interface ChipProps extends Omit<PressableProps, "style"> {
  label: string;
  selected?: boolean;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export function Chip({ label, selected, style, ...props }: ChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  textSelected: {
    color: "#fff",
  },
});
