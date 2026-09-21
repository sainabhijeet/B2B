import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'ui_error_log.dart';

/// Logs whenever a provider’s exposed value becomes [AsyncValue] with an error
/// (cart, orders, [FutureProvider]s like products / theme, etc.).
class ScreenErrorProviderObserver extends ProviderObserver {
  @override
  void didAddProvider(
    ProviderBase<Object?> provider,
    Object? value,
    ProviderContainer container,
  ) {
    _logIfAsyncError(provider, value);
  }

  @override
  void didUpdateProvider(
    ProviderBase<Object?> provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    _logIfAsyncError(provider, newValue);
  }

  void _logIfAsyncError(ProviderBase<Object?> provider, Object? value) {
    if (value is! AsyncError<dynamic>) return;
    final AsyncError<dynamic> av = value;
    final String scope = provider.name ?? provider.runtimeType.toString();
    logScreenError(scope, av.error, av.stackTrace);
  }
}
