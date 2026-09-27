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

// Importa tu Hook de Contexto y Servicio
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
  // 1. Inyección de estado global y router
  const { driver, setDriver } = useDriver();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Email/ID del repartidor
  const driverEmail = driver?.email || driver?.id;

  // 🟢 CORRECCIÓN 1: Manejo del estado En Línea
  // Mantiene al repartidor "DISPONIBLE/EN LÍNEA" mientras isOnline sea true o riderStatus no sea FUERA_DE_LINEA
  const riderStatus = driver?.riderStatus || 'FUERA_DE_LINEA';
  const isOnline =
    driver?.isOnline !== undefined
      ? Boolean(driver.isOnline)
      : riderStatus !== 'FUERA_DE_LINEA' && riderStatus !== 'INACTIVO';

  // 🟢 CORRECCIÓN 2: Validar si existe una asignación activa (descarta objetos vacíos {} y entregados)
  const hasActiveAssignment = (assignment: any) => {
    if (!assignment) return false;
    if (typeof assignment === 'object' && Object.keys(assignment).length === 0) return false;
    if (!assignment.orderId && !assignment.id) return false;
    
    const finishedStatuses = ['ENTREGADO', 'CANCELADO', 'COMPLETADO', 'FINISHED'];
    if (assignment.status && finishedStatuses.includes(String(assignment.status).toUpperCase())) {
      return false;
    }
    return true;
  };

  const currentAssignment = hasActiveAssignment(driver?.currentAssignment)
    ? driver.currentAssignment
    : null;

  // 🟢 CORRECCIÓN 3: Extracción de Stats (Soporta Lista por Fecha o Mapa/Objeto directo)
  const getTodayStats = (statsData: any) => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (!statsData) {
      return { ordersToday: 0, totalEarningsToday: '0.00', totalSalesToday: '0.00' };
    }

    // Si stats es una Lista / Arreglo por fecha
    if (Array.isArray(statsData)) {
      const todayStat =
        statsData.find((item: any) => item.date === todayStr) ||
        statsData[statsData.length - 1] ||
        {};
      return {
        ordersToday: todayStat.ordersToday || todayStat.deliveries || 0,
        totalEarningsToday: Number(todayStat.totalEarningsToday || todayStat.earning || 0).toFixed(2),
        totalSalesToday: Number(todayStat.totalSalesToday || todayStat.totalValue || 0).toFixed(2),
      };
    }

    // Si stats es un Mapa/Objeto indexado por fecha
    if (statsData[todayStr]) {
      const todayStat = statsData[todayStr];
      return {
        ordersToday: todayStat.ordersToday || 0,
        totalEarningsToday: Number(todayStat.totalEarningsToday || 0).toFixed(2),
        totalSalesToday: Number(todayStat.totalSalesToday || 0).toFixed(2),
      };
    }

    // Si es un objeto de estadísticas acumuladas
    return {
      ordersToday: statsData.ordersToday || 0,
      totalEarningsToday: Number(statsData.totalEarningsToday || 0).toFixed(2),
      totalSalesToday: Number(statsData.totalSalesToday || 0).toFixed(2),
    };
  };

  const { ordersToday, totalEarningsToday, totalSalesToday } = getTodayStats(driver?.stats);

  // 🟢 CORRECCIÓN 4: Lista del histórico de entregas
  const historyList: any[] = Array.isArray(driver?.history) ? driver.history : [];

  // 2. Consulta del perfil actualizado
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  // 3. Polling automático cuando está en línea y no tiene orden activa
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isOnline && !currentAssignment) {
      intervalId = setInterval(() => {
        fetchProfile();
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline, currentAssignment, fetchProfile]);

  // 4. Conmutar disponibilidad
  const toggleRiderStatus = async () => {
    if (currentAssignment) {
      Alert.alert(
        'Acción no permitida',
        'Tienes un pedido activo. Debes completarlo antes de cambiar tu estado de conexión.'
      );
      return;
    }

    const newStatus = isOnline ? 'FUERA_DE_LINEA' : 'DISPONIBLE';
    const newIsOnline = !isOnline;

    setUpdatingStatus(true);

    try {
      await riderService.updateRiderStatus(driverEmail, newStatus);
      setDriver((prev: any) => ({
        ...prev,
        isOnline: newIsOnline,
        riderStatus: newStatus,
      }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado de disponibilidad.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 5. Ir al detalle del pedido
  const handleGoToOrderDetail = () => {
    if (!currentAssignment) return;

    if (onViewActiveOrder) {
      onViewActiveOrder();
    } else {
      router.push({
        pathname: '/orderDetail',
        params: { orderId: currentAssignment.orderId || currentAssignment.id },
      });
    }
  };

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

        <View style={styles.statusSwitchContainer}>
          <Text style={[styles.statusText, isOnline ? styles.textAvailable : styles.textOffline]}>
            {isOnline ? 'DISPONIBLE' : 'INACTIVO'}
          </Text>
          {updatingStatus ? (
            <ActivityIndicator size="small" color="#27AE60" style={{ marginLeft: 8 }} />
          ) : (
            <Switch
              value={isOnline}
              onValueChange={toggleRiderStatus}
              trackColor={{ false: '#BDC3C7', true: '#A9DFBF' }}
              thumbColor={isOnline ? '#27AE60' : '#7F8C8D'}
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
          /* Pedido Asignado Activo */
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={styles.badgeActive}>
                <Ionicons name="time-outline" size={14} color="#FFF" />
                <Text style={styles.badgeActiveText}>
                  {currentAssignment.status || 'ASIGNADA'}
                </Text>
              </View>
              <Text style={styles.orderIdText}>#{currentAssignment.orderId || currentAssignment.id}</Text>
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
        ) : isOnline ? (
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

        {/* HISTÓRICO DE ENTREGAS */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Histórico de Entregas</Text>

        {historyList.length > 0 ? (
          <View style={styles.historyContainer}>
            {historyList.map((item: any, index: number) => (
              <View key={item.id || item.orderId || index} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyOrderId}>#{item.orderId || item.id}</Text>
                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>{item.status || 'ENTREGADO'}</Text>
                  </View>
                </View>

                <View style={styles.historyBody}>
                  <View style={styles.historyInfoRow}>
                    <Ionicons name="time-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.historyText}>{item.date || 'Fecha no registrada'}</Text>
                  </View>

                  <View style={styles.historyDetailsRow}>
                    <View style={styles.historyDetailItem}>
                      <Text style={styles.historyLabel}>Ganancia:</Text>
                      <Text style={styles.historyValueGreen}>
                        ${Number(item.earning || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.historyDetailItem}>
                      <Text style={styles.historyLabel}>Total Pedido:</Text>
                      <Text style={styles.historyValue}>
                        ${Number(item.totalValue || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyHistoryCard}>
            <Ionicons name="receipt-outline" size={32} color="#BDC3C7" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyHistoryTitle}>Sin entregas aún</Text>
            <Text style={styles.emptyHistorySub}>
              Las órdenes completadas aparecerán listadas en este espacio.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
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
  welcomeText: { fontSize: 12, color: '#7F8C8D' },
  driverName: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  statusSwitchContainer: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: 'bold', marginRight: 6 },
  textAvailable: { color: '#27AE60' },
  textOffline: { color: '#7F8C8D' },
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
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
  statsGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#7F8C8D', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#EAEAEA' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12 },
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
  badgeActiveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  orderIdText: { fontSize: 13, fontWeight: 'bold', color: '#7F8C8D' },
  assignmentTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  assignmentSub: { fontSize: 13, color: '#7F8C8D', marginBottom: 16, lineHeight: 18 },
  btnAction: {
    flexDirection: 'row',
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnActionText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  waitingCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  waitingTitle: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  waitingSub: { fontSize: 12, color: '#7F8C8D', textAlign: 'center', lineHeight: 18 },
  offlineCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  offlineTitle: { fontSize: 15, fontWeight: 'bold', color: '#7F8C8D' },
  offlineSub: { fontSize: 12, color: '#95A5A6', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  historyContainer: { gap: 10, marginBottom: 24 },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 8,
    marginBottom: 8,
  },
  historyOrderId: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50' },
  historyBadge: { backgroundColor: '#E8F8F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  historyBadgeText: { color: '#27AE60', fontSize: 11, fontWeight: 'bold' },
  historyBody: { gap: 6 },
  historyInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyText: { fontSize: 12, color: '#7F8C8D' },
  historyDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  historyDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyLabel: { fontSize: 12, color: '#95A5A6' },
  historyValueGreen: { fontSize: 13, fontWeight: 'bold', color: '#27AE60' },
  historyValue: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50' },
  emptyHistoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 24,
  },
  emptyHistoryTitle: { fontSize: 14, fontWeight: 'bold', color: '#7F8C8D' },
  emptyHistorySub: { fontSize: 12, color: '#BDC3C7', textAlign: 'center', marginTop: 2 },
});