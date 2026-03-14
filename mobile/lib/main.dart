import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/pos_provider.dart';
import 'screens/main_layout.dart';
import 'services/socket_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
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
          // ─── DARK THEME (Existing) ──────────────────────────────────────────
          darkTheme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.dark,
            scaffoldBackgroundColor: const Color(0xFF000000),
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFFFF6B00),
              secondary: Color(0xFFE61C24),
              surface: Color(0xFF0F0F0F),
              onSurface: Colors.white,
              onPrimary: Colors.white,
            ),
            textTheme: const TextTheme(
              displayLarge: TextStyle(color: Colors.white),
              headlineMedium: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
              bodyLarge: TextStyle(color: Colors.white),
              bodyMedium: TextStyle(color: Color(0xFFAAAAAA)),
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
              color: Color(0x14FFFFFF),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(18)),
                side: BorderSide(color: Color(0x28FFFFFF), width: 0.5),
              ),
            ),
            dividerColor: const Color(0x18FFFFFF),
          ),
          // ─── LIGHT THEME (New) ──────────────────────────────────────────────
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
            scaffoldBackgroundColor: const Color(0xFFF8FAFf),
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFFF6B00),
              secondary: Color(0xFFE61C24),
              surface: Colors.white,
              onSurface: Color(0xFF1A1A1A),
              onPrimary: Colors.white,
            ),
            textTheme: const TextTheme(
              displayLarge: TextStyle(color: Color(0xFF1A1A1A)),
              headlineMedium: TextStyle(
                color: Color(0xFF1A1A1A),
                fontWeight: FontWeight.w700,
              ),
              bodyLarge: TextStyle(color: Color(0xFF1A1A1A)),
              bodyMedium: TextStyle(color: Color(0xFF666666)),
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Colors.white,
              elevation: 0,
              centerTitle: true,
              titleTextStyle: TextStyle(
                color: Color(0xFF1A1A1A),
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
              iconTheme: IconThemeData(color: Color(0xFF1A1A1A)),
            ),
            cardTheme: const CardThemeData(
              color: Colors.white,
              elevation: 2,
              shadowColor: Color(0x10000000),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(18)),
                side: BorderSide(color: Color(0x10000000), width: 0.5),
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
