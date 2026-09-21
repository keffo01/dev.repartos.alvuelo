// src/screens/LoginScreen.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Driver } from '../types';

const { width } = Dimensions.get('window');

// Reemplaza con la URL de tu API Gateway expuesta
const API_GATEWAY_URL = 'https://jfzj8yx48i.execute-api.us-east-2.amazonaws.com/Dev/login/riders';

interface LoginScreenProps {
  onLoginSuccess: (driver: Driver) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Obtener el Expo Push Token del dispositivo
  const getExpoPushToken = async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Las notificaciones Push requieren un dispositivo físico.');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permiso Denegado', 'No se pudieron obtener permisos para notificaciones push.');
        return null;
      }

      // Obtener el token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        // projectId de tu app en app.json (extraData.eas.projectId) si usas EAS Build
      });

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('Error al obtener Expo Push Token:', error);
      return null;
    }
  };

  const handleLogin = async () => {
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !password) {
      Alert.alert('Atención', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener Expo Push Token
      const pushToken = await getExpoPushToken();

      // 2. Enviar credenciales a API Gateway / Lambda
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
        setLoading(false);
        return;
      }

      // 3. Login Exitoso
      onLoginSuccess(data.user);
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
        <Text style={styles.loginTitle}>FlashDelivery</Text>
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
          <Text style={styles.loginButtonText}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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