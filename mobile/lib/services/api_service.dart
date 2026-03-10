import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/menu_item.dart';
import '../models/order.dart';

class ApiService {
  final String _baseUrl = 'https://restaurant-billing-app-self.vercel.app';

  Future<String> get baseUrl async => '$_baseUrl/api';
  Future<String> get webUrl async => _baseUrl;

  // ─── In-memory cache ──────────────────────────────────────────────────────
  static List<MenuItem>? _menuCache;
  static DateTime? _menuCacheTime;
  static Map<String, dynamic>? _settingsCache;
  static DateTime? _settingsCacheTime;

  static const _cacheTtl = Duration(minutes: 3); // Cache for 3 minutes

  bool _isCacheValid(DateTime? cacheTime) {
    if (cacheTime == null) return false;
    return DateTime.now().difference(cacheTime) < _cacheTtl;
  }

  static void invalidateMenuCache() => _menuCache = null;
  static void invalidateSettingsCache() => _settingsCache = null;

  // ─── Menu ──────────────────────────────────────────────────────────────────
  Future<List<MenuItem>> fetchMenuItems({bool forceRefresh = false}) async {
    if (!forceRefresh && _menuCache != null && _isCacheValid(_menuCacheTime)) {
      return _menuCache!;
    }
    final url = await baseUrl;
    final response = await http
        .get(Uri.parse('$url/menu'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      _menuCache = data.map((json) => MenuItem.fromJson(json)).toList();
      _menuCacheTime = DateTime.now();
      return _menuCache!;
    } else {
      throw Exception('Failed to load menu items');
    }
  }

  // ─── Orders ────────────────────────────────────────────────────────────────
  Future<List<Order>> fetchOrders() async {
    final url = await baseUrl;
    final response = await http
        .get(Uri.parse('$url/orders'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Order.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load orders');
    }
  }

  // ─── Settings ──────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> fetchSettings({
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh &&
        _settingsCache != null &&
        _isCacheValid(_settingsCacheTime)) {
      return _settingsCache!;
    }
    final url = await baseUrl;
    final response = await http
        .get(Uri.parse('$url/settings'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      _settingsCache = json.decode(response.body) as Map<String, dynamic>;
      _settingsCacheTime = DateTime.now();
      return _settingsCache!;
    } else {
      throw Exception('Failed to load settings');
    }
  }

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  Future<Map<String, dynamic>> fetchDashboardStats() async {
    final url = await baseUrl;
    final response = await http
        .get(Uri.parse('$url/dashboard'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to load dashboard stats');
    }
  }

  // ─── Create Order ──────────────────────────────────────────────────────────
  Future<Order> createOrder(Map<String, dynamic> orderData) async {
    final url = await baseUrl;
    final response = await http
        .post(
          Uri.parse('$url/orders'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode(orderData),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Order.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to place order');
    }
  }

  // ─── Update Order Status ───────────────────────────────────────────────────
  Future<void> updateOrderStatus(
    int orderId,
    String status, {
    String? paymentMethod,
    String? customerName,
    String? customerPhone,
  }) async {
    final url = await baseUrl;
    final Map<String, dynamic> reqBody = {'status': status};
    if (paymentMethod != null) reqBody['paymentMethod'] = paymentMethod;
    if (customerName != null && customerName.isNotEmpty) {
      reqBody['customerName'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      reqBody['customerPhone'] = customerPhone;
    }

    final response = await http
        .put(
          Uri.parse('$url/orders/$orderId'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode(reqBody),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode != 200) {
      throw Exception('Failed to update order status');
    }
  }

  // ─── Menu CRUD ─────────────────────────────────────────────────────────────
  Future<void> createMenuItem(Map<String, dynamic> itemData) async {
    final url = await baseUrl;
    final response = await http
        .post(
          Uri.parse('$url/menu'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode(itemData),
        )
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to create menu item');
    }
    invalidateMenuCache();
  }

  Future<void> updateMenuItem(int id, Map<String, dynamic> itemData) async {
    final url = await baseUrl;
    final response = await http.put(
      Uri.parse('$url/menu/$id'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(itemData),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to update menu item');
    }
    invalidateMenuCache();
  }

  Future<void> updateSettings(Map<String, dynamic> settingsData) async {
    final url = await baseUrl;
    final response = await http
        .put(
          Uri.parse('$url/settings'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode(settingsData),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode != 200) {
      throw Exception('Failed to update settings');
    }
    invalidateSettingsCache();
  }

  Future<void> deleteMenuItem(int id) async {
    final url = await baseUrl;
    final response = await http
        .delete(Uri.parse('$url/menu/$id'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) {
      throw Exception('Failed to delete menu item');
    }
    invalidateMenuCache();
  }
}
