import 'package:flutter/material.dart';

/// Central design token file for NEXUS POS.
/// All colors and gradients are defined here — do NOT inline Color(0xFF...) in screens.

class AppColors {
  AppColors._();

  // ─── Brand ─────────────────────────────────────────────────────────────────
  static const Color orange = Color(0xFFFF6A00);
  static const Color orangeAlt = Color(0xFFFF6B00);
  static const Color red = Color(0xFFFF2E63);
  static const Color redAlt = Color(0xFFE61C24);

  // ─── Semantic ──────────────────────────────────────────────────────────────
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

  // ─── Gradients ─────────────────────────────────────────────────────────────
  static const LinearGradient brandGradient = LinearGradient(
    colors: [orange, red],
  );

  static const LinearGradient greenGradient = LinearGradient(
    colors: [green, greenDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heatGradient = LinearGradient(
    colors: [orange, dangerAlt],
  );
}

/// Timing constants used across screens for caching, auto-refresh, etc.
class AppDurations {
  AppDurations._();

  static const Duration cacheTtl = Duration(minutes: 3);
  static const Duration kdsRefresh = Duration(seconds: 20);
  static const Duration dashboardRefresh = Duration(seconds: 30);
  static const Duration httpTimeout = Duration(seconds: 12);
  static const Duration animFast = Duration(milliseconds: 200);
  static const Duration animMedium = Duration(milliseconds: 350);
  static const Duration animSlow = Duration(milliseconds: 600);
  static const Duration animElastic = Duration(milliseconds: 600);
}

/// KDS: orders flagged after these time thresholds
class AppThresholds {
  AppThresholds._();

  static const int kdsOrangeMinutes = 5;
  static const int kdsRedMinutes = 10;
  static const int dashboardOrangeMinutes = 15;
  static const int dashboardRedMinutes = 30;
}
