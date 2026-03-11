import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { searchPlaces, type PlaceSuggestion } from "../lib/place-search";
import type { RouteCoordinate } from "../types/route";
import { InputRow } from "./InputRow";

type Props = {
  label?: string;
  placeholder: string;
  value: string;
  selectedCoordinate?: RouteCoordinate;
  error?: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion: (suggestion: PlaceSuggestion) => void;
};

export function PlaceAutocompleteField({
  label,
  placeholder,
  value,
  selectedCoordinate,
  error,
  onChangeText,
  onSelectSuggestion,
}: Props) {
  const requestRef = useRef(0);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const query = value.trim();

      if (query.length < 3 || selectedCoordinate) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setIsSearching(true);
      const results = await searchPlaces(query, controller.signal);
      if (requestId !== requestRef.current || controller.signal.aborted) {
        return;
      }
      setSuggestions(results);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
      requestRef.current += 1;
    };
  }, [selectedCoordinate, value]);

  return (
    <View style={styles.container}>
      <InputRow
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        error={error}
        rightAccessory={
          <MaterialIcons name="location-on" size={20} color="#9ca3af" />
        }
      />
      {isSearching ? <Text style={styles.searchHint}>Searching...</Text> : null}
      {suggestions.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelectSuggestion(item)}
          style={styles.suggestionItem}
        >
          <Text style={styles.suggestionText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  suggestionItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
  },
  suggestionText: {
    fontSize: 13,
    color: "#111827",
  },
  searchHint: {
    fontSize: 12,
    color: "#6b7280",
  },
});
