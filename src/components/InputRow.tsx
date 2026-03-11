import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

interface InputRowProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  rightAccessory?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function InputRow({
  label,
  hint,
  error,
  style,
  rightAccessory,
  containerStyle,
  ...props
}: InputRowProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {rightAccessory && (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        )}
      </View>
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 48,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  rightAccessory: {
    marginLeft: 8,
  },
  hintText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
  },
});
