import 'language_contract.dart';

/// Flutter-side adapter for the Enterprise LocalizationService contract.
///
/// The mobile app no longer owns an independent language resolver or embedded
/// translation catalog. It consumes the same language contract emitted by the
/// backend/website path and keeps text rendering behind one service boundary.
class MobileLocalizationService {
  const MobileLocalizationService({
    required this.contract,
    this.dictionary = const <String, String>{},
    this.defaultCurrency = 'INR',
  });

  final LocalizationContract contract;
  final Map<String, String> dictionary;
  final String defaultCurrency;

  String translate(String key, {String? defaultValue}) {
    final String normalized = key.trim();
    if (normalized.isEmpty) return '';
    final String? translated = _lookup(normalized);
    if (translated != null && translated.trim().isNotEmpty) {
      return translated;
    }
    return defaultValue ?? normalized;
  }

  String? _lookup(String key) {
    final exact = dictionary[key];
    if (exact != null) return exact;

    final lower = key.toLowerCase();
    final lowerExact = dictionary[lower];
    if (lowerExact != null) return lowerExact;

    for (final candidate in _dictionaryCandidates(lower)) {
      final translated = dictionary[candidate];
      if (translated != null && translated.trim().isNotEmpty) {
        return translated;
      }
    }
    return null;
  }

  Iterable<String> _dictionaryCandidates(String lowerKey) sync* {
    final direct = _staticKeyAliases[lowerKey];
    if (direct != null) {
      yield* direct;
    }

    final compact = lowerKey
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList(growable: false);
    if (compact.isEmpty) return;

    final camel = compact.first +
        compact.skip(1).map((part) {
          if (part.isEmpty) return part;
          return part[0].toUpperCase() + part.substring(1);
        }).join();
    yield 'common.$camel';
    yield 'theme.$camel';
    yield 'themeHome.$camel';
    yield 'cart.$camel';
    yield 'orders.$camel';
    yield 'credit.$camel';
    yield 'auth.$camel';
    yield 'settings.$camel';
    yield 'product.$camel';
    yield 'category.names.$camel';
    yield 'category.terms.$camel';
    yield 'storefrontHome.$camel';
    yield 'errors.$camel';
  }

  String t(String key, {String? defaultValue}) {
    return translate(key, defaultValue: defaultValue);
  }

  String formatCurrency(num value, {String? currency}) {
    return formatCurrencyValue(
      value,
      contract.languageCode,
      currency ?? defaultCurrency,
    );
  }

  String formatNumber(num value) {
    return formatNumberValue(value, contract.languageCode);
  }

  String formatDate(DateTime value) {
    return formatDateValue(value, contract.languageCode);
  }

  String formatDateTime(DateTime value) {
    return formatDateTimeValue(value, contract.languageCode);
  }
}

String formatCurrencyValue(num value, String? language, String currency) {
  return formatCurrency(value, language, currency);
}

String formatNumberValue(num value, String? language) {
  return formatNumber(value, language);
}

String formatDateValue(DateTime value, String? language) {
  return formatDate(value, language);
}

String formatDateTimeValue(DateTime value, String? language) {
  return formatDateTime(value, language);
}

const Map<String, List<String>> _staticKeyAliases = <String, List<String>>{
  'home': <String>['common.home'],
  'cart': <String>['common.cart', 'cart.title'],
  'category': <String>['common.category'],
  'categories': <String>['common.categories'],
  'orders': <String>['common.orders', 'orders.title'],
  'profile': <String>['common.profile', 'common.account'],
  'credit': <String>['common.credit', 'credit.title'],
  'settings': <String>['common.settings'],
  'auth': <String>['common.auth', 'common.login'],
  'app': <String>['settings.app'],
  'language': <String>['settings.language'],
  'guest cart': <String>['cart.guestCart', 'settings.guestCart'],
  'notifications': <String>['settings.notifications'],
  'qty': <String>['ordersExtra.qty', 'product.quantity'],
  'total': <String>['cart.total'],
  'retry': <String>['common.retry', 'errors.tryAgain'],
  'price on request': <String>['product.priceOnRequest'],
  'mobile': <String>['auth.mobileLabel'],
  '10 digit mobile number': <String>['auth.mobileHint'],
  'request otp': <String>['auth.requestOtp'],
  'otp': <String>['auth.otpLabel'],
  '6 digit otp': <String>['auth.otpHint'],
  'verify': <String>['auth.verify'],
  'sign in': <String>['common.signIn'],
  'login to order': <String>['orders.loginToOrder'],
  'limit': <String>['credit.limit'],
  'outstanding': <String>['credit.outstanding'],
  'usage': <String>['credit.usage'],
  'cart error': <String>['cart.error'],
  'credit error': <String>['credit.error'],
  'cart total': <String>['cart.total'],
  'credit available': <String>['credit.available'],
  'credit data is not available yet.': <String>['credit.notAvailable'],
  'credit limits and usage are available after you sign in.': <String>[
    'credit.limitsAfterSignIn'
  ],
  'credit view is turned off for this store.': <String>['credit.viewOff'],
  'sign in to view orders and place new ones.': <String>['orders.signInToView'],
  'orders / repeat order is turned off for this store.': <String>[
    'orders.repeatOff'
  ],
  'sign in with your registered retailer mobile number.': <String>[
    'auth.registeredMobileHint'
  ],
  'sign in before checkout to link this device cart to your account.': <String>[
    'cart.signInBeforeCheckout'
  ],
  'sign in on the auth tab to use your cart. this store requires login for checkout.':
      <String>['cart.signInToUse'],
  'orders are disabled for this store.': <String>['orders.disabled'],
  'credit is disabled for this store.': <String>['credit.disabled'],
  'sign in to use the cart for this store.': <String>['cart.signInToUse'],
  'sign in to view orders or credit.': <String>['credit.signInToView'],
  'sign in to add items to your cart.': <String>['cart.signInToUse'],
  'seasonal offers for your business': <String>['storefrontHome.specialOffer'],
  'health essentials with simple ordering.': <String>[
    'theme.healthEssentialsTitle'
  ],
  'a calm mobile theme for pharmacy, wellness, and care products.': <String>[
    'theme.healthEssentialsSubtitle'
  ],
  'order essentials': <String>['theme.orderEssentials'],
  'health categories': <String>['theme.healthCategories'],
  'care essentials': <String>['theme.careEssentials'],
  'demo visuals are included; tenant products render from catalog data.':
      <String>['theme.demoVisualsCatalog'],
};
