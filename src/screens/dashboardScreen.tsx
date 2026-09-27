// src/screens/DashboardScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Importa tu Hook de Contexto y Servicio (Ajusta las rutas según tu estructura)
import { useDriver } from '../context/driverContext';
import { riderService } from '../services/riderService';

interface DashboardScreenProps {
  onViewActiveOrder?: () => void;
  onLogout?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onViewActiveOrder,
  onLogout,
}) => {
  // 1. Inyección de estado global e invocación de rutas de Expo Router
  const { driver, setDriver } = useDriver();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  console.log('Estado del repartidor:', driver);

  // Variables derivadas del estado global 'driver'
  const driverEmail = driver?.email || driver?.id;
  const riderStatus = driver?.riderStatus || 'DISPONIBLE';
  const isAvailable = riderStatus === 'DISPONIBLE';

  const currentAssignment =
    driver?.currentAssignment && driver.currentAssignment.status !== 'ENTREGADO'
      ? driver.currentAssignment
      : null;

  // 2. Función para consultar el perfil actualizado en DynamoDB
  const fetchProfile = useCallback(async () => {
    if (!driverEmail) return;
    try {
      const updatedProfile = await riderService.getProfile(driverEmail);
      if (updatedProfile && typeof setDriver === 'function') {
        setDriver(updatedProfile);
      }
    } catch (error) {
      console.error('Error al actualizar el perfil del repartidor:', error);
    }
  }, [driverEmail, setDriver]);

  // Pull to refresh manual
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  // 3. 🔄 POLLING AUTOMÁTICO: Revisa cada 5 segundos si entra una nueva orden
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isAvailable && !currentAssignment) {
      intervalId = setInterval(() => {
        fetchProfile();
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAvailable, currentAssignment, fetchProfile]);

  // 4. Cambiar disponibilidad (DISPONIBLE / FUERA_DE_LINEA)
  const toggleRiderStatus = async () => {
    if (currentAssignment) {
      Alert.alert(
        'Acción no permitida',
        'Tienes un pedido activo. Debes completarlo antes de cambiar tu estado.'
      );
      return;
    }

    const newStatus = isAvailable ? 'FUERA_DE_LINEA' : 'DISPONIBLE';
    setUpdatingStatus(true);
    console.log(`Cambiando estado de ${driverEmail} a ${newStatus}`);

    try {
      await riderService.updateRiderStatus(driverEmail, newStatus);
      setDriver((prev: any) => ({
        ...prev,
        riderStatus: newStatus,
      }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado de disponibilidad.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 5. Navegación al detalle del pedido (Soporta estado en index.tsx o Expo Router)
  const handleGoToOrderDetail = () => {
    if (!currentAssignment) return;

    if (onViewActiveOrder) {
      onViewActiveOrder();
    } else {
      router.push({
        pathname: '/orderDetail',
        params: { orderId: currentAssignment.orderId },
      });
    }
  };

  // Datos estadísticos
  const stats = driver?.stats || {};
  const ordersToday = stats.ordersToday || 0;
  const totalEarningsToday = Number(stats.totalEarningsToday || 0).toFixed(2);
  const totalSalesToday = Number(stats.totalSalesToday || 0).toFixed(2);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bienvenido,</Text>
          <Text style={styles.driverName}>
            {driver?.Profile?.nickName || driver?.name || 'Repartidor'}
          </Text>
        </View>

        {/* Interruptor de disponibilidad y Cerrar Sesión */}
        <View style={styles.statusSwitchContainer}>
          <Text style={[styles.statusText, isAvailable ? styles.textAvailable : styles.textOffline]}>
            {isAvailable ? 'DISPONIBLE' : 'INACTIVO'}
          </Text>
          {updatingStatus ? (
            <ActivityIndicator size="small" color="#27AE60" style={{ marginLeft: 8 }} />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={toggleRiderStatus}
              trackColor={{ false: '#BDC3C7', true: '#A9DFBF' }}
              thumbColor={isAvailable ? '#27AE60' : '#7F8C8D'}
            />
          )}

          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={{ marginLeft: 12 }}>
              <Ionicons name="log-out-outline" size={22} color="#E74C3C" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27AE60']} />
        }
      >
        {/* Resumen del día */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Resumen de Hoy</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="bicycle-outline" size={22} color="#27AE60" />
              <Text style={styles.statNumber}>{ordersToday}</Text>
              <Text style={styles.statLabel}>Entregas</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="cash-outline" size={22} color="#2980B9" />
              <Text style={styles.statNumber}>${totalEarningsToday}</Text>
              <Text style={styles.statLabel}>Ganancia</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="wallet-outline" size={22} color="#E67E22" />
              <Text style={styles.statNumber}>${totalSalesToday}</Text>
              <Text style={styles.statLabel}>Vendido</Text>
            </View>
          </View>
        </View>

        {/* ESTADO DE ASIGNACIÓN */}
        <Text style={styles.sectionTitle}>Estado de Asignación</Text>

        {currentAssignment ? (
          /* Pedido Asignado */
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={styles.badgeActive}>
                <Ionicons name="time-outline" size={14} color="#FFF" />
                <Text style={styles.badgeActiveText}>
                  {currentAssignment.status || 'ASIGNADA'}
                </Text>
              </View>
              <Text style={styles.orderIdText}>#{currentAssignment.orderId}</Text>
            </View>

            <Text style={styles.assignmentTitle}>¡Tienes un pedido asignado!</Text>
            <Text style={styles.assignmentSub}>
              Ingresa al detalle para ver la dirección, cliente y actualizar los estados del viaje.
            </Text>

            <TouchableOpacity style={styles.btnAction} onPress={handleGoToOrderDetail}>
              <Ionicons name="eye-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnActionText}>Ver Detalle del Pedido</Text>
            </TouchableOpacity>
          </View>
        ) : isAvailable ? (
          /* En Espera (Polling activo) */
          <View style={styles.waitingCard}>
            <ActivityIndicator size="large" color="#27AE60" style={{ marginBottom: 12 }} />
            <Text style={styles.waitingTitle}>Buscando pedidos en tiempo real...</Text>
            <Text style={styles.waitingSub}>
              Mantente atento. Cuando te asignen una orden aparecerá automáticamente en pantalla.
            </Text>
          </View>
        ) : (
          /* Fuera de Línea */
          <View style={styles.offlineCard}>
            <Ionicons name="moon-outline" size={36} color="#7F8C8D" style={{ marginBottom: 8 }} />
            <Text style={styles.offlineTitle}>Estás Fuera de Línea</Text>
            <Text style={styles.offlineSub}>
              Activa el interruptor arriba para comenzar a recibir nuevos pedidos.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  welcomeText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
  },
  textAvailable: {
    color: '#27AE60',
  },
  textOffline: {
    color: '#7F8C8D',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#95A5A6',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EAEAEA',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  assignmentCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27AE60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActiveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  assignmentSub: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 18,
  },
  btnAction: {
    flexDirection: 'row',
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  waitingCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  waitingSub: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 18,
  },
  offlineCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  offlineTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  offlineSub: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});