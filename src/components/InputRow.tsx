import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

interface InputRowProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function InputRow({
  label,
  hint,
  error,
  style,
  ...props
}: InputRowProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#ef4444",
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
