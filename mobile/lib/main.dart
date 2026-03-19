import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'providers/pos_provider.dart';
import 'screens/main_layout.dart';
import 'services/socket_service.dart';
import 'utils/app_colors.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await dotenv.load(fileName: ".env");
  
  // Start real-time sync service
  SocketService().init();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );
  runApp(
    MultiProvider(
      providers: [ChangeNotifierProvider(create: (_) => PosProvider())],
      child: const RestaurantBillingApp(),
    ),
  );
}

class RestaurantBillingApp extends StatelessWidget {
  const RestaurantBillingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PosProvider>(
      builder: (context, pos, _) {
        final String themeSetting = pos.settings['theme'] ?? 'system';
        ThemeMode themeMode;
        switch (themeSetting) {
          case 'light':
            themeMode = ThemeMode.light;
            break;
          case 'dark':
            themeMode = ThemeMode.dark;
            break;
          default:
            themeMode = ThemeMode.system;
        }

        return MaterialApp(
          title: 'Restaurant Billing',
          debugShowCheckedModeBanner: false,
          themeMode: themeMode,
          // ─── DARK THEME (Liquid Glass SaaS) ──────────────────────────────────────────
          darkTheme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.dark,
            scaffoldBackgroundColor: Colors.black,
            colorScheme: const ColorScheme.dark(
              primary: AppColors.orangeAlt,
              secondary: AppColors.redAlt,
              surface: Colors.black,
              onSurface: Colors.white,
              onPrimary: Colors.white,
            ),
            textTheme: const TextTheme(
              displayLarge: TextStyle(color: Colors.white),
              headlineMedium: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
              bodyLarge: TextStyle(color: Colors.white),
              bodyMedium: TextStyle(color: Color(0xFFB0B0B0)),
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              titleTextStyle: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
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
          // ─── LIGHT THEME (Premium SaaS Light) ──────────────────────────────────────────────
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
            scaffoldBackgroundColor: const Color(0xFFF4F6F9),
            colorScheme: const ColorScheme.light(
              primary: AppColors.orangeAlt,
              secondary: AppColors.redAlt,
              surface: Colors.white,
              onSurface: Color(0xFF1A1A1A),
              onPrimary: Colors.white,
            ),
            textTheme: const TextTheme(
              displayLarge: TextStyle(color: Color(0xFF1A1A1A)),
              headlineMedium: TextStyle(
                color: Color(0xFF1A1A1A),
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
              bodyLarge: TextStyle(color: Color(0xFF1A1A1A)),
              bodyMedium: TextStyle(color: Color(0xFF666666)),
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: true,
              titleTextStyle: TextStyle(
                color: Color(0xFF1A1A1A),
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
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
          home: const MainLayout(),
        );
      },
    );
  }
}
