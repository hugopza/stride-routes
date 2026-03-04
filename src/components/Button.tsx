import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface ButtonProps extends PressableProps {
  label: string;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = "primary",
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : "#111827"} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            isOutline && styles.textOutline,
            isGhost && styles.textGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primary: {
    backgroundColor: "#111827",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  ghost: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  textPrimary: {
    color: "#fff",
  },
  textOutline: {
    color: "#111827",
  },
  textGhost: {
    color: "#111827",
    fontWeight: "600",
  },
});
