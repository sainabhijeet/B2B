import 'package:flutter/foundation.dart';

void logScreenError(String scope, Object error, [StackTrace? stackTrace]) {
  debugPrint('[screen_error][$scope]');
}
