import 'dart:io' show Platform;

String defaultApiBaseForDevice() {
  if (Platform.isAndroid) {
    return 'http://10.0.2.2:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
}
