// src/screens/LoginScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useDriver } from '../context/driverContext';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';
import { Driver } from '../types';

const { width } = Dimensions.get('window');

const API_GATEWAY_URL = 'https://jfzj8yx48i.execute-api.us-east-2.amazonaws.com/Dev/login/riders';

interface LoginScreenProps {
  onLoginSuccess?: (driver: Driver) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { setDriver } = useDriver();
  const router = useRouter();

  const handleLogin = async () => {
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !password) {
      Alert.alert('Atención', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener el Expo Push Token usando el servicio unificado
      const pushToken = await registerForPushNotificationsAsync();
      console.log('📲 Token obtenido en Login:', pushToken);

      // 2. Enviar credenciales y Push Token a la Lambda
      const response = await fetch(API_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
          expoPushToken: pushToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error de Autenticación', data.message || 'Credenciales inválidas');
        return;
      }

      // 3. Login Exitoso: Guardar en el estado global y navegar
      setDriver(data.user);

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      router.replace('/');
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.loginHeader}>
        <MaterialCommunityIcons name="bike-fast" size={80} color="#FFF" />
        <Text style={styles.loginTitle}>Alvuelo Delivery</Text>
        <Text style={styles.loginSubtitle}>App de Repartidores</Text>
      </View>

      <View style={styles.loginForm}>
        <Text style={styles.inputLabel}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="repartidor@alvuelo.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.inputLabel}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="********"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: '#1E1E2C', justifyContent: 'center', alignItems: 'center' },
  loginHeader: { alignItems: 'center', marginBottom: 40 },
  loginTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginTop: 10 },
  loginSubtitle: { fontSize: 16, color: '#A0A0B0' },
  loginForm: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#F1F2F6', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, color: '#333' },
  loginButton: { backgroundColor: '#2ECC71', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 10 },
  loginButtonDisabled: { backgroundColor: '#A5D6A7' },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});