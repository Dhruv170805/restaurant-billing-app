import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AuthUser {
  final String id;
  final String email;
  final String name;
  final List<String> roles;
  final String tenantId;

  AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.roles,
    required this.tenantId,
  });

  bool get isAdmin => roles.contains('admin') || roles.contains('superadmin');
  bool get isCashier => roles.contains('cashier') || isAdmin;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'],
        email: json['email'],
        name: json['name'],
        roles: List<String>.from(json['roles'] ?? []),
        tenantId: json['tenantId'],
      );
}

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUser = 'user_json';

  String get _baseUrl => dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:3000';

  AuthUser? _user;
  String? _accessToken;
  bool _initialized = false;

  AuthUser? get user => _user;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _user != null && _accessToken != null;
  bool get initialized => _initialized;

  // ── Initialize from secure storage ──────────────────────────────────────────
  Future<void> initialize() async {
    try {
      final token = await _storage.read(key: _keyAccessToken);
      final userJson = await _storage.read(key: _keyUser);

      if (token != null && userJson != null) {
        _accessToken = token;
        _user = AuthUser.fromJson(jsonDecode(userJson));

        // Try to silently refresh if close to expiry
        await _silentRefresh();
      }
    } catch (e) {
      debugPrint('AuthService.initialize error: $e');
      await _clearStorage();
    } finally {
      _initialized = true;
      notifyListeners();
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? totp,
    String? tenantId,
  }) async {
    final body = {
      'email': email,
      'password': password,
      ...?totp != null ? {'totp': totp} : null,
    };

    final headers = {
      'Content-Type': 'application/json',
      ...?tenantId != null ? {'X-Tenant-ID': tenantId} : null,
    };

    final res = await http.post(
      Uri.parse('$_baseUrl/api/auth/login'),
      headers: headers,
      body: jsonEncode(body),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;

    if (res.statusCode == 401 && data['totpRequired'] == true) {
      return {'totpRequired': true};
    }

    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Login failed');
    }

    // Persist tokens
    _accessToken = data['accessToken'];
    await _storage.write(key: _keyAccessToken, value: data['accessToken']);
    await _storage.write(key: _keyRefreshToken, value: data['refreshToken'] ?? '');
    _user = AuthUser.fromJson(data['user']);
    await _storage.write(key: _keyUser, value: jsonEncode(data['user']));

    notifyListeners();
    return data;
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    final refreshToken = await _storage.read(key: _keyRefreshToken);
    try {
      await http.post(
        Uri.parse('$_baseUrl/api/auth/logout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_accessToken',
        },
        body: jsonEncode({'refreshToken': refreshToken}),
      );
    } catch (e) {
      debugPrint('Logout API call failed: $e');
    }

    await _clearStorage();
    _user = null;
    _accessToken = null;
    notifyListeners();
  }

  // ── Silent token refresh ──────────────────────────────────────────────────
  Future<bool> _silentRefresh() async {
    final refreshToken = await _storage.read(key: _keyRefreshToken);
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        _accessToken = data['accessToken'];
        await _storage.write(key: _keyAccessToken, value: _accessToken!);
        return true;
      }
    } catch (e) {
      debugPrint('Silent refresh failed: $e');
    }

    return false;
  }

  // ── Auth header helper (call before every API request) ────────────────────
  Map<String, String> get authHeaders => {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
        if (_user != null) 'X-Tenant-ID': _user!.tenantId,
      };

  // ── Handle 401 from any API call ──────────────────────────────────────────
  Future<bool> handleUnauthorized() async {
    final refreshed = await _silentRefresh();
    if (!refreshed) {
      await _clearStorage();
      _user = null;
      _accessToken = null;
      notifyListeners();
    }
    return refreshed;
  }

  Future<void> _clearStorage() async {
    await _storage.deleteAll();
  }
}
