import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/menu_item.dart';
import '../models/order.dart';
import '../utils/app_durations.dart';

class ApiService {
  // ─── Singleton Pattern ───────────────────────────────────────────────────
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final http.Client _client = http.Client();

  // Dynamic configuration defaults
  static const String _defaultIp = '10.0.2.2'; // Standard AVD localhost bridge
  static const String _defaultPort = '3000';

  Future<String> get baseUrl async {
    final prefs = await SharedPreferences.getInstance();
    final ip = prefs.getString('server_ip') ?? _defaultIp;
    return 'http://$ip:$_defaultPort/api';
  }

  Future<String> get webUrl async {
    final prefs = await SharedPreferences.getInstance();
    final ip = prefs.getString('server_ip') ?? _defaultIp;
    return 'http://$ip:$_defaultPort';
  }

  Future<void> setServerIp(String ip) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_ip', ip);
    invalidateAll();
  }

  // ─── In-memory cache ──────────────────────────────────────────────────────
  static List<MenuItem>? _menuCache;
  static DateTime? _menuCacheTime;
  static Map<String, dynamic>? _settingsCache;
  static DateTime? _settingsCacheTime;
  static Map<String, dynamic>? _dashboardCache;
  static DateTime? _dashboardCacheTime;

  bool _isCacheValid(DateTime? cacheTime) {
    if (cacheTime == null) return false;
    return DateTime.now().difference(cacheTime) < AppDurations.cacheTtl;
  }

  static void invalidateMenuCache() => _menuCache = null;
  static void invalidateSettingsCache() => _settingsCache = null;
  static void invalidateDashboardCache() => _dashboardCache = null;
  static void invalidateAll() {
    _menuCache = null;
    _settingsCache = null;
    _dashboardCache = null;
  }

  /// Close the client when the app is being terminated
  void dispose() {
    _client.close();
  }

  // ─── Shared request helper ────────────────────────────────────────────────
  Future<http.Response> _get(String path) async {
    final url = await baseUrl;
    return _client.get(Uri.parse('$url$path')).timeout(AppDurations.httpTimeout);
  }

  Future<http.Response> _post(String path, Map<String, dynamic> body) async {
    final url = await baseUrl;
    return _client
        .post(
          Uri.parse('$url$path'),
          headers: const {'Content-Type': 'application/json'},
          body: json.encode(body),
        )
        .timeout(AppDurations.httpTimeout);
  }

  Future<http.Response> _put(String path, Map<String, dynamic> body) async {
    final url = await baseUrl;
    return _client
        .put(
          Uri.parse('$url$path'),
          headers: const {'Content-Type': 'application/json'},
          body: json.encode(body),
        )
        .timeout(AppDurations.httpTimeout);
  }

  Future<http.Response> _delete(String path) async {
    final url = await baseUrl;
    return _client
        .delete(Uri.parse('$url$path'))
        .timeout(AppDurations.httpTimeout);
  }

  // ─── Menu ──────────────────────────────────────────────────────────────────
  Future<List<MenuItem>> fetchMenuItems({bool forceRefresh = false}) async {
    if (!forceRefresh && _menuCache != null && _isCacheValid(_menuCacheTime)) {
      return _menuCache!;
    }
    final response = await _get('/menu');
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      _menuCache = data.map((j) => MenuItem.fromJson(j)).toList();
      _menuCacheTime = DateTime.now();
      return _menuCache!;
    }
    throw Exception('Failed to load menu items (${response.statusCode})');
  }

  // ─── Orders ────────────────────────────────────────────────────────────────
  Future<List<Order>> fetchOrders() async {
    final response = await _get('/orders');
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((j) => Order.fromJson(j)).toList();
    }
    throw Exception('Failed to load orders (${response.statusCode})');
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
    final response = await _get('/settings');
    if (response.statusCode == 200) {
      _settingsCache = json.decode(response.body) as Map<String, dynamic>;
      _settingsCacheTime = DateTime.now();
      return _settingsCache!;
    }
    throw Exception('Failed to load settings (${response.statusCode})');
  }

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  Future<Map<String, dynamic>> fetchDashboardStats({
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh &&
        _dashboardCache != null &&
        _isCacheValid(_dashboardCacheTime)) {
      return _dashboardCache!;
    }
    final response = await _get('/dashboard');
    if (response.statusCode == 200) {
      _dashboardCache = json.decode(response.body) as Map<String, dynamic>;
      _dashboardCacheTime = DateTime.now();
      return _dashboardCache!;
    }
    throw Exception('Failed to load dashboard stats (${response.statusCode})');
  }

  /// Load menu and settings in parallel for initial startup optimisation.
  Future<(List<MenuItem>, Map<String, dynamic>)> fetchInitialData() async {
    final results = await Future.wait([fetchMenuItems(), fetchSettings()]);
    return (results[0] as List<MenuItem>, results[1] as Map<String, dynamic>);
  }

  // ─── Create Order ──────────────────────────────────────────────────────────
  Future<Order> createOrder(Map<String, dynamic> orderData) async {
    final response = await _post('/orders', orderData);
    if (response.statusCode == 200 || response.statusCode == 201) {
      invalidateDashboardCache();
      return Order.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to place order (${response.statusCode})');
  }

  // ─── Update Order Status ───────────────────────────────────────────────────
  Future<void> updateOrderStatus(
    int orderId,
    String status, {
    String? paymentMethod,
    String? customerName,
    String? customerPhone,
  }) async {
    final Map<String, dynamic> reqBody = {'status': status};
    if (paymentMethod != null) reqBody['paymentMethod'] = paymentMethod;
    if (customerName != null && customerName.isNotEmpty) {
      reqBody['customerName'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      reqBody['customerPhone'] = customerPhone;
    }
    final response = await _put('/orders/$orderId', reqBody);
    if (response.statusCode != 200) {
      throw Exception('Failed to update order (${response.statusCode})');
    }
    invalidateDashboardCache();
  }

  // ─── Menu CRUD ─────────────────────────────────────────────────────────────
  Future<void> createMenuItem(Map<String, dynamic> itemData) async {
    final response = await _post('/menu', itemData);
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to create menu item (${response.statusCode})');
    }
    invalidateMenuCache();
  }

  Future<void> updateMenuItem(int id, Map<String, dynamic> itemData) async {
    final response = await _put('/menu/$id', itemData);
    if (response.statusCode != 200) {
      throw Exception('Failed to update menu item (${response.statusCode})');
    }
    invalidateMenuCache();
  }

  Future<void> updateSettings(Map<String, dynamic> settingsData) async {
    final response = await _put('/settings', settingsData);
    if (response.statusCode != 200) {
      throw Exception('Failed to update settings (${response.statusCode})');
    }
    invalidateSettingsCache();
  }

  Future<void> deleteMenuItem(int id) async {
    final response = await _delete('/menu/$id');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete menu item (${response.statusCode})');
    }
    invalidateMenuCache();
  }

  // ─── Tables ────────────────────────────────────────────────────────────────
  Future<List<dynamic>> fetchTables() async {
    final response = await _get('/tables');
    if (response.statusCode == 200) {
      return json.decode(response.body) as List<dynamic>;
    }
    throw Exception('Failed to load tables (${response.statusCode})');
  }

  // ─── KDS pending orders ────────────────────────────────────────────────────
  Future<List<Order>> fetchPendingOrders() async {
    final response = await _get('/orders?status=PENDING');
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((j) => Order.fromJson(j)).toList();
    }
    throw Exception('Failed to load pending orders (${response.statusCode})');
  }

  // ─── Mark KOT Printed ──────────────────────────────────────────────────────
  Future<Order> markKOTPrinted(int orderId) async {
    final response = await _put('/orders/$orderId/kot', {});
    if (response.statusCode == 200) {
      return Order.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to mark KOT printed (${response.statusCode})');
  }
}
