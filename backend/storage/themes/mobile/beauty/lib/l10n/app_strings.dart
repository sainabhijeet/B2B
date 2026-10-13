import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppStrings extends ChangeNotifier {
  AppStrings._();
  static final instance = AppStrings._();
  Map<String, dynamic> _values = {};
  Locale locale = const Locale('en');
  String t(String key) => _values[key]?.toString() ?? key;
  Future<void> load([Locale value = const Locale('en')]) async {
    locale = value;
    _values =
        jsonDecode(
              await rootBundle.loadString(
                'assets/locales/${value.languageCode}.json',
              ),
            )
            as Map<String, dynamic>;
    notifyListeners();
  }

  Future<void> toggle() =>
      load(Locale(locale.languageCode == 'en' ? 'hi' : 'en'));
}
