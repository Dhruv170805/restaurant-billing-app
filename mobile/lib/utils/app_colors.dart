import 'package:flutter/material.dart';
import '../services/tenant_service.dart';

/// Central design token file for NEXUS POS.
/// All colors and gradients are dynamic and adapt to the tenant context.

class AppColors {
  AppColors._();

  static final _tenant = TenantService();

  // ─── Brand (Dynamic) ───────────────────────────────────────────────────────
  static Color get primary => _tenant.config.theme.primaryColor;
  
  static Color get accent {
    final hex = _tenant.config.theme.accent.replaceAll('#', '');
    final value = int.tryParse('FF$hex', radix: 16) ?? 0xFFFF2E63; // Fallback to red
    return Color(value);
  }

  // legacy aliases for backward compatibility
  static Color get orange => primary;
  static Color get orangeAlt => primary;
  static Color get red => accent;
  static Color get redAlt => accent;

  // ─── Semantic (Static) ─────────────────────────────────────────────────────
  static const Color green = Color(0xFF22C55E);
  static const Color greenDark = Color(0xFF16A34A);
  static const Color greenAlt = Color(0xFF30D158); // iOS system green
  static const Color blue = Color(0xFF0A84FF);
  static const Color amber = Color(0xFFFF9500);
  static const Color amberAlt = Color(0xFFFFCC00);
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerAlt = Color(0xFFFF3B30);
  static const Color warning = Color(0xFFFFCC00);

  // ─── Surface / Glass ───────────────────────────────────────────────────────
  static const Color surfaceDark = Color(0xFF050510);
  static const Color glassWhite06 = Color(0x0FFFFFFF);
  static const Color glassWhite10 = Color(0x1AFFFFFF);
  static const Color glassWhite15 = Color(0x26FFFFFF);
  static const Color glassWhite25 = Color(0x40FFFFFF);
  static const Color glassWhite30 = Color(0x4DFFFFFF);
  static const Color borderSubtle = Color(0x18FFFFFF);
  static const Color borderMid = Color(0x28FFFFFF);

  // ─── Text ──────────────────────────────────────────────────────────────────
  static const Color muted = Color(0xFF888888);
  static const Color subtle = Color(0xFF555555);

  // ─── Gradients (Dynamic) ───────────────────────────────────────────────────
  static LinearGradient get brandGradient => LinearGradient(
    colors: [primary, accent],
  );

  static const LinearGradient greenGradient = LinearGradient(
    colors: [green, greenDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static LinearGradient get heatGradient => LinearGradient(
    colors: [primary, dangerAlt],
  );
}

/// KDS: orders flagged after these time thresholds
class AppThresholds {
  AppThresholds._();

  static const int kdsOrangeMinutes = 5;
  static const int kdsRedMinutes = 10;
  static const int dashboardOrangeMinutes = 15;
  static const int dashboardRedMinutes = 30;
}
