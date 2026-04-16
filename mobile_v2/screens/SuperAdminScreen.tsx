import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, 
  TouchableOpacity, SafeAreaView, ActivityIndicator, Alert 
} from 'react-native';
import axios from 'axios';

/**
 * HQ COMMAND MOBILE: Lite Control Plane for the Platform Owner.
 * Enables critical executive actions (Suspending tenants, revenue pulse) from anywhere.
 */
export default function SuperAdminScreen() {
  const [stats, setStats] = useState<any>(null);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatformData();
  }, []);

  async function loadPlatformData() {
    try {
      // These would be authenticated with the SuperToken
      const analyticsRes = await axios.get('/hq/api/superadmin/analytics');
      const paymentsRes = await axios.get('/hq/api/superadmin/payments');
      
      setStats(analyticsRes.data);
      setPendingPayments(paymentsRes.data);
    } catch (err) {
      console.error('Failed to load HQ data', err);
    } finally {
      setLoading(false);
    }
  }

  const approvePayment = async (requestId: string) => {
    try {
      await axios.post('/hq/api/superadmin/payments', { requestId, status: 'APPROVED' });
      Alert.alert('Success', 'Subscription Activated');
      loadPlatformData();
    } catch (err) {
      Alert.alert('Error', 'Approval failed');
    }
  };

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#0ea5e9" />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>NEXUS HQ</Text>
        <Text style={styles.platformValue}>Platform Revenue: ₹{parseFloat(stats?.revenue30d).toLocaleString()}</Text>
      </View>

      {/* Pending Payments Queue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending UPI Verifications ({pendingPayments.length})</Text>
        <FlatList
          data={pendingPayments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.paymentCard}>
              <View>
                <Text style={styles.tenantName}>{item.tenant_name}</Text>
                <Text style={styles.paymentInfo}>TXN: {item.transaction_id}</Text>
                <Text style={styles.amount}>₹{item.amount}</Text>
              </View>
              <TouchableOpacity 
                style={styles.approveBtn} 
                onPress={() => approvePayment(item.id)}
              >
                <Text style={styles.approveText}>APPROVE</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending payments</Text>}
        />
      </View>

      {/* System Pulse */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Pulse</Text>
        <View style={styles.pulseCard}>
          <Text style={styles.pulseText}>DB Size: {stats?.dbSize}</Text>
          <Text style={styles.pulseText}>Active Tiers: {stats?.tenants?.length}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loader: { flex: 1, justifyContent: 'center' },
  header: { padding: 30, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  brand: { fontSize: 28, fontWeight: '900', color: '#0ea5e9', letterSpacing: -1 },
  platformValue: { color: '#10b981', fontWeight: 'bold', marginTop: 5 },
  section: { padding: 20 },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15 },
  paymentCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tenantName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  paymentInfo: { color: '#64748b', fontSize: 11, marginTop: 4 },
  amount: { color: '#fff', fontWeight: 'black', marginTop: 10 },
  approveBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  approveText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  emptyText: { color: '#334155', textAlign: 'center', marginTop: 20 },
  pulseCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 24 },
  pulseText: { color: '#94a3b8', fontSize: 13, marginBottom: 5 }
});
