import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";
import { InputRow } from "./InputRow";

type Props = {
  visible: boolean;
  loading?: boolean;
  initialValue?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

export function SaveRouteModal({
  visible,
  loading,
  initialValue,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(initialValue ?? "");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      setName(initialValue ?? "");
      setError(undefined);
    }
  }, [initialValue, visible]);

  const onSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Route name is required.");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Save route</Text>
          <Text style={styles.subtitle}>
            Choose the custom name that will appear in Saved Routes.
          </Text>
          <InputRow
            placeholder="My favorite loop"
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (error) {
                setError(undefined);
              }
            }}
            error={error}
            autoFocus
          />
          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="outline"
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <Button
              label="Save"
              onPress={onSubmit}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
});
