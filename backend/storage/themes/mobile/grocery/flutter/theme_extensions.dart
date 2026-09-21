import 'package:flutter/material.dart';

@immutable
class GroceryThemeTokens extends ThemeExtension<GroceryThemeTokens> {
  const GroceryThemeTokens({
    required this.successSoft,
    required this.warning,
    required this.wholesaleDeal,
    required this.cardRadius,
    required this.sectionGap,
  });

  final Color successSoft;
  final Color warning;
  final Color wholesaleDeal;
  final double cardRadius;
  final double sectionGap;

  static const light = GroceryThemeTokens(
    successSoft: Color(0xFFDDFBE8),
    warning: Color(0xFFF59E0B),
    wholesaleDeal: Color(0xFF0F766E),
    cardRadius: 8,
    sectionGap: 18,
  );

  static const dark = GroceryThemeTokens(
    successSoft: Color(0xFF123D25),
    warning: Color(0xFFFBBF24),
    wholesaleDeal: Color(0xFF5EEAD4),
    cardRadius: 8,
    sectionGap: 18,
  );

  @override
  GroceryThemeTokens copyWith({
    Color? successSoft,
    Color? warning,
    Color? wholesaleDeal,
    double? cardRadius,
    double? sectionGap,
  }) {
    return GroceryThemeTokens(
      successSoft: successSoft ?? this.successSoft,
      warning: warning ?? this.warning,
      wholesaleDeal: wholesaleDeal ?? this.wholesaleDeal,
      cardRadius: cardRadius ?? this.cardRadius,
      sectionGap: sectionGap ?? this.sectionGap,
    );
  }

  @override
  GroceryThemeTokens lerp(ThemeExtension<GroceryThemeTokens>? other, double t) {
    if (other is! GroceryThemeTokens) return this;
    return GroceryThemeTokens(
      successSoft: Color.lerp(successSoft, other.successSoft, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      wholesaleDeal: Color.lerp(wholesaleDeal, other.wholesaleDeal, t)!,
      cardRadius: lerpDouble(cardRadius, other.cardRadius, t)!,
      sectionGap: lerpDouble(sectionGap, other.sectionGap, t)!,
    );
  }
}

ThemeData groceryThemeData(Brightness brightness, {Color? seedColor}) {
  final bool dark = brightness == Brightness.dark;
  final Color seed = seedColor ?? const Color(0xFF138A43);
  final ColorScheme scheme = ColorScheme.fromSeed(seedColor: seed, brightness: brightness);
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? const Color(0xFF0B120E) : const Color(0xFFF7FBF8),
    cardTheme: CardThemeData(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF16221B) : Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    extensions: <ThemeExtension<dynamic>>[
      dark ? GroceryThemeTokens.dark : GroceryThemeTokens.light,
    ],
  );
}
