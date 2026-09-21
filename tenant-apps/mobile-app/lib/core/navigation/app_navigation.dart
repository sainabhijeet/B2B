import 'package:flutter_riverpod/flutter_riverpod.dart';

const String checkoutRouteName = '/checkout';

/// Bottom navigation index for [MobileApp] shell.
final selectedTabProvider = StateProvider<int>((_) => 0);

/// Controls the shell back arrow only for sections opened from the Home drawer.
final tabOpenedFromDrawerProvider = StateProvider<bool>((_) => false);
