import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../../core/config/user_app_settings_provider.dart';
import '../../core/localization/language_provider.dart';
import '../../core/localization/mobile_localization_service.dart';
import '../b2b/b2b_screens.dart';
import 'customer_profile_provider.dart';
import 'settings_detail_screens.dart';

String _absoluteProfileImageUrl(WidgetRef ref, String rawUrl) {
  final String url = rawUrl.trim();
  if (url.isEmpty || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  final dio = ref.watch(apiClientProvider);
  final String origin =
      dio.options.baseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');
  return '$origin$url';
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  void _open(BuildContext context, Widget screen) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (BuildContext context) => screen),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final UserAppSettings settings = ref.watch(userAppSettingsProvider);
    final configState = ref.watch(storefrontAppConfigProvider);
    final config = configState.asData?.value;
    final String? token = ref.watch(authTokenProvider);
    final bool signedIn = token != null && token.isNotEmpty;
    final AsyncValue<CustomerProfile?> profileState =
        ref.watch(customerProfileProvider);
    final CustomerProfile? profile = profileState.asData?.value;
    final String profileName = profile?.name.trim() ?? '';
    final String profileEmail = profile?.email.trim() ?? '';
    final String profileImageUrl = _absoluteProfileImageUrl(
      ref,
      profile?.profileImageUrl ?? '',
    );
    final ThemeData theme = Theme.of(context);
    final ColorScheme colors = theme.colorScheme;
    final localizer = ref.watch(mobileLocalizationServiceProvider);
    String text(String key, String fallback) =>
        localizer.t(key, defaultValue: fallback);

    return ListView(
      padding: const EdgeInsets.only(bottom: 112),
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Material(
            color: colors.primaryContainer,
            borderRadius: BorderRadius.circular(8),
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => _open(context, const AccountProfileScreen()),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: <Widget>[
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: colors.primary,
                      foregroundColor: colors.onPrimary,
                      backgroundImage: signedIn && profileImageUrl.isNotEmpty
                          ? NetworkImage(profileImageUrl)
                          : null,
                      child: signedIn && profileImageUrl.isNotEmpty
                          ? null
                          : signedIn && profileName.isNotEmpty
                              ? Text(
                                  profileName[0].toUpperCase(),
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    color: colors.onPrimary,
                                    fontWeight: FontWeight.w900,
                                  ),
                                )
                              : const Icon(Icons.person_outline),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            signedIn
                                ? profileName.isNotEmpty
                                    ? profileName
                                    : text(
                                        'settings.yourAccount',
                                        'Your account',
                                      )
                                : text(
                                    'settings.signInToAccount',
                                    'Sign in to your account',
                                  ),
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            signedIn
                                ? profileEmail.isNotEmpty
                                    ? profileEmail
                                    : profile?.mobile.trim().isNotEmpty == true
                                        ? profile!.mobile.trim()
                                        : text(
                                            'settings.profileAddressesCredit',
                                            'Profile, addresses and live credit',
                                          )
                                : text(
                                    'settings.otpOrdersCreditSupport',
                                    'Use mobile OTP for orders, credit and support',
                                  ),
                            style: theme.textTheme.bodySmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (signedIn) ...<Widget>[
                            const SizedBox(height: 4),
                            Text(
                              text(
                                'settings.tapManageAccountDetails',
                                'Tap to manage account details',
                              ),
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colors.primary,
                                fontWeight: FontWeight.w800,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
            ),
          ),
        ),
        SettingsSectionTitle(text('settings.general', 'General')),
        _SettingsTile(
          icon: Icons.business_center_outlined,
          title: text('settings.businessIndustry', 'Business & industry'),
          subtitle: configState.isLoading
              ? text(
                  'settings.loadingRegisteredIndustry',
                  'Loading registered industry',
                )
              : config?.industryLabel ??
                  text('settings.generalB2bCommerce', 'General B2B commerce'),
          onTap: () => _open(context, const BusinessIndustryScreen()),
        ),
        _SettingsTile(
          icon: Icons.verified_outlined,
          title: text('settings.businessGst', 'Business & GST'),
          subtitle: text(
            'settings.businessGstSubtitle',
            'GST verification, legal name and business status',
          ),
          onTap: () => _open(context, const BusinessGstScreen()),
        ),
        _SettingsTile(
          icon: Icons.language_outlined,
          title: text('settings.languageRegion', 'Language & region'),
          subtitle:
              '${settings.languageCode.toUpperCase()} | ${settings.regionCode} | ${settings.currencyCode}',
          onTap: () => _open(context, const LanguageRegionScreen()),
        ),
        if (config?.enableNotifications ?? true)
          _SettingsTile(
            icon: Icons.notifications_outlined,
            title: text('settings.notifications', 'Notifications'),
            subtitle: settings.notificationsEnabled
                ? text(
                    'settings.orderPaymentCreditUpdates',
                    'Order, payment and credit updates',
                  )
                : text('settings.notificationsOff', 'Notifications off'),
            onTap: () => _open(
              context,
              const NotificationPreferencesScreen(),
            ),
          ),
        SettingsSectionTitle(
          text('settings.storePreferences', 'Store preferences'),
        ),
        _SettingsTile(
          icon: Icons.account_balance_outlined,
          title: text('settings.distributorPayments', 'Distributor payments'),
          subtitle: text(
            'settings.distributorPaymentsSubtitle',
            'Bank details, UPI ID and generated QR code',
          ),
          onTap: () => _open(context, const DistributorPaymentSettingsScreen()),
        ),
        _SettingsTile(
          icon: Icons.shopping_bag_outlined,
          title: text('settings.shoppingPreferences', 'Shopping preferences'),
          subtitle: text(
            'settings.shoppingPreferencesSubtitle',
            'Bulk ordering, repeat orders and delivery address',
          ),
          onTap: () => _open(context, const ShoppingPreferencesScreen()),
        ),
        _SettingsTile(
          icon: Icons.location_on_outlined,
          title: text('settings.addresses', 'Addresses'),
          subtitle: signedIn
              ? text(
                  'settings.manageDeliveryAddresses',
                  'Manage delivery addresses',
                )
              : text(
                  'settings.signInToManageAddresses',
                  'Sign in to add addresses',
                ),
          onTap: () => _open(context, const AddressBookScreen()),
        ),
        SettingsSectionTitle(
          text('settings.appPreferences', 'App preferences'),
        ),
        _SettingsTile(
          icon: Icons.shield_outlined,
          title: text('settings.securityPrivacy', 'Security & privacy'),
          subtitle: text(
            'settings.securityPrivacySubtitle',
            'Session, data controls and reset',
          ),
          onTap: () => _open(context, const SecurityPrivacyScreen()),
        ),
        _SettingsTile(
          icon: Icons.palette_outlined,
          title: text('settings.appearance', 'Appearance'),
          subtitle:
              '${_themeName(settings.themeMode, localizer)} | ${(settings.textScale * 100).round()}% ${text('settings.text', 'text')}',
          onTap: () => _open(context, const AppearanceSettingsScreen()),
        ),
        SettingsSectionTitle(
          text('settings.supportInformation', 'Support & information'),
        ),
        _SettingsTile(
          icon: Icons.receipt_long_outlined,
          title: text('settings.invoiceCenter', 'Invoice center'),
          subtitle: text(
            'settings.invoiceCenterSubtitle',
            'GST invoices, PDF download and share actions',
          ),
          onTap: () => _open(context, const InvoiceCenterScreen()),
        ),
        _SettingsTile(
          icon: Icons.request_quote_outlined,
          title: text('settings.rfqQuotes', 'RFQ & quotations'),
          subtitle: text(
            'settings.rfqQuotesSubtitle',
            'Request quotes, approve quotations and convert to orders',
          ),
          onTap: () => _open(context, const RfqQuotesScreen()),
        ),
        _SettingsTile(
          icon: Icons.account_balance_wallet_outlined,
          title: text('settings.creditLedger', 'Credit ledger'),
          subtitle: text(
            'settings.creditLedgerSubtitle',
            'Credit transactions and due date history',
          ),
          onTap: () => _open(context, const CreditLedgerScreen()),
        ),
        _SettingsTile(
          icon: Icons.summarize_outlined,
          title: text('settings.customerStatement', 'Customer statement'),
          subtitle: text(
            'settings.customerStatementSubtitle',
            'Debit, credit and balance statement',
          ),
          onTap: () => _open(context, const CustomerStatementScreen()),
        ),
        _SettingsTile(
          icon: Icons.help_outline,
          title: text('settings.helpSupport', 'Help & support'),
          subtitle: text(
            'settings.helpSupportSubtitle',
            'FAQs and support requests',
          ),
          onTap: () => _open(context, const HelpSupportScreen()),
        ),
        _SettingsTile(
          icon: Icons.policy_outlined,
          title: text('settings.legalPolicies', 'Legal & policies'),
          subtitle: text(
            'settings.legalPoliciesSubtitle',
            'Privacy, terms, shipping and billing',
          ),
          onTap: () => _open(context, const LegalSettingsScreen()),
        ),
        _SettingsTile(
          icon: Icons.info_outline,
          title: text('settings.aboutApp', 'About app'),
          subtitle: text(
            'settings.aboutAppSubtitle',
            'Store and release information',
          ),
          onTap: () => _open(context, const AboutAppScreen()),
        ),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

String _themeName(String mode, MobileLocalizationService localizer) {
  switch (mode) {
    case 'light':
      return localizer.t('settings.light', defaultValue: 'Light');
    case 'dark':
      return localizer.t('settings.dark', defaultValue: 'Dark');
    default:
      return localizer.t('settings.system', defaultValue: 'System');
  }
}
