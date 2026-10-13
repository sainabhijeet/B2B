import 'package:dio/dio.dart';

/// Nest `GlobalExceptionFilter` + default validation errors.
String describeDioError(DioException e) {
  final status = e.response?.statusCode;
  final raw = e.response?.data;
  if (raw is Map) {
    final msg = _responseMessage(raw);
    if (msg is List) {
      return '${status != null ? '[$status] ' : ''}${msg.join(', ')}';
    }
    if (msg is String && msg.trim().isNotEmpty) {
      return '${status != null ? '[$status] ' : ''}$msg';
    }
    return '${status != null ? '[$status] ' : ''}${raw.toString()}';
  }
  if (raw is String && raw.trim().isNotEmpty) {
    return '${status != null ? '[$status] ' : ''}$raw';
  }
  return '${status != null ? '[$status] ' : ''}${e.message ?? 'Request failed'}';
}

Object? _responseMessage(Map<dynamic, dynamic> body) {
  final Object? direct = body['message'] ?? body['error'];
  if (direct is Map) {
    return direct['message'] ?? direct['error'] ?? direct['description'];
  }
  return direct;
}

/// `POST /storefront/customer/verify-otp` returns tokens at JSON root (same as curl).
String? extractAccessToken(dynamic body) {
  if (body is! Map) return null;
  final m = Map<String, dynamic>.from(body);
  final direct = m['accessToken'] ?? m['access_token'];
  if (direct is String && direct.trim().isNotEmpty) return direct.trim();
  final nested = m['data'];
  if (nested is Map) {
    final nm = Map<String, dynamic>.from(nested);
    final t = nm['accessToken'] ?? nm['access_token'];
    if (t is String && t.trim().isNotEmpty) return t.trim();
  }
  return null;
}

String? extractRefreshToken(dynamic body) {
  if (body is! Map) return null;
  final m = Map<String, dynamic>.from(body);
  final direct = m['refreshToken'] ?? m['refresh_token'];
  if (direct is String && direct.trim().isNotEmpty) return direct.trim();
  final nested = m['data'];
  if (nested is Map) {
    final nm = Map<String, dynamic>.from(nested);
    final token = nm['refreshToken'] ?? nm['refresh_token'];
    if (token is String && token.trim().isNotEmpty) return token.trim();
  }
  return null;
}
