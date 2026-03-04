import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteDetail'>;

export function RouteDetailScreen({ route }: Props) {
  const { route: selectedRoute } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>Map Placeholder</Text>
      </View>

      <View style={styles.stats}>
        <Text style={styles.title}>{selectedRoute.name}</Text>
        <Text style={styles.stat}>{selectedRoute.distanceKm} km</Text>
        <Text style={styles.stat}>{selectedRoute.estimatedDurationMinutes} min</Text>
        <Text style={styles.stat}>{selectedRoute.elevationGainM} m elevation gain</Text>
      </View>

      <Pressable
        style={styles.button}
        onPress={() => Alert.alert('Download GPX', 'GPX export coming soon.')}
      >
        <Text style={styles.buttonText}>Download GPX</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    gap: 14,
  },
  mapPlaceholder: {
    height: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  stats: {
    gap: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stat: {
    fontSize: 16,
    color: '#111827',
  },
  button: {
    marginTop: 'auto',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
