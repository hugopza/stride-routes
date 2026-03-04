import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { generateRoutes } from '../lib/generate-routes';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [timeMinutes, setTimeMinutes] = useState('45');
  const [paceMinPerKm, setPaceMinPerKm] = useState('5.5');

  const onGenerate = () => {
    const parsedTime = Number(timeMinutes);
    const parsedPace = Number(paceMinPerKm);

    if (!parsedTime || !parsedPace || parsedTime <= 0 || parsedPace <= 0) {
      Alert.alert('Invalid input', 'Enter valid positive values for time and pace.');
      return;
    }

    const params = {
      timeMinutes: parsedTime,
      paceMinPerKm: parsedPace,
    };
    const routes = generateRoutes(params);

    navigation.navigate('Results', { params, routes });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate Routes</Text>

      <Text style={styles.label}>Time (minutes)</Text>
      <TextInput
        keyboardType="numeric"
        style={styles.input}
        value={timeMinutes}
        onChangeText={setTimeMinutes}
        placeholder="e.g. 45"
      />

      <Text style={styles.label}>Pace (min/km)</Text>
      <TextInput
        keyboardType="numeric"
        style={styles.input}
        value={paceMinPerKm}
        onChangeText={setPaceMinPerKm}
        placeholder="e.g. 5.5"
      />

      <Pressable style={styles.button} onPress={onGenerate}>
        <Text style={styles.buttonText}>Generate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
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
