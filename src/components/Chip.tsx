import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";

interface ChipProps extends Omit<PressableProps, "style"> {
  label: string;
  selected?: boolean;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  leftAccessory?: React.ReactNode;
}

export function Chip({
  label,
  selected,
  style,
  leftAccessory,
  ...props
}: ChipProps) {
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
      <View style={styles.content}>
        {leftAccessory ? (
          <View style={styles.leftAccessory}>{leftAccessory}</View>
        ) : null}

        <Text style={[styles.text, selected && styles.textSelected]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "transparent",
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  leftAccessory: {
    marginRight: 8,
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
