import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../models/menu_item.dart';
import '../models/order.dart';
import '../utils/app_durations.dart';
import 'auth_service.dart';

// ─── Persistent Cache Keys ────────────────────────────────────────────────────
class _CacheKeys {
  static const menuData = 'cache_v1_menu_data';
  static const menuTime = 'cache_v1_menu_time';
  static const dashboardData = 'cache_v1_dashboard_data';
  static const dashboardTime = 'cache_v1_dashboard_time';
}

class AppConfig {
  /// Remote server URL provided via --dart-define=API_URL=https://...
  static const String apiUrl = String.fromEnvironment('API_URL');

  static String get baseConfigUrl => (dotenv.env['API_BASE_URL'] ?? '').trim();
  static String get defaultPort => (dotenv.env['PORT'] ?? '3000').trim();
  static const String apiPath = '/api';

  static bool get isProduction => apiUrl.isNotEmpty;

  String get webUrl {
    // 1. Prioritize --dart-define API_URL (Production)
    if (isProduction) {
      return apiUrl.endsWith('/')
          ? apiUrl.substring(0, apiUrl.length - 1)
          : apiUrl;
    }

    // 2. Fallback to .env configuration
    String base = baseConfigUrl;
    if (base.isEmpty) {
      base = 'http://127.0.0.1';
    }

    // Ensure protocol exists
    if (!base.startsWith('http')) {
      base = 'http://$base';
    }

    // 3. Port Handling (Avoid appending :80, :443, or :0)
    final port = defaultPort;

    // If the base URL already has a port, use it.
    // Otherwise, append defaultPort if it's not a standard web port.
    if (!base.contains(':', base.indexOf('//') + 2) &&
        port != '80' &&
        port != '443' &&
        port != '0' &&
        port.isNotEmpty) {
      return '$base:$port';
    }

    return base.endsWith('/') ? base.substring(0, base.length - 1) : base;
  }
}

class ApiService {
  // ─── Singleton Pattern ───────────────────────────────────────────────────
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final http.Client _client = http.Client();

  // ─── In-memory cache (fast path) ─────────────────────────────────────────
  static List<MenuItem>? _menuCache;
  static DateTime? _menuCacheTime;
  static Map<String, dynamic>? _dashboardCache;
  static DateTime? _dashboardCacheTime;

  Future<String> get baseUrl async {
    if (AppConfig.isProduction) {
      return '${AppConfig.apiUrl}${AppConfig.apiPath}';
    }
    return '${AppConfig().webUrl}${AppConfig.apiPath}';
  }

  // Sync accessor for SocketService / QR dialogs
  String get webUrl => AppConfig().webUrl;

