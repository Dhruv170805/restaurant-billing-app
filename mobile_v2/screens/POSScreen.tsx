import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, 
  TouchableOpacity, SafeAreaView, ActivityIndicator 
} from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { syncEngine } from '../lib/sync/engine';

interface Category { id: number; name: string }
interface MenuItem { id: number; name: string; price: number; category_id: number }

export default function POSScreen() {
  const { tenant } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const primaryColor = tenant?.theme?.primary || '#f37c22';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    await syncEngine.pullMenu(); // Fetch fresh data
    // In a real app, we'd query SQLite here.
    // Simulating local query result for this demo:
    setCategories([{ id: 1, name: 'Main Course' }, { id: 2, name: 'Beverages' }]);
    setItems([
      { id: 101, name: 'Paneer Butter Masala', price: 280, category_id: 1 },
      { id: 102, name: 'Garlic Naan', price: 45, category_id: 1 },
      { id: 201, name: 'Fresh Lime Soda', price: 90, category_id: 2 },
    ]);
    setLoading(false);
  }

  const addToCart = (item: MenuItem) => {
    setCart(prev => [...prev, item]);
  };

  const total = cart.reduce((s, i) => s + i.price, 0);

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color={primaryColor} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: primaryColor }]}>{tenant?.name || 'NEXUS POS'}</Text>
        <Text style={styles.status}>Online • Syncing Active</Text>
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        style={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.categoryBtn, { borderColor: primaryColor }]}>
            <Text style={styles.categoryText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Items Grid */}
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.itemCard}
            onPress={() => addToCart(item)}
          >
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemPrice}>₹ {item.price}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Cart Summary (Floating) */}
      {cart.length > 0 && (
        <View style={[styles.cartBar, { backgroundColor: primaryColor }]}>
          <Text style={styles.cartText}>{cart.length} Items | Total: ₹ {total}</Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => {/* Trigger Sync Engine Push */}}>
            <Text style={styles.checkoutText}>GENERATE KOT →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loader: { flex: 1, justifyContent: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  brand: { fontSize: 24, fontWeight: '900' },
  status: { color: '#64748b', fontSize: 12, marginTop: 4 },
  categoryList: { maxHeight: 60, marginVertical: 10, paddingLeft: 15 },
  categoryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  categoryText: { color: '#f8fafc', fontWeight: '600' },
  itemCard: { flex: 1, margin: 10, backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#334155' },
  itemTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  itemPrice: { color: '#94a3b8', marginTop: 10 },
  cartBar: { position: 'absolute', bottom: 30, left: 20, right: 20, padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
  cartText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  checkoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  checkoutText: { color: '#fff', fontWeight: 'bold' },
});
