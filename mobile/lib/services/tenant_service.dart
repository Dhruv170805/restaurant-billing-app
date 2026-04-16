import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class TenantTheme {
  final String primary;
  final String accent;
  final String font;

  TenantTheme({required this.primary, required this.accent, required this.font});

  factory TenantTheme.fromJson(Map<String, dynamic> json) => TenantTheme(
        primary: json['primary'] ?? '#f37c22',
        accent: json['accent'] ?? '#ffffff',
        font: json['font'] ?? 'Inter',
      );

  Color get primaryColor {
    final hex = primary.replaceAll('#', '');
    final value = int.tryParse('FF$hex', radix: 16) ?? 0xFFf37c22;
    return Color(value);
  }
}

class TenantConfig {
  final String slug;
  final String name;
  final String? logoUrl;
  final TenantTheme theme;
  final String currencySymbol;
  final String currencyCode;
  final String currencyLocale;
  final bool taxEnabled;
  final double taxRate;
  final String taxLabel;
  final String plan;
  final String address;
  final String phone;
  final String tagline;
  final Map<String, bool> features;

  TenantConfig({
    required this.slug,
    required this.name,
    this.logoUrl,
    required this.theme,
    required this.currencySymbol,
    required this.currencyCode,
    required this.currencyLocale,
    required this.taxEnabled,
    required this.taxRate,
    required this.taxLabel,
    required this.plan,
    required this.address,
    required this.phone,
    required this.tagline,
    required this.features,
  });

  factory TenantConfig.fromJson(Map<String, dynamic> json) {
    final config = json['config'] as Map<String, dynamic>? ?? {};
    final featuresRaw = json['features'] as Map<String, dynamic>? ?? {};
    return TenantConfig(
      slug: json['slug'] ?? 'default',
      name: json['name'] ?? 'Restaurant',
      logoUrl: json['logoUrl'],
      theme: TenantTheme.fromJson(json['theme'] ?? {}),
      currencySymbol: config['currencySymbol'] ?? '₹',
      currencyCode: config['currencyCode'] ?? 'INR',
      currencyLocale: config['currencyLocale'] ?? 'en-IN',
      taxEnabled: config['taxEnabled'] ?? false,
      taxRate: (config['taxRate'] as num?)?.toDouble() ?? 0.0,
      taxLabel: config['taxLabel'] ?? 'GST',
      plan: json['plan'] ?? 'free',
      address: config['address'] ?? '',
      phone: config['phone'] ?? '',
      tagline: config['tagline'] ?? '',
      features: featuresRaw.map((k, v) => MapEntry(k, v == true)),
    );
  }

  bool hasFeature(String feature) => features[feature] == true;

  // Fallback config for offline
  static TenantConfig get fallback => TenantConfig(
        slug: 'default',
        name: 'Restaurant',
        theme: TenantTheme(primary: '#f37c22', accent: '#ffffff', font: 'Inter'),
        currencySymbol: '₹',
        currencyCode: 'INR',
        currencyLocale: 'en-IN',
        taxEnabled: false,
        taxRate: 0,
        taxLabel: 'GST',
        plan: 'free',
        address: '',
        phone: '',
        tagline: '',
        features: {},
      );
}

class TenantService extends ChangeNotifier {
  static final TenantService _instance = TenantService._internal();
  factory TenantService() => _instance;
  TenantService._internal();

  TenantConfig? _config;
  bool _loading = false;

  TenantConfig get config => _config ?? TenantConfig.fallback;
  bool get loading => _loading;
  bool get loaded => _config != null;

  String get baseUrl => dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:3000';

  // ── Boot tenant config on app startup ─────────────────────────────────────
  Future<void> boot({String? tenantId}) async {
    if (_loading) return;
    _loading = true;

    try {
      final headers = <String, String>{};
      if (tenantId != null) headers['X-Tenant-ID'] = tenantId;

      final res = await http
          .get(Uri.parse('$baseUrl/api/tenant'), headers: headers)
          .timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        _config = TenantConfig.fromJson(data);
      }
    } catch (e) {
      debugPrint('TenantService.boot error: $e — using fallback config');
      // Use fallback — app works offline
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Build MaterialColor from tenant primary hex ──────────────────────────────────────────
  MaterialColor get primaryMaterialColor {
    final color = config.theme.primaryColor;
    // Use Flutter 3.x non-deprecated component accessors
    final int r = (color.r * 255.0).round().clamp(0, 255);
    final int g = (color.g * 255.0).round().clamp(0, 255);
    final int b = (color.b * 255.0).round().clamp(0, 255);
    return MaterialColor(color.toARGB32(), {
      50:  Color.fromRGBO(r, g, b, 0.1),
      100: Color.fromRGBO(r, g, b, 0.2),
      200: Color.fromRGBO(r, g, b, 0.3),
      300: Color.fromRGBO(r, g, b, 0.4),
      400: Color.fromRGBO(r, g, b, 0.5),
      500: Color.fromRGBO(r, g, b, 0.6),
      600: Color.fromRGBO(r, g, b, 0.7),
      700: Color.fromRGBO(r, g, b, 0.8),
      800: Color.fromRGBO(r, g, b, 0.9),
      900: Color.fromRGBO(r, g, b, 1.0),
    });
  }
}
