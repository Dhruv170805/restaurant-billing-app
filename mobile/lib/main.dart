import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/pos_provider.dart';
import 'screens/main_layout.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
    return MaterialApp(
      title: 'Restaurant Billing',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF000000),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFF6B00),
          secondary: Color(0xFFE61C24),
          surface: Color(0xFF0F0F0F),
          surfaceContainerHighest: Color(0xFF1C1C1E),
          onSurface: Colors.white,
          onPrimary: Colors.white,
        ),
        // App-wide font
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontFamily: 'SF Pro Display',
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
          headlineMedium: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
          headlineSmall: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
          titleLarge: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.3,
          ),
          titleMedium: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w500,
          ),
          bodyLarge: TextStyle(color: Colors.white),
          bodyMedium: TextStyle(color: Color(0xFFAAAAAA)),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Colors.white),
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        cardTheme: const CardThemeData(
          color: Color(0x14FFFFFF),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(18)),
            side: BorderSide(color: Color(0x28FFFFFF), width: 0.5),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0x18FFFFFF),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0x33FFFFFF)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0x28FFFFFF)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFFF6B00), width: 1.5),
          ),
          labelStyle: const TextStyle(color: Color(0xFF888888)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFF6B00),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          ),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: const Color(0x22FFFFFF),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0x33FFFFFF)),
          ),
        ),
        dividerColor: const Color(0x18FFFFFF),
        splashColor: Colors.white.withValues(alpha: 0.05),
        highlightColor: Colors.transparent,
      ),
      home: const MainLayout(),
    );
  }
}
