// src/screens/orderDetailScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { riderService } from '../services/riderService';

interface OrderDetailScreenProps {
  order?: any;
  driver?: any;
  onBack: () => void;
  onCompleteOrder: () => void;
}

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  order: initialOrder,
  driver,
  onBack,
  onCompleteOrder,
}) => {
  const driverEmail = driver?.email || driver?.id;
  const orderId = initialOrder?.id || initialOrder?.orderId || driver?.currentAssignment?.orderId;

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string>('INICIADO');

  // Normalizar estados como 'asignada' a la convención en mayúsculas
  const normalizeStatus = (rawStatus: string) => {
    if (!rawStatus || rawStatus.toLowerCase() === 'asignada') return 'INICIADO';
    return rawStatus.toUpperCase();
  };

  useEffect(() => {
    const fetchFullOrder = async () => {
      if (!orderId) {
        setLoadingOrder(false);
        return;
      }
      try {
        setLoadingOrder(true);
        const data = await riderService.getOrderDetails(orderId);
        setOrderDetails(data);
        if (data.status) {
          setCurrentStatus(normalizeStatus(data.status));
        }
      } catch (error) {
        console.error("Error al obtener la orden:", error);
        Alert.alert("Error", "No se pudieron obtener los detalles del pedido.");
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchFullOrder();
  }, [orderId]);

  // Transiciones de estado y etiquetas del botón
  const getNextStateInfo = () => {
    const normStatus = normalizeStatus(currentStatus);
    switch (normStatus) {
      case 'INICIADO':
        return { nextStatus: 'EN_RESTAURANTE', label: 'Llegué al Comercio', color: '#E67E22', icon: 'storefront-outline' };
      case 'EN_RESTAURANTE':
        return { nextStatus: 'PEDIDO_RECOGIDO', label: 'Confirmar Pedido Recogido', color: '#2980B9', icon: 'bag-check-outline' };
      case 'PEDIDO_RECOGIDO':
        return { nextStatus: 'ENTREGADO', label: 'Finalizar y Marcar Entregado', color: '#27AE60', icon: 'checkmark-circle-outline' };
      default:
        return { nextStatus: 'ENTREGADO', label: 'Finalizar Entrega', color: '#27AE60', icon: 'checkmark-circle-outline' };
    }
  };

  const handleAdvanceStatus = async () => {
    const { nextStatus } = getNextStateInfo();
    setUpdatingStatus(true);

    const orderValue = Number(orderDetails?.totalAmount || 0);
    const earning = Number(orderDetails?.deliveryFee || 0);

    try {
      const res = await riderService.updateOrderStatus(
        driverEmail,
        orderId,
        nextStatus,
        orderValue,
        earning
      );

      if (res.isFinished) {
        Alert.alert("¡Entrega Exitosa!", "El pedido fue finalizado y tus estadísticas fueron actualizadas.", [
          { text: "Aceptar", onPress: onCompleteOrder }
        ]);
      } else {
        setCurrentStatus(nextStatus);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el estado de la orden.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCallCustomer = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const { label, color, icon } = getNextStateInfo();
  const normStatus = normalizeStatus(currentStatus);

  if (loadingOrder) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text style={styles.loadingText}>Cargando pedido #{orderId}...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* Encabezado con margen seguro */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{orderId}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Línea de Progreso */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progreso de Entrega</Text>
          <View style={styles.stepperContainer}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepLine, ['EN_RESTAURANTE', 'PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
            <View style={[styles.stepDot, ['EN_RESTAURANTE', 'PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
            <View style={[styles.stepLine, ['PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
            <View style={[styles.stepDot, ['PEDIDO_RECOGIDO', 'ENTREGADO'].includes(normStatus) && styles.stepDone]} />
          </View>
          <Text style={styles.statusLabel}>
            Fase Actual: <Text style={styles.statusBold}>{normStatus}</Text>
          </Text>
        </View>

        {/* Comercio */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FDF2E9' }]}>
              <Ionicons name="restaurant-outline" size={22} color="#E67E22" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>COMERCIO</Text>
              <Text style={styles.infoTitle}>{orderDetails?.restaurantName || 'Comercio Alvuelo'}</Text>
            </View>
          </View>
        </View>

        {/* Cliente y Dirección */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FDEDEC' }]}>
              <Ionicons name="person-outline" size={22} color="#E74C3C" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>CLIENTE</Text>
              <Text style={styles.infoTitle}>{orderDetails?.customerName || 'Cliente'}</Text>
            </View>
            {orderDetails?.customerPhone && (
              <TouchableOpacity
                style={styles.phoneBtn}
                onPress={() => handleCallCustomer(orderDetails.customerPhone)}
              >
                <Ionicons name="call-outline" size={16} color="#27AE60" />
                <Text style={styles.phoneBtnText}>Llamar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#EAF2F8' }]}>
              <Ionicons name="location-outline" size={22} color="#2980B9" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>DIRECCIÓN DE ENTREGA</Text>
              <Text style={styles.infoTitle}>{orderDetails?.deliveryAddress || 'Sin dirección especificada'}</Text>
            </View>
          </View>
        </View>

        {/* Lista de Ítems */}
        {Array.isArray(orderDetails?.items) && orderDetails.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Productos ({orderDetails.items.length})</Text>
            {orderDetails.items.map((item: any, idx: number) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.itemBadge}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Método de Pago y Montos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen de Pago</Text>
          
          <View style={styles.paymentMethodBox}>
            <Ionicons
              name={orderDetails?.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
              size={20}
              color={orderDetails?.paymentMethod === 'cash' ? '#27AE60' : '#2980B9'}
            />
            <Text style={styles.paymentMethodText}>
              Método de pago: <Text style={{ fontWeight: 'bold' }}>
                {orderDetails?.paymentMethod === 'cash' ? 'Efectivo (Cobrar al entregar)' : 'Tarjeta / Pagado'}
              </Text>
            </Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Subtotal productos:</Text>
            <Text style={styles.financeValue}>${Number(orderDetails?.subtotal || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Envío / Ganancia flete:</Text>
            <Text style={styles.earningValue}>+${Number(orderDetails?.deliveryFee || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.financeRow}>
            <Text style={styles.totalLabel}>TOTAL A COBRAR:</Text>
            <Text style={styles.totalValue}>${Number(orderDetails?.totalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Botón Flotante para Avanzar Estado */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: color }]}
          onPress={handleAdvanceStatus}
          disabled={updatingStatus}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.btnContent}>
              <Ionicons name={icon as any} size={22} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>{label}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#BDC3C7',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#BDC3C7',
  },
  stepDone: {
    backgroundColor: '#27AE60',
  },
  statusLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 10,
  },
  statusBold: {
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#95A5A6',
    letterSpacing: 0.5,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 2,
  },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phoneBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#27AE60',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  itemBadge: {
    backgroundColor: '#F2F4F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: '#34495E',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  paymentMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentMethodText: {
    fontSize: 13,
    color: '#34495E',
    marginLeft: 8,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  financeLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  financeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  earningValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});