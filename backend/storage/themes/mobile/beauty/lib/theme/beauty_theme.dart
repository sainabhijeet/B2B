import 'package:flutter/material.dart';

abstract final class BeautyColors {
  static const primary = Color(0xFFC2185B),
      secondary = Color(0xFFF8BBD0),
      accent = Color(0xFF8E24AA),
      success = Color(0xFF16A34A),
      background = Color(0xFFFFF8FB),
      surface = Colors.white,
      ink = Color(0xFF1F2937),
      muted = Color(0xFF6B7280),
      border = Color(0xFFF3D5E2);
}

ThemeData beautyTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: BeautyColors.primary,
    brightness: Brightness.light,
    surface: BeautyColors.surface,
    error: const Color(0xFFDC2626),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: BeautyColors.background,
    fontFamily: 'sans-serif',
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: BeautyColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: BeautyColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: BeautyColors.border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(44, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: BeautyColors.secondary.withValues(alpha: .45),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontSize: 12,
          fontWeight: s.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
          color: s.contains(WidgetState.selected)
              ? BeautyColors.primary
              : BeautyColors.muted,
        ),
      ),
    ),
  );
}