  Future<void> setServerIp(String ip) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_ip', ip);
    invalidateAll();
  }

  // ─── Cache validity ───────────────────────────────────────────────────────
  bool _isMemoryCacheValid(DateTime? t) {
    if (t == null) return false;
    return DateTime.now().difference(t) < AppDurations.cacheTtl;
  }

  Future<bool> _isDiskCacheValid(String timeKey) async {
    final prefs = await SharedPreferences.getInstance();
    final msStr = prefs.getString(timeKey);
    if (msStr == null) return false;
    final saved = DateTime.fromMillisecondsSinceEpoch(int.parse(msStr));
    return DateTime.now().difference(saved) < AppDurations.cacheTtl;
  }

  // ─── Disk I/O helpers ────────────────────────────────────────────────────
  Future<String?> _diskRead(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  Future<void> _diskWrite(
    String dataKey,
    String timeKey,
    String jsonStr,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(dataKey, jsonStr);
    await prefs.setString(
      timeKey,
      DateTime.now().millisecondsSinceEpoch.toString(),
    );
  }

  // ─── Cache invalidation ───────────────────────────────────────────────────
  static void invalidateMenuCache() {
    _menuCache = null;
    _menuCacheTime = null;
  }

  static void invalidateDashboardCache() {
    _dashboardCache = null;
    _dashboardCacheTime = null;
  }

  static void invalidateAll() {
    _menuCache = null;
    _menuCacheTime = null;
    _dashboardCache = null;
    _dashboardCacheTime = null;
  }

  Future<void> clearDiskCache() async {
    final prefs = await SharedPreferences.getInstance();
    for (final key in [
      _CacheKeys.menuData,
      _CacheKeys.menuTime,
      _CacheKeys.dashboardData,
      _CacheKeys.dashboardTime,
    ]) {
      await prefs.remove(key);
    }
    invalidateAll();
  }

  void dispose() => _client.close();

  // ─── Request helper with Exponential Backoff Retry ───────────────────────
  Future<http.Response> _requestWithRetry(
    Future<http.Response> Function() task,
    String label,
  ) async {
    const maxRetries = 3;
    int attempt = 0;
    while (true) {
      attempt++;
      try {
        return await task().timeout(AppDurations.httpTimeout);
      } catch (e) {
        if (e is SocketException || e is TimeoutException) {
          debugPrint(
            '⚠️ Network failure on $label (attempt $attempt/$maxRetries): $e',
          );
          if (attempt >= maxRetries) return _handleError(e, label);
          await Future.delayed(Duration(milliseconds: 400 * attempt));
        } else {
          return _handleError(e, label);
        }
      }
    }
  }

  Future<http.Response> _get(String path) async {
    final url = await baseUrl;
    return _requestWithRetry(
      () => _client.get(
        Uri.parse('$url$path'),
        headers: AuthService().authHeaders,
      ),
      'GET $path',
    );
  }

  Future<http.Response> _post(String path, Map<String, dynamic> body) async {
    final url = await baseUrl;
    return _requestWithRetry(
      () => _client.post(
        Uri.parse('$url$path'),
        headers: AuthService().authHeaders,
        body: json.encode(body),
      ),
      'POST $path',
    );
  }

  Future<http.Response> _put(String path, Map<String, dynamic> body) async {
    final url = await baseUrl;
    return _requestWithRetry(
      () => _client.put(
        Uri.parse('$url$path'),
        headers: AuthService().authHeaders,
        body: json.encode(body),
      ),
      'PUT $path',
    );
  }

  Future<http.Response> _delete(String path) async {
    final url = await baseUrl;
    return _requestWithRetry(
      () => _client.delete(
        Uri.parse('$url$path'),
        headers: AuthService().authHeaders,
      ),
      'DELETE $path',
    );
  }

  http.Response _handleError(dynamic e, String label) {
    debugPrint('🚨 ApiService Error [$label]: $e');
    if (e is SocketException) {
      throw Exception(
        'Server Unreachable. Please check your network connection.',
      );
    } else if (e is TimeoutException) {
      throw Exception(
        'Request timed out. The server might be busy or unreachable.',
      );
    }
    throw Exception('Unexpected error during $label: $e');
  }

  // ─── Menu (memory → disk → network) ─────────────────────────────────────
  Future<List<MenuItem>> fetchMenuItems({bool forceRefresh = false}) async {
    if (!forceRefresh &&
        _menuCache != null &&
        _isMemoryCacheValid(_menuCacheTime)) {
      return _menuCache!;
    }
    if (!forceRefresh && await _isDiskCacheValid(_CacheKeys.menuTime)) {
      final raw = await _diskRead(_CacheKeys.menuData);
      if (raw != null) {
        try {
          final List<dynamic> d = json.decode(raw);
          _menuCache = d.map((j) => MenuItem.fromJson(j)).toList();
          _menuCacheTime = DateTime.now();
          return _menuCache!;
        } catch (_) {}
      }
    }
    final response = await _get('/menu');
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      _menuCache = data.map((j) => MenuItem.fromJson(j)).toList();
      _menuCacheTime = DateTime.now();
      await _diskWrite(_CacheKeys.menuData, _CacheKeys.menuTime, response.body);
      return _menuCache!;
    }
    throw Exception('Failed to load menu items (${response.statusCode})');
  }

  /// Read stale menu from disk immediately (optimistic cold-start UI).
  Future<List<MenuItem>?> fetchMenuItemsFromDisk() async {
    final raw = await _diskRead(_CacheKeys.menuData);
    if (raw == null) return null;
    try {
      return (json.decode(raw) as List<dynamic>)
          .map((j) => MenuItem.fromJson(j))
          .toList();
    } catch (_) {
      return null;
    }
  }



  Future<Map<String, dynamic>?> fetchDashboardStatsFromDisk() async {
    final raw = await _diskRead(_CacheKeys.dashboardData);
    if (raw == null) return null;
    try {
      return json.decode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ─── Orders (always fresh — real-time data) ───────────────────────────────
  Future<List<Order>> fetchOrders() async {
    final response = await _get('/orders');
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List<dynamic>)
          .map((j) => Order.fromJson(j))
          .toList();
    }
    throw Exception('Failed to load orders (${response.statusCode})');
  }



  // ─── Dashboard Stats (memory → disk → network) ───────────────────────────
  Future<Map<String, dynamic>> fetchDashboardStats({
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh &&
        _dashboardCache != null &&
        _isMemoryCacheValid(_dashboardCacheTime)) {
      return _dashboardCache!;
    }
    if (!forceRefresh && await _isDiskCacheValid(_CacheKeys.dashboardTime)) {
      final raw = await _diskRead(_CacheKeys.dashboardData);
      if (raw != null) {
        try {
          _dashboardCache = json.decode(raw) as Map<String, dynamic>;
          _dashboardCacheTime = DateTime.now();
          return _dashboardCache!;
        } catch (_) {}
      }
    }
    final response = await _get('/dashboard');
    if (response.statusCode == 200) {
      _dashboardCache = json.decode(response.body) as Map<String, dynamic>;
      _dashboardCacheTime = DateTime.now();
      await _diskWrite(
        _CacheKeys.dashboardData,
        _CacheKeys.dashboardTime,
        response.body,
      );
      return _dashboardCache!;
    }
    throw Exception('Failed to load dashboard stats (${response.statusCode})');
  }

  /// Load menu in background for startup optimisation.
  Future<List<MenuItem>> fetchInitialData() async {
    return await fetchMenuItems();
  }

  // ─── Create Order ─────────────────────────────────────────────────────────
  Future<Order> createOrder(Map<String, dynamic> orderData) async {
    final response = await _post('/orders', orderData);
    if (response.statusCode == 200 || response.statusCode == 201) {
      invalidateDashboardCache();
      return Order.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to place order (${response.statusCode})');
  }

  // ─── Update Order Status ──────────────────────────────────────────────────
  Future<void> updateOrderStatus(
    int orderId,
    String status, {
    String? paymentMethod,
    String? customerName,
    String? customerPhone,
  }) async {
    final Map<String, dynamic> body = {'status': status};
    if (paymentMethod != null) body['paymentMethod'] = paymentMethod;
    if (customerName != null && customerName.isNotEmpty) {
      body['customerName'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      body['customerPhone'] = customerPhone;
    }
    final response = await _put('/orders/$orderId', body);
    if (response.statusCode != 200) {
      throw Exception('Failed to update order (${response.statusCode})');
    }
    invalidateDashboardCache();
  }

  // ─── Menu CRUD ────────────────────────────────────────────────────────────
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



  Future<void> deleteMenuItem(int id) async {
    final response = await _delete('/menu/$id');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete menu item (${response.statusCode})');
    }
    invalidateMenuCache();
  }

  // ─── Tables ───────────────────────────────────────────────────────────────
  Future<List<dynamic>> fetchTables() async {
    final response = await _get('/tables');
    if (response.statusCode == 200) {
      return json.decode(response.body) as List<dynamic>;
    }
    throw Exception('Failed to load tables (${response.statusCode})');
  }

  // ─── KDS pending orders ───────────────────────────────────────────────────
  Future<List<Order>> fetchPendingOrders() async {
    final response = await _get('/orders?status=PENDING');
    if (response.statusCode == 200) {
      return (json.decode(response.body) as List<dynamic>)
          .map((j) => Order.fromJson(j))
          .toList();
    }
    throw Exception('Failed to load pending orders (${response.statusCode})');
  }

  // ─── Mark KOT Printed ────────────────────────────────────────────────────
  Future<Order> markKOTPrinted(int orderId) async {
    final response = await _put('/orders/$orderId/kot', {});
    if (response.statusCode == 200) {
      return Order.fromJson(json.decode(response.body));
    }
    throw Exception('Failed to mark KOT printed (${response.statusCode})');
  }
}
