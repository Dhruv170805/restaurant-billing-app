import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/menu_item.dart';
import '../models/order.dart';

class ApiService {
  Future<String> get baseUrl async {
    final prefs = await SharedPreferences.getInstance();
    // Default to local wifi IP for physical device testing
    final customIp = prefs.getString('server_ip') ?? '10.0.2.2';
    return 'http://$customIp:3000/api';
  }

  Future<String> get webUrl async {
    final prefs = await SharedPreferences.getInstance();
    final customIp = prefs.getString('server_ip') ?? '10.0.2.2';
    return 'http://$customIp:3000';
  }

  Future<void> setBaseUrlIP(String ip) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_ip', ip);
  }

  Future<List<MenuItem>> fetchMenuItems() async {
    final url = await baseUrl;
    final response = await http
        .get(Uri.parse('$url/menu'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => MenuItem.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load menu items');
    }
  }

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

  Future<Map<String, dynamic>> fetchSettings() async {
    final url = await baseUrl;
    final response = await http
        .get(Uri.parse('$url/settings'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to load settings');
    }
  }

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
    if (customerName != null && customerName.isNotEmpty)
      reqBody['customerName'] = customerName;
    if (customerPhone != null && customerPhone.isNotEmpty)
      reqBody['customerPhone'] = customerPhone;

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
  }

  Future<void> deleteMenuItem(int id) async {
    final url = await baseUrl;
    final response = await http
        .delete(Uri.parse('$url/menu/$id'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) {
      throw Exception('Failed to delete menu item');
    }
  }
}
