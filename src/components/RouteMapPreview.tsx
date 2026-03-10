import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import type { RouteCoordinate } from "../types/route";

type Props = {
  polyline: RouteCoordinate[];
  height?: number;
  placeholderText?: string;
  interactive?: boolean;
};

export function RouteMapPreview({
  polyline,
  height = 180,
  placeholderText = "Route preview unavailable",
  interactive = false,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const validPolyline = polyline.filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  const start = validPolyline[0];
  const end = validPolyline[validPolyline.length - 1];
  const isClosedLoop = Boolean(
    start &&
      end &&
      Math.abs(start.latitude - end.latitude) < 0.0002 &&
      Math.abs(start.longitude - end.longitude) < 0.0002,
  );

  useEffect(() => {
    if (validPolyline.length < 2) {
      return;
    }

    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(validPolyline, {
        edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
        animated: false,
      });
    }, 80);

    return () => clearTimeout(timeout);
  }, [validPolyline]);

  return (
    <View style={[styles.card, { height }]}>
      {validPolyline.length > 1 ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          pitchEnabled={interactive}
        >
          <Polyline
            coordinates={validPolyline}
            strokeColor="#0f172a"
            strokeWidth={4}
          />
          {start ? (
            <Marker
              coordinate={start}
              title={isClosedLoop ? "Start / End" : "Start"}
            />
          ) : null}
          {!isClosedLoop && end ? <Marker coordinate={end} title="End" /> : null}
        </MapView>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{placeholderText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  map: {
    flex: 1,
    width: "100%",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  placeholderText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
});
