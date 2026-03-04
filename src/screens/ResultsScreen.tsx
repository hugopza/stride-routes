import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export function ResultsScreen({ navigation, route }: Props) {
  const { params, routes } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        {params.timeMinutes} min at {params.paceMinPerKm} min/km
      </Text>
      {routes.map((candidate) => (
        <Pressable
          key={candidate.id}
          style={styles.card}
          onPress={() => navigation.navigate('RouteDetail', { route: candidate })}
        >
          <Text style={styles.name}>{candidate.name}</Text>
          <Text style={styles.meta}>{candidate.distanceKm} km</Text>
          <Text style={styles.meta}>{candidate.estimatedDurationMinutes} min</Text>
          <Text style={styles.meta}>{candidate.elevationGainM} m elevation</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f9fafb',
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    fontSize: 14,
    color: '#374151',
  },
});
