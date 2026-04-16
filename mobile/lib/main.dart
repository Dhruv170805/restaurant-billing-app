import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:provider/provider.dart';
import 'providers/pos_provider.dart';
import 'screens/main_layout.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';
import 'services/tenant_service.dart';
import 'services/socket_service.dart';
import 'services/api_service.dart';
import 'utils/app_colors.dart';

void main() async {
  final binding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: binding);

  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    debugPrint('Error loading .env: $e');
  }

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize auth + tenant before first frame
  final authService = AuthService();
  final tenantService = TenantService();

  await authService.initialize();

  // Boot tenant config (uses tenantId from auth if available)
  await tenantService.boot(
    tenantId: authService.user?.tenantId,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authService),
        ChangeNotifierProvider.value(value: tenantService),
        ChangeNotifierProvider(create: (_) => PosProvider()),
      ],
      child: const RestaurantBillingApp(),
    ),
  );

  _runBackgroundTasks();
}

Future<void> _runBackgroundTasks() async {
  FlutterNativeSplash.remove();
  try {
    final api = ApiService();
    await Future.wait([
      api.fetchMenuItemsFromDisk(),
      api.fetchDashboardStatsFromDisk(),
    ]);
  } catch (_) {}
  SocketService().init();
}

class RestaurantBillingApp extends StatelessWidget {
  const RestaurantBillingApp({super.key});

  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();
    final tenant = context.watch<TenantService>();
    final auth = context.watch<AuthService>();

    final String themeSetting = pos.settings['theme'] ?? 'system';
    ThemeMode themeMode = switch (themeSetting) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };

    // Use tenant primary color for the color scheme
    final primaryColor = tenant.config.theme.primaryColor;

    return MaterialApp(
      title: tenant.config.name,
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        colorScheme: ColorScheme.dark(
          primary: primaryColor,
          secondary: AppColors.redAlt,
          surface: Colors.black,
          onSurface: Colors.white,
          onPrimary: Colors.white,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(color: Colors.white),
          headlineMedium: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: -0.5),
          bodyLarge: TextStyle(color: Colors.white),
          bodyMedium: TextStyle(color: Color(0xFFB0B0B0)),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
        ),
        cardTheme: const CardThemeData(
          color: Color(0x18FFFFFF),
          shadowColor: Colors.black45,
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
            side: BorderSide(color: Color(0x33FFFFFF), width: 0.5),
          ),
        ),
        dividerColor: const Color(0x22FFFFFF),
      ),
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF4F6F9),
        colorScheme: ColorScheme.light(
          primary: primaryColor,
          secondary: AppColors.redAlt,
          surface: Colors.white,
          onSurface: const Color(0xFF1A1A1A),
          onPrimary: Colors.white,
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(color: Color(0xFF1A1A1A)),
          headlineMedium: TextStyle(color: Color(0xFF1A1A1A), fontWeight: FontWeight.w800, letterSpacing: -0.5),
          bodyLarge: TextStyle(color: Color(0xFF1A1A1A)),
          bodyMedium: TextStyle(color: Color(0xFF666666)),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(color: Color(0xFF1A1A1A), fontSize: 18, fontWeight: FontWeight.w800),
          iconTheme: IconThemeData(color: Color(0xFF1A1A1A)),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 12,
          shadowColor: Color(0x15000000),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
            side: BorderSide(color: Color(0x0A000000), width: 1),
          ),
        ),
        dividerColor: const Color(0x0F000000),
      ),
      // Auth guard: show LoginScreen if not authenticated
      home: auth.initialized
          ? (auth.isAuthenticated ? const MainLayout() : const LoginScreen())
          : const _SplashGate(),
    );
  }
}

/// Shown only while AuthService.initialize() is in progress (should be <200ms).
class _SplashGate extends StatelessWidget {
  const _SplashGate();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: CircularProgressIndicator(color: AppColors.orangeAlt),
      ),
    );
  }
}
