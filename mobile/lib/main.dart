import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const VisionXApp());
}

class VisionXApp extends StatelessWidget {
  const VisionXApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SafeX - Tourist Safety',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF070B14),
        primaryColor: const Color(0xFF06B6D4),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF06B6D4),
          secondary: Color(0xFF3B82F6),
          error: Color(0xFFEF4444),
          surface: Color(0xFF0E1626),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}
