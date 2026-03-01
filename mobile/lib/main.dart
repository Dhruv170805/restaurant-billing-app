import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/pos_provider.dart';
import 'screens/main_layout.dart';

void main() {
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
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF050505),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF37C22),
          secondary: Color(0xFFE61C24),
          surface: Color(0xFF111111),
          onSurface: Colors.white,
          onPrimary: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0A0A0A),
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Colors.white),
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        cardTheme: const CardThemeData(
          color: Color(0xFF111111),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(14)),
            side: BorderSide(color: Color(0x12FFFFFF), width: 1),
          ),
        ),
        dividerColor: const Color(0x12FFFFFF),
      ),
      home: const MainLayout(),
    );
  }
}
