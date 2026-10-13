import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/auth_token_storage.dart';
import '../../core/api/api_client.dart';
import '../../core/api/dio_errors.dart';
import '../../core/device/storefront_device.dart';
import '../../core/logging/ui_error_log.dart';

class AuthState {
  const AuthState({
    required this.mobile,
    required this.isLoading,
    this.token,
    this.error,
  });

  final String mobile;
  final String? token;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => token != null && token!.isNotEmpty;

  AuthState copyWith({
    String? mobile,
    String? token,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      mobile: mobile ?? this.mobile,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

String storefrontMobileDigits(String raw) {
  return raw.replaceAll(RegExp(r'\D'), '');
}

Future<String> storefrontDeviceId() =>
    StorefrontDevice.ensureStorefrontDeviceId();

String? storefrontDevelopmentOtp(Object? responseData) {
  if (responseData is! Map) return null;
  Object? candidate = responseData['developmentCode'];
  final nested = responseData['data'];
  if (candidate == null && nested is Map) {
    candidate = nested['developmentCode'];
  }
  final code = candidate?.toString().trim() ?? '';
  return RegExp(r'^\d{6}$').hasMatch(code) ? code : null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._ref)
      : super(const AuthState(mobile: '', isLoading: false));

  final Ref _ref;

  void _emit(AuthState next) {
    final String? err = next.error;
    if (err != null) logScreenError('auth', err);
    state = next;
  }

  /// Same as web -> POST /storefront/customer/login.
  Future<String?> loginWithOtp({required String mobile}) async {
    final digits = storefrontMobileDigits(mobile);
    if (digits.length != 10) {
      _emit(state.copyWith(
        isLoading: false,
        error: 'Mobile number must be exactly 10 digits.',
      ));
      return null;
    }

    _emit(state.copyWith(isLoading: true, mobile: digits, error: null));
    final dio = _ref.read(apiClientProvider);
    try {
      final res = await dio.post<Map<String, dynamic>>(
        '/storefront/customer/login',
        data: <String, dynamic>{'mobile': digits},
      );
      _emit(state.copyWith(isLoading: false, error: null));
      return storefrontDevelopmentOtp(res.data);
    } on DioException catch (e) {
      _emit(state.copyWith(isLoading: false, error: describeDioError(e)));
      return null;
    }
  }

  /// Same as web -> POST /storefront/customer/verify-otp.
  Future<void> verifyOtp(String otp, {String? mobileFromField}) async {
    final raw = (mobileFromField != null && mobileFromField.trim().isNotEmpty)
        ? mobileFromField
        : state.mobile;
    final digits = storefrontMobileDigits(raw);
    if (digits.length != 10) {
      _emit(state.copyWith(
        isLoading: false,
        error: 'Enter a 10 digit mobile number and request OTP before Verify.',
      ));
      return;
    }

    final code = otp.replaceAll(RegExp(r'\D'), '');
    if (code.length != 6) {
      _emit(state.copyWith(
        isLoading: false,
        error: 'OTP must be exactly 6 digits.',
      ));
      return;
    }

    _emit(state.copyWith(isLoading: true, mobile: digits, error: null));
    final dio = _ref.read(apiClientProvider);
    try {
      final deviceId = await storefrontDeviceId();
      final res = await dio.post<Map<String, dynamic>>(
        '/storefront/customer/verify-otp',
        data: <String, dynamic>{
          'mobile': digits,
          'code': code,
          'deviceId': deviceId,
        },
      );
      final token = extractAccessToken(res.data);
      final refreshToken = extractRefreshToken(res.data);
      if (token == null || token.isEmpty || refreshToken == null) {
        throw StateError(
          'Missing login tokens in verify-otp response (keys: ${res.data is Map ? (res.data as Map).keys.join(',') : res.data}).',
        );
      }
      await const AuthTokenStorage().writeTokens(
        accessToken: token,
        refreshToken: refreshToken,
      );
      _ref.read(authTokenProvider.notifier).state = token;
      _emit(state.copyWith(token: token, isLoading: false, error: null));
    } on DioException catch (e) {
      _emit(state.copyWith(isLoading: false, error: describeDioError(e)));
    } catch (e) {
      _emit(state.copyWith(isLoading: false, error: '$e'));
    }
  }

  Future<void> logout() async {
    await const AuthTokenStorage().clear();
    _ref.read(authTokenProvider.notifier).state = null;
    _emit(const AuthState(mobile: '', isLoading: false));
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (Ref ref) => AuthNotifier(ref),
);
