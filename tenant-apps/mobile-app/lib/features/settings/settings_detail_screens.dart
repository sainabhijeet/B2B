import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/config/storefront_app_config_provider.dart';
import '../../core/config/user_app_settings_provider.dart';
import '../../core/device/storefront_device.dart';
import '../../core/localization/language_contract.dart';
import '../../core/localization/language_provider.dart';
import '../../shared/widgets/app_feedback.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_screen.dart';
import 'customer_profile_provider.dart';
import 'settings_data_provider.dart';

const Map<String, String> _regions = <String, String>{
  'IN': 'India',
  'AE': 'United Arab Emirates',
  'US': 'United States',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
};

const Map<String, String> _currencies = <String, String>{
  'INR': 'Indian Rupee (INR)',
  'AED': 'UAE Dirham (AED)',
  'USD': 'US Dollar (USD)',
  'GBP': 'British Pound (GBP)',
  'EUR': 'Euro (EUR)',
};

class SettingsDetailScaffold extends StatelessWidget {
  const SettingsDetailScaffold({
    required this.title,
    required this.child,
    super.key,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 60,
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
        centerTitle: false,
        leadingWidth: 64,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: IconButton(
            tooltip: 'Back',
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: colorScheme.onPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SafeArea(top: false, child: child),
    );
  }
}

class SettingsSectionTitle extends StatelessWidget {
  const SettingsSectionTitle(this.title, {super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 8),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class AccountProfileScreen extends ConsumerStatefulWidget {
  const AccountProfileScreen({super.key});

  @override
  ConsumerState<AccountProfileScreen> createState() =>
      _AccountProfileScreenState();
}

class _AccountProfileScreenState extends ConsumerState<AccountProfileScreen> {
  bool _uploadingPhoto = false;

  String _absoluteImageUrl(String rawUrl) {
    final String url = rawUrl.trim();
    if (url.isEmpty ||
        url.startsWith('http://') ||
        url.startsWith('https://')) {
      return url;
    }
    final Dio dio = ref.read(apiClientProvider);
    final String origin =
        dio.options.baseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');
    return '$origin$url';
  }

  Future<void> _chooseProfilePhotoSource() async {
    if (_uploadingPhoto) return;
    final ImageSource? source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (BuildContext context) {
        final ColorScheme colors = Theme.of(context).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Update profile photo',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 12),
                _PhotoSourceTile(
                  icon: Icons.photo_camera_outlined,
                  title: 'Take photo',
                  subtitle: 'Capture a new profile photo',
                  color: colors.primary,
                  onTap: () => Navigator.of(context).pop(ImageSource.camera),
                ),
                const SizedBox(height: 8),
                _PhotoSourceTile(
                  icon: Icons.photo_library_outlined,
                  title: 'Choose from gallery',
                  subtitle: 'Upload an existing image',
                  color: colors.primary,
                  onTap: () => Navigator.of(context).pop(ImageSource.gallery),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (source == null) return;
    await _uploadProfilePhoto(source);
  }

  Future<void> _uploadProfilePhoto(ImageSource source) async {
    if (_uploadingPhoto) return;
    final XFile? picked = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1200,
      imageQuality: 82,
    );
    if (picked == null) return;
    setState(() => _uploadingPhoto = true);
    try {
      final Dio dio = ref.read(apiClientProvider);
      final FormData formData = FormData.fromMap(
        <String, dynamic>{
          'file': await MultipartFile.fromFile(
            picked.path,
            filename: picked.name,
          ),
        },
      );
      await dio.post<Map<String, dynamic>>(
        '/storefront/customer/me/avatar',
        data: formData,
      );
      ref.invalidate(customerProfileProvider);
      if (mounted) {
        showAppFeedback(
          context,
          message: 'Profile photo updated successfully.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (mounted) {
        showAppFeedback(
          context,
          message: 'Could not upload photo: $error',
          type: AppFeedbackType.error,
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _editProfile(CustomerProfile profile) async {
    final bool? saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (BuildContext context) {
        return _EditProfileSheet(profile: profile);
      },
    );
    if (saved == true) {
      ref.invalidate(customerProfileProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final String? token = ref.watch(authTokenProvider);
    if (token == null || token.isEmpty) {
      return const SettingsDetailScaffold(
        title: 'Account',
        child: AuthScreen(),
      );
    }

    final profile = ref.watch(customerProfileProvider);
    final localizer = ref.watch(mobileLocalizationServiceProvider);
    final settings = ref.watch(userAppSettingsProvider);
    final config = ref.watch(storefrontAppConfigProvider).asData?.value;
    return SettingsDetailScaffold(
      title: 'Account',
      child: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _ErrorState(
          message: '$error',
          onRetry: () => ref.invalidate(customerProfileProvider),
        ),
        data: (CustomerProfile? data) {
          if (data == null) return const AuthScreen();
          final Color primary = Theme.of(context).colorScheme.primary;
          final String avatarUrl = _absoluteImageUrl(data.profileImageUrl);
          return ListView(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: primary.withValues(alpha: 0.16)),
                  ),
                  child: Row(
                    children: <Widget>[
                      Stack(
                        clipBehavior: Clip.none,
                        children: <Widget>[
                          CircleAvatar(
                            radius: 38,
                            backgroundColor: primary.withValues(alpha: 0.15),
                            backgroundImage: avatarUrl.isEmpty
                                ? null
                                : NetworkImage(avatarUrl),
                            child: avatarUrl.isEmpty
                                ? Text(
                                    data.name.trim().isEmpty
                                        ? 'U'
                                        : data.name.trim()[0].toUpperCase(),
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(
                                          color: primary,
                                          fontWeight: FontWeight.w900,
                                        ),
                                  )
                                : null,
                          ),
                          Positioned(
                            right: -4,
                            bottom: -4,
                            child: Material(
                              color: primary,
                              shape: const CircleBorder(),
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: _uploadingPhoto
                                    ? null
                                    : _chooseProfilePhotoSource,
                                child: SizedBox.square(
                                  dimension: 34,
                                  child: _uploadingPhoto
                                      ? const Padding(
                                          padding: EdgeInsets.all(9),
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.camera_alt_outlined,
                                          color: Colors.white,
                                          size: 18,
                                        ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              data.name.isEmpty ? 'Customer' : data.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              data.mobile.isEmpty
                                  ? 'Mobile not available'
                                  : data.mobile,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              data.email.isEmpty
                                  ? 'Email not added'
                                  : data.email,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Edit profile',
                        onPressed: () => _editProfile(data),
                        icon: const Icon(Icons.edit_outlined),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: FilledButton.icon(
                  onPressed: () => _editProfile(data),
                  icon: const Icon(Icons.manage_accounts_outlined),
                  label: const Text('Edit Profile'),
                ),
              ),
              const SettingsSectionTitle('Contact'),
              ListTile(
                leading: const Icon(Icons.phone_outlined),
                title: const Text('Mobile'),
                subtitle: Text(
                  data.mobile.isEmpty ? 'Not available' : data.mobile,
                ),
              ),
              ListTile(
                leading: const Icon(Icons.email_outlined),
                title: const Text('Email'),
                subtitle: Text(data.email.isEmpty ? 'Not added' : data.email),
              ),
              if (config?.enableCreditView ?? true) ...<Widget>[
                const SettingsSectionTitle('Credit'),
                ListTile(
                  leading: const Icon(Icons.account_balance_wallet_outlined),
                  title: const Text('Credit limit'),
                  subtitle: Text(
                    localizer.formatCurrency(
                      data.creditLimit,
                      currency: settings.currencyCode,
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.payments_outlined),
                  title: const Text('Outstanding'),
                  subtitle: Text(
                    localizer.formatCurrency(
                      data.creditBalance,
                      currency: settings.currencyCode,
                    ),
                  ),
                ),
              ],
              const SettingsSectionTitle('Saved addresses'),
              if (data.addresses.isEmpty)
                ListTile(
                  leading: const Icon(Icons.location_off_outlined),
                  title: const Text('No address added'),
                  subtitle: const Text(
                    'Add a delivery address for checkout.',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const AddressBookScreen(),
                    ),
                  ),
                )
              else
                for (final CustomerAddress address in data.addresses)
                  ListTile(
                    leading: Icon(
                      address.isDefault
                          ? Icons.home_outlined
                          : Icons.location_on_outlined,
                    ),
                    title: Text(address.title),
                    subtitle: Text(address.formatted),
                    trailing: address.isDefault
                        ? const Icon(Icons.check_circle_outline)
                        : null,
                  ),
              const Divider(height: 32),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Log out'),
                onTap: () => ref.read(authProvider.notifier).logout(),
              ),
              const SizedBox(height: 20),
            ],
          );
        },
      ),
    );
  }
}

class _PhotoSourceTile extends StatelessWidget {
  const _PhotoSourceTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: <Widget>[
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({required this.profile});

  final CustomerProfile profile;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.profile.name);
    _email = TextEditingController(text: widget.profile.email);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      final Dio dio = ref.read(apiClientProvider);
      await dio.patch<Map<String, dynamic>>(
        '/storefront/customer/me',
        data: <String, dynamic>{
          'name': _name.text.trim(),
          'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
        },
      );
      if (mounted) {
        Navigator.of(context).pop(true);
        showAppFeedback(
          context,
          message: 'Profile updated successfully.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (mounted) {
        showAppFeedback(
          context,
          message: 'Could not update profile: $error',
          type: AppFeedbackType.error,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final EdgeInsets viewInsets = MediaQuery.viewInsetsOf(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, viewInsets.bottom + 20),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Edit Profile',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _name,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Your name',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
              validator: (String? value) {
                if ((value ?? '').trim().isEmpty) return 'Enter your name';
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
                border: OutlineInputBorder(),
              ),
              validator: (String? value) {
                final String email = (value ?? '').trim();
                if (email.isEmpty) return null;
                if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
                  return 'Enter a valid email';
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: const Text('Save Profile'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BusinessIndustryScreen extends ConsumerWidget {
  const BusinessIndustryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configState = ref.watch(storefrontAppConfigProvider);
    return SettingsDetailScaffold(
      title: 'Business & industry',
      child: configState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (Object error, _) => _ErrorState(
          message: '$error',
          onRetry: () => ref.invalidate(storefrontAppConfigProvider),
        ),
        data: (config) => ListView(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const CircleAvatar(
                    child: Icon(Icons.business_center_outlined),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          config.industryLabel,
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        const Text('Registered B2B industry'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SettingsSectionTitle('Business model'),
            const ListTile(
              leading: Icon(Icons.handshake_outlined),
              title: Text('B2B wholesale & distribution'),
              subtitle: Text(
                'Business pricing, bulk ordering and distributor fulfilment.',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.inventory_2_outlined),
              title: const Text('Category focus'),
              subtitle: Text(_industryProcurementFocus(config.industryName)),
            ),
            const SettingsSectionTitle('Enabled capabilities'),
            const ListTile(
              leading: Icon(Icons.shopping_cart_checkout_outlined),
              title: Text('Bulk ordering'),
              trailing: Icon(Icons.check_circle_outline),
            ),
            if (config.enableRepeatOrder)
              const ListTile(
                leading: Icon(Icons.replay_outlined),
                title: Text('Repeat ordering'),
                trailing: Icon(Icons.check_circle_outline),
              ),
            if (config.enableCreditView)
              const ListTile(
                leading: Icon(Icons.account_balance_wallet_outlined),
                title: Text('Trade credit visibility'),
                trailing: Icon(Icons.check_circle_outline),
              ),
            if (config.enableNotifications)
              const ListTile(
                leading: Icon(Icons.notifications_active_outlined),
                title: Text('Order and account notifications'),
                trailing: Icon(Icons.check_circle_outline),
              ),
            if (config.allowGuestAccess && config.allowGuestCart)
              const ListTile(
                leading: Icon(Icons.person_outline),
                title: Text('Guest cart'),
                trailing: Icon(Icons.check_circle_outline),
              ),
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'Industry and capabilities come from the distributor registration and store configuration.',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LanguageRegionScreen extends ConsumerWidget {
  const LanguageRegionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final UserAppSettings settings = ref.watch(userAppSettingsProvider);
    final LocalizationContract contract = ref.watch(
      localizationContractProvider,
    );
    final localizer = ref.watch(mobileLocalizationServiceProvider);
    String text(String key, String fallback) =>
        localizer.t(key, defaultValue: fallback);
    final Map<String, String> languageOptions = <String, String>{
      for (final LanguageOption option in contract.languageOptions)
        option.code: option.name,
    };
    if (languageOptions.isEmpty) {
      for (final String code in contract.supportedLanguages) {
        languageOptions[code] = code.toUpperCase();
      }
    }
    final Map<String, String> regionOptions = <String, String>{
      for (final MapEntry<String, String> option in _regions.entries)
        option.key: text('settings.regions.${option.key}', option.value),
    };
    final Map<String, String> currencyOptions = <String, String>{
      for (final MapEntry<String, String> option in _currencies.entries)
        option.key: text('settings.currencies.${option.key}', option.value),
    };
    return SettingsDetailScaffold(
      title: text('settings.languageRegion', 'Language & region'),
      child: ListView(
        children: <Widget>[
          SettingsSectionTitle(text('settings.language', 'Language')),
          ListTile(
            leading: const Icon(Icons.translate),
            title: Text(text('settings.appLanguage', 'App language')),
            subtitle: Text(
              languageOptions[settings.languageCode] ??
                  (languageOptions.isEmpty
                      ? text(
                          'settings.loadingLanguages',
                          'Loading languages from server',
                        )
                      : settings.languageCode.toUpperCase()),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: languageOptions.isEmpty
                ? null
                : () async {
                    final String? selected = await _selectOption(
                      context,
                      title: text('settings.appLanguage', 'App language'),
                      options: languageOptions,
                      selected: settings.languageCode,
                    );
                    if (selected != null) {
                      ref
                          .read(userAppSettingsProvider.notifier)
                          .setLanguage(selected);
                    }
                  },
          ),
          SettingsSectionTitle(
            text('settings.regionalFormat', 'Regional format'),
          ),
          ListTile(
            leading: const Icon(Icons.public_outlined),
            title: Text(text('settings.region', 'Region')),
            subtitle: Text(
              regionOptions[settings.regionCode] ?? settings.regionCode,
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              final String? selected = await _selectOption(
                context,
                title: text('settings.region', 'Region'),
                options: regionOptions,
                selected: settings.regionCode,
              );
              if (selected != null) {
                ref.read(userAppSettingsProvider.notifier).setRegion(selected);
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.currency_exchange),
            title: Text(text('settings.currency', 'Currency')),
            subtitle: Text(
              currencyOptions[settings.currencyCode] ?? settings.currencyCode,
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              final String? selected = await _selectOption(
                context,
                title: text('settings.currency', 'Currency'),
                options: currencyOptions,
                selected: settings.currencyCode,
              );
              if (selected != null) {
                ref
                    .read(userAppSettingsProvider.notifier)
                    .setCurrency(selected);
              }
            },
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              text(
                'settings.languageRegionHelp',
                'Language changes app labels. Region and currency control local display formatting on this device.',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(userAppSettingsProvider);
    final controller = ref.read(userAppSettingsProvider.notifier);
    final String? token = ref.watch(authTokenProvider);
    final inbox = ref.watch(notificationsInboxProvider);
    final config = ref.watch(storefrontAppConfigProvider).asData?.value;
    final bool enabled = settings.notificationsEnabled;
    return SettingsDetailScaffold(
      title: 'Notifications',
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(notificationsInboxProvider);
          await ref.read(notificationsInboxProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: <Widget>[
            SwitchListTile(
              secondary: const Icon(Icons.notifications_active_outlined),
              title: const Text('Allow notifications'),
              subtitle:
                  const Text('Master control for notification preferences'),
              value: enabled,
              onChanged: controller.setNotificationsEnabled,
            ),
            const SettingsSectionTitle('Updates'),
            SwitchListTile(
              secondary: const Icon(Icons.local_shipping_outlined),
              title: const Text('Order updates'),
              value: settings.orderUpdatesEnabled,
              onChanged: enabled ? controller.setOrderUpdatesEnabled : null,
            ),
            if (config?.enableCreditView ?? true)
              SwitchListTile(
                secondary: const Icon(Icons.event_repeat_outlined),
                title: const Text('Payment reminders'),
                value: settings.paymentRemindersEnabled,
                onChanged:
                    enabled ? controller.setPaymentRemindersEnabled : null,
              ),
            if (config?.enableCreditView ?? true)
              SwitchListTile(
                secondary: const Icon(Icons.credit_score_outlined),
                title: const Text('Credit alerts'),
                value: settings.creditAlertsEnabled,
                onChanged: enabled ? controller.setCreditAlertsEnabled : null,
              ),
            const SettingsSectionTitle('Notification inbox'),
            if (token != null &&
                token.isNotEmpty &&
                (inbox.asData?.value
                        .any((AppNotificationItem item) => !item.isRead) ??
                    false))
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () async {
                    await ref
                        .read(notificationInboxServiceProvider)
                        .markAllRead();
                    ref.invalidate(notificationsInboxProvider);
                  },
                  icon: const Icon(Icons.done_all, size: 18),
                  label: const Text('Mark all read'),
                ),
              ),
            if (token == null || token.isEmpty)
              const ListTile(
                leading: Icon(Icons.lock_outline),
                title: Text('Log in to view notifications'),
              )
            else
              inbox.when(
                loading: () => const ListTile(
                  leading: CircularProgressIndicator(),
                  title: Text('Loading notifications'),
                ),
                error: (Object error, _) => ListTile(
                  leading: const Icon(Icons.error_outline),
                  title: const Text('Could not load notifications'),
                  subtitle: Text('$error'),
                  trailing: IconButton(
                    tooltip: 'Retry',
                    onPressed: () => ref.invalidate(notificationsInboxProvider),
                    icon: const Icon(Icons.refresh),
                  ),
                ),
                data: (List<AppNotificationItem> items) => items.isEmpty
                    ? const ListTile(
                        leading: Icon(Icons.notifications_none),
                        title: Text('No notifications yet'),
                      )
                    : Column(
                        children:
                            items.take(10).map((AppNotificationItem item) {
                          return ListTile(
                            leading: Icon(
                              item.isRead
                                  ? Icons.notifications_outlined
                                  : Icons.notifications_active,
                              color: item.isRead
                                  ? null
                                  : Theme.of(context).colorScheme.primary,
                            ),
                            title: Text(
                              item.title,
                              style: TextStyle(
                                fontWeight: item.isRead
                                    ? FontWeight.normal
                                    : FontWeight.w700,
                              ),
                            ),
                            subtitle: Text(item.message),
                            trailing: item.isRead
                                ? null
                                : Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color:
                                          Theme.of(context).colorScheme.primary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                            onTap: item.isRead
                                ? null
                                : () async {
                                    await ref
                                        .read(notificationInboxServiceProvider)
                                        .markRead(item.id);
                                    ref.invalidate(notificationsInboxProvider);
                                  },
                          );
                        }).toList(growable: false),
                      ),
              ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class ShoppingPreferencesScreen extends ConsumerWidget {
  const ShoppingPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(userAppSettingsProvider);
    final controller = ref.read(userAppSettingsProvider.notifier);
    final String? token = ref.watch(authTokenProvider);
    final profile = ref.watch(customerProfileProvider).asData?.value;
    final config = ref.watch(storefrontAppConfigProvider).asData?.value;
    final List<CustomerAddress> addresses = profile?.addresses ?? const [];
    final bool allowGuestCart =
        config?.allowGuestAccess == true && config?.allowGuestCart == true;
    final bool allowRepeatOrders = config?.enableRepeatOrder ?? true;
    return SettingsDetailScaffold(
      title: 'Shopping preferences',
      child: ListView(
        children: <Widget>[
          if (allowGuestCart || allowRepeatOrders)
            const SettingsSectionTitle('Ordering'),
          if (allowGuestCart)
            SwitchListTile(
              secondary: const Icon(Icons.shopping_cart_outlined),
              title: const Text('Guest cart'),
              subtitle: const Text('Keep a cart before business login'),
              value: settings.guestCartEnabled,
              onChanged: controller.setGuestCartEnabled,
            ),
          if (allowRepeatOrders)
            SwitchListTile(
              secondary: const Icon(Icons.replay_outlined),
              title: const Text('Quick repeat orders'),
              subtitle: const Text('Reorder previous B2B purchases faster'),
              value: settings.repeatOrdersEnabled,
              onChanged: controller.setRepeatOrdersEnabled,
            ),
          const SettingsSectionTitle('Fulfilment'),
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: const Text('Default delivery address'),
            subtitle: Text(
              token == null || token.isEmpty
                  ? 'Log in to select an address'
                  : _addressLabel(addresses, settings.defaultAddressId),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: token == null || token.isEmpty || addresses.isEmpty
                ? null
                : () async {
                    final String? selected = await _selectOption(
                      context,
                      title: 'Default delivery address',
                      options: <String, String>{
                        for (final CustomerAddress address in addresses)
                          address.id: '${address.title} - ${address.formatted}',
                      },
                      selected: settings.defaultAddressId,
                    );
                    if (selected != null) {
                      controller.setDefaultAddress(selected);
                    }
                  },
          ),
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'Delivery address comes from your live business account. Stock and fulfilment are confirmed by the distributor.',
            ),
          ),
        ],
      ),
    );
  }
}

class AddressBookScreen extends ConsumerStatefulWidget {
  const AddressBookScreen({super.key});

  @override
  ConsumerState<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends ConsumerState<AddressBookScreen> {
  final _formKey = GlobalKey<FormState>();
  final _line1Controller = TextEditingController();
  final _line2Controller = TextEditingController();
  final _landmarkController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _countryController = TextEditingController(text: 'IN');
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  String _label = 'Home';
  String? _editingAddressId;
  bool _isDefault = false;
  bool _saving = false;
  bool _showForm = false;

  @override
  void dispose() {
    _line1Controller.dispose();
    _line2Controller.dispose();
    _landmarkController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _countryController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveAddress() async {
    if (_saving || !_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final String area = _line2Controller.text.trim();
    final String landmark = _landmarkController.text.trim();
    final String line2 = <String>[
      area,
      if (landmark.isNotEmpty) 'Near $landmark',
    ].where((String value) => value.isNotEmpty).join(', ');
    final Map<String, dynamic> payload = <String, dynamic>{
      'label': _label,
      'line1': _line1Controller.text.trim(),
      'line2': line2,
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'pincode': _pincodeController.text.trim(),
      'countryCode': _countryController.text.trim().toUpperCase(),
      'isDefault': _isDefault,
    };
    try {
      final dio = ref.read(apiClientProvider);
      final bool wasEditing = _editingAddressId != null;
      if (_editingAddressId == null) {
        await dio.post<Map<String, dynamic>>(
          '/storefront/customer/addresses',
          data: payload,
        );
      } else {
        await dio.patch<Map<String, dynamic>>(
          '/storefront/customer/addresses/$_editingAddressId',
          data: payload,
        );
      }
      ref.invalidate(customerProfileProvider);
      if (!mounted) return;
      _clearForm();
      setState(() {
        _editingAddressId = null;
        _isDefault = false;
        _showForm = false;
      });
      showAppFeedback(
        context,
        message: wasEditing
            ? 'Address updated successfully.'
            : 'Address saved successfully.',
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Could not save address: ${_saveError(error)}',
        type: AppFeedbackType.error,
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final token = ref.watch(authTokenProvider);
    final signedIn = token != null && token.isNotEmpty;
    final profile = ref.watch(customerProfileProvider);
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: Column(
        children: <Widget>[
          _addressHeader(colorScheme),
          Expanded(
            child: !signedIn
                ? _signedOutState(colorScheme)
                : _showForm
                    ? _addressForm()
                    : profile.when(
                        loading: () =>
                            const Center(child: CircularProgressIndicator()),
                        error: (Object error, _) => _ErrorState(
                          message: '$error',
                          onRetry: () =>
                              ref.invalidate(customerProfileProvider),
                        ),
                        data: (CustomerProfile? data) {
                          final addresses =
                              data?.addresses ?? const <CustomerAddress>[];
                          if (addresses.isEmpty) {
                            return _emptyAddressState(colorScheme);
                          }
                          return _addressList(addresses, colorScheme);
                        },
                      ),
          ),
          if (!_showForm)
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: FilledButton.icon(
                    onPressed: signedIn
                        ? () => setState(() => _showForm = true)
                        : null,
                    icon: const Icon(Icons.add, size: 24),
                    label: const Text(
                      'Add New Address',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _addressHeader(ColorScheme colorScheme) {
    return Container(
      width: double.infinity,
      color: colorScheme.primary,
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 24,
        20,
        28,
      ),
      child: Row(
        children: <Widget>[
          SizedBox(
            width: 48,
            height: 48,
            child: IconButton(
              tooltip: 'Back',
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              color: colorScheme.onPrimary,
              onPressed: () {
                if (_showForm) {
                  _clearForm();
                  setState(() {
                    _editingAddressId = null;
                    _isDefault = false;
                    _showForm = false;
                  });
                  return;
                }
                Navigator.of(context).pop();
              },
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Address',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: colorScheme.onPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Manage your saved delivery addresses',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: colorScheme.onPrimary.withValues(alpha: 0.74),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _signedOutState(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(Icons.lock_outline, color: colorScheme.primary, size: 44),
            const SizedBox(height: 16),
            const Text(
              'Log in to add addresses',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Text(
              'Saved delivery addresses need an account.',
              textAlign: TextAlign.center,
              style: TextStyle(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyAddressState(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              'No Address Added',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 18),
            Text(
              'To see the saved address here, add your work or home address',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                    height: 1.45,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _addressList(
    List<CustomerAddress> addresses,
    ColorScheme colorScheme,
  ) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(customerProfileProvider),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
        itemCount: addresses.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (BuildContext context, int index) {
          final address = addresses[index];
          return _savedAddressCard(address, colorScheme);
        },
      ),
    );
  }

  Widget _savedAddressCard(
    CustomerAddress address,
    ColorScheme colorScheme,
  ) {
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            CircleAvatar(
              radius: 22,
              backgroundColor: colorScheme.primary.withValues(alpha: 0.10),
              foregroundColor: colorScheme.primary,
              child: Icon(_addressIcon(address.label)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Flexible(
                        child: Text(
                          address.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      if (address.isDefault) ...<Widget>[
                        const SizedBox(width: 8),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            color: colorScheme.primary.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            child: Text(
                              'Default',
                              style: TextStyle(
                                color: colorScheme.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    address.formatted,
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              onSelected: (String action) {
                if (action == 'edit') {
                  _editAddress(address);
                } else if (action == 'default') {
                  _setDefaultAddress(address);
                } else if (action == 'delete') {
                  _deleteAddress(address);
                }
              },
              itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                const PopupMenuItem<String>(
                  value: 'edit',
                  child: ListTile(
                    leading: Icon(Icons.edit_outlined),
                    title: Text('Edit'),
                  ),
                ),
                if (!address.isDefault)
                  const PopupMenuItem<String>(
                    value: 'default',
                    child: ListTile(
                      leading: Icon(Icons.check_circle_outline),
                      title: Text('Set default'),
                    ),
                  ),
                const PopupMenuItem<String>(
                  value: 'delete',
                  child: ListTile(
                    leading: Icon(Icons.delete_outline),
                    title: Text('Delete'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _addressForm() {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
        children: <Widget>[
          _sectionCard(
            title: 'Address Details',
            children: <Widget>[
              _labeledField(
                icon: Icons.home_outlined,
                label: 'House / Flat / Block No.',
                controller: _line1Controller,
                hint: 'Enter house, flat or block no.',
                validator: _required,
                textInputAction: TextInputAction.next,
              ),
              _labeledField(
                icon: Icons.apartment_outlined,
                label: 'Apartment / Road / Area',
                controller: _line2Controller,
                hint: 'Enter apartment, road or area',
                validator: _required,
                textInputAction: TextInputAction.next,
              ),
              _labeledField(
                icon: Icons.location_on,
                label: 'Near Landmark (Optional)',
                controller: _landmarkController,
                hint: 'Enter nearby landmark',
                textInputAction: TextInputAction.next,
              ),
              _labeledField(
                icon: Icons.verified_user_outlined,
                label: 'Pin Code',
                controller: _pincodeController,
                hint: 'Enter your Pin Code',
                keyboardType: TextInputType.number,
                validator: _required,
                textInputAction: TextInputAction.next,
              ),
              Row(
                children: <Widget>[
                  Expanded(
                    child: _labeledField(
                      icon: Icons.map_outlined,
                      label: 'State',
                      controller: _stateController,
                      hint: 'State',
                      validator: _required,
                      textInputAction: TextInputAction.next,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: _labeledField(
                      icon: Icons.location_city_outlined,
                      label: 'City',
                      controller: _cityController,
                      hint: 'City',
                      validator: _required,
                      textInputAction: TextInputAction.next,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          _sectionCard(
            title: 'Contact Details',
            children: <Widget>[
              _labeledField(
                icon: Icons.person_outline,
                label: 'Your Name',
                controller: _nameController,
                hint: 'Enter your name',
                validator: _required,
                textInputAction: TextInputAction.next,
              ),
              _labeledField(
                icon: Icons.phone_outlined,
                label: 'Phone Number',
                controller: _phoneController,
                hint: 'Enter phone number',
                keyboardType: TextInputType.phone,
                validator: _required,
              ),
            ],
          ),
          const SizedBox(height: 14),
          _sectionCard(
            title: 'Save Address as',
            children: <Widget>[
              Row(
                children: <Widget>[
                  _saveAsChip(Icons.home_outlined, 'Home'),
                  const SizedBox(width: 10),
                  _saveAsChip(Icons.apartment_outlined, 'Office'),
                  const SizedBox(width: 10),
                  _saveAsChip(Icons.location_on_outlined, 'Other'),
                ],
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () => setState(() => _isDefault = !_isDefault),
                borderRadius: BorderRadius.circular(6),
                child: Row(
                  children: <Widget>[
                    Checkbox(
                      value: _isDefault,
                      onChanged: (bool? value) => setState(
                        () => _isDefault = value ?? false,
                      ),
                    ),
                    const Text('Make Default Address'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: FilledButton.icon(
              onPressed: _saving ? null : _saveAddress,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(
                _editingAddressId == null ? 'Save Address' : 'Update Address',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _clearForm() {
    _line1Controller.clear();
    _line2Controller.clear();
    _landmarkController.clear();
    _cityController.clear();
    _stateController.clear();
    _pincodeController.clear();
    _countryController.text = 'IN';
    _nameController.clear();
    _phoneController.clear();
  }

  void _editAddress(CustomerAddress address) {
    _line1Controller.text = address.line1;
    _line2Controller.text = address.line2;
    _cityController.text = address.city;
    _stateController.text = address.state;
    _pincodeController.text = address.pincode;
    _countryController.text =
        address.countryCode.isEmpty ? 'IN' : address.countryCode;
    setState(() {
      _editingAddressId = address.id;
      _label = address.label.isEmpty ? 'Home' : address.label;
      _isDefault = address.isDefault;
      _showForm = true;
    });
  }

  Future<void> _setDefaultAddress(CustomerAddress address) async {
    try {
      await ref.read(apiClientProvider).post<Map<String, dynamic>>(
            '/storefront/customer/addresses/${address.id}/default',
          );
      ref.invalidate(customerProfileProvider);
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Default address updated.',
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Could not set default address: ${_saveError(error)}',
        type: AppFeedbackType.error,
      );
    }
  }

  Future<void> _deleteAddress(CustomerAddress address) async {
    final bool confirmed = await _confirm(
      context,
      title: 'Delete address?',
      message: 'This delivery address will be removed.',
      action: 'Delete',
    );
    if (!confirmed) return;
    try {
      await ref.read(apiClientProvider).delete<Map<String, dynamic>>(
            '/storefront/customer/addresses/${address.id}',
          );
      ref.invalidate(customerProfileProvider);
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Address deleted.',
        type: AppFeedbackType.success,
      );
    } catch (error) {
      if (!mounted) return;
      showAppFeedback(
        context,
        message: 'Could not delete address: ${_saveError(error)}',
        type: AppFeedbackType.error,
      );
    }
  }

  IconData _addressIcon(String label) {
    final lower = label.toLowerCase();
    if (lower.contains('work')) return Icons.apartment_outlined;
    if (lower.contains('other')) return Icons.location_on_outlined;
    return Icons.home_outlined;
  }

  Widget _sectionCard({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _labeledField({
    required IconData icon,
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputAction? textInputAction,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: colorScheme.primary, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            validator: validator,
            decoration: InputDecoration(
              hintText: hint,
              filled: true,
              fillColor: colorScheme.surface,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 16,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(9),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(9),
                borderSide: BorderSide(color: colorScheme.outlineVariant),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _saveAsChip(IconData icon, String label) {
    final colorScheme = Theme.of(context).colorScheme;
    final selected = _label == label;
    return Expanded(
      child: OutlinedButton.icon(
        onPressed: () => setState(() => _label = label),
        icon: Icon(icon, size: 17),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor:
              selected ? colorScheme.primary : colorScheme.onSurfaceVariant,
          side: BorderSide(
            color: selected ? colorScheme.primary : colorScheme.outlineVariant,
          ),
          backgroundColor: selected
              ? colorScheme.primary.withValues(alpha: 0.08)
              : colorScheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
          ),
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  static String? _required(String? value) {
    return value?.trim().isEmpty == false ? null : 'Required';
  }

  static String _saveError(Object error) {
    if (error is DioException) {
      final int? statusCode = error.response?.statusCode;
      if (statusCode != null) return 'Server returned $statusCode.';
      return 'Please check your connection.';
    }
    return 'Please try again.';
  }
}

class SecurityPrivacyScreen extends ConsumerWidget {
  const SecurityPrivacyScreen({super.key});

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final bool confirmed = await _confirm(
      context,
      title: 'Delete account?',
      message:
          'Your profile, saved addresses, cart and sign-in data will be removed. Invoices and legally required financial records will be retained.',
      action: 'Continue',
    );
    if (!confirmed || !context.mounted) return;

    try {
      await ref.read(accountDeletionServiceProvider).requestOtp();
    } on DioException catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: _accountDeletionError(error),
        type: AppFeedbackType.error,
      );
      return;
    }

    if (!context.mounted) return;
    final String? code = await _promptDeletionOtp(context);
    if (code == null || code.isEmpty || !context.mounted) return;

    try {
      await ref.read(accountDeletionServiceProvider).deleteAccount(code: code);
      await ref.read(authProvider.notifier).logout();
      ref.invalidate(customerProfileProvider);
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: 'Account deleted successfully.',
        type: AppFeedbackType.success,
      );
      Navigator.of(context).popUntil((Route<dynamic> route) => route.isFirst);
    } on DioException catch (error) {
      if (!context.mounted) return;
      showAppFeedback(
        context,
        message: _accountDeletionError(error),
        type: AppFeedbackType.error,
      );
    }
  }

  Future<String?> _promptDeletionOtp(BuildContext context) async {
    final TextEditingController otpController = TextEditingController();
    try {
      return await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Verify deletion'),
            content: TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'OTP',
                counterText: '',
              ),
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () {
                  final String code =
                      otpController.text.replaceAll(RegExp(r'\D'), '');
                  if (code.length == 6) {
                    Navigator.of(context).pop(code);
                  }
                },
                child: const Text('Delete'),
              ),
            ],
          );
        },
      );
    } finally {
      otpController.dispose();
    }
  }

  String _accountDeletionError(DioException error) {
    final int? statusCode = error.response?.statusCode;
    if (statusCode == 400 || statusCode == 401) {
      return 'Invalid or expired OTP.';
    }
    if (statusCode == 429) {
      return 'Too many attempts. Please try again later.';
    }
    return 'Could not delete account. Please try again.';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(userAppSettingsProvider.notifier);
    final String? token = ref.watch(authTokenProvider);
    final bool signedIn = token != null && token.isNotEmpty;
    return SettingsDetailScaffold(
      title: 'Security & privacy',
      child: ListView(
        children: <Widget>[
          const SettingsSectionTitle('Session'),
          ListTile(
            leading: Icon(
              signedIn
                  ? Icons.verified_user_outlined
                  : Icons.lock_open_outlined,
            ),
            title: Text(signedIn ? 'Signed in securely' : 'Not signed in'),
            subtitle: Text(
              signedIn
                  ? 'Account access is protected by your OTP session.'
                  : 'Log in with mobile OTP to access account data.',
            ),
          ),
          ListTile(
            leading: const Icon(Icons.phone_android_outlined),
            title: const Text('Device ID'),
            subtitle: Text(StorefrontDevice.current),
          ),
          const SettingsSectionTitle('App data'),
          ListTile(
            leading: const Icon(Icons.restart_alt),
            title: const Text('Reset preferences'),
            subtitle: const Text('Restore app settings to store defaults'),
            onTap: () async {
              final bool confirmed = await _confirm(
                context,
                title: 'Reset preferences?',
                message:
                    'Language, appearance and shopping preferences will be reset.',
                action: 'Reset',
              );
              if (confirmed) {
                await controller.resetPreferences();
                if (context.mounted) {
                  showAppFeedback(
                    context,
                    message: 'Preferences reset successfully.',
                    type: AppFeedbackType.success,
                  );
                }
              }
            },
          ),
          if (signedIn)
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Log out'),
              onTap: () => ref.read(authProvider.notifier).logout(),
            ),
          if (signedIn)
            ListTile(
              leading: Icon(
                Icons.delete_forever_outlined,
                color: Theme.of(context).colorScheme.error,
              ),
              title: Text(
                'Delete account',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              subtitle: const Text('Remove personal data from this storefront'),
              onTap: () => _deleteAccount(context, ref),
            ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class AppearanceSettingsScreen extends ConsumerWidget {
  const AppearanceSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(userAppSettingsProvider);
    final controller = ref.read(userAppSettingsProvider.notifier);
    return SettingsDetailScaffold(
      title: 'Appearance',
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: <Widget>[
          const SettingsSectionTitle('Theme'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SegmentedButton<String>(
              segments: const <ButtonSegment<String>>[
                ButtonSegment<String>(
                  value: 'system',
                  icon: Icon(Icons.brightness_auto_outlined),
                  label: Text('System'),
                ),
                ButtonSegment<String>(
                  value: 'light',
                  icon: Icon(Icons.light_mode_outlined),
                  label: Text('Light'),
                ),
                ButtonSegment<String>(
                  value: 'dark',
                  icon: Icon(Icons.dark_mode_outlined),
                  label: Text('Dark'),
                ),
              ],
              selected: <String>{settings.themeMode},
              onSelectionChanged: (Set<String> value) {
                controller.setThemeMode(value.first);
              },
            ),
          ),
          const SettingsSectionTitle('Text size'),
          ListTile(
            leading: const Icon(Icons.text_fields),
            title: const Text('App text size'),
            subtitle: Slider(
              value: settings.textScale,
              min: 0.85,
              max: 1.30,
              divisions: 9,
              label: '${(settings.textScale * 100).round()}%',
              onChanged: controller.setTextScale,
            ),
            trailing: Text('${(settings.textScale * 100).round()}%'),
          ),
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'Store colors and branding remain controlled by the active theme.',
            ),
          ),
        ],
      ),
    );
  }
}

class HelpSupportScreen extends ConsumerStatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  ConsumerState<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends ConsumerState<HelpSupportScreen> {
  final TextEditingController _subject = TextEditingController();
  final TextEditingController _description = TextEditingController();
  String _priority = 'MEDIUM';
  bool _submitting = false;

  @override
  void dispose() {
    _subject.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subject.text.trim().isEmpty || _description.text.trim().isEmpty) {
      showAppFeedback(
        context,
        message: 'Enter a subject and description.',
        type: AppFeedbackType.info,
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(settingsSupportServiceProvider).createTicket(
            subject: _subject.text,
            description: _description.text,
            priority: _priority,
          );
      ref.invalidate(supportTicketsProvider);
      _subject.clear();
      _description.clear();
      if (mounted) {
        showAppFeedback(
          context,
          message: 'Support request submitted successfully.',
          type: AppFeedbackType.success,
        );
      }
    } catch (error) {
      if (mounted) {
        showAppFeedback(
          context,
          message: 'Could not submit request: $error',
          type: AppFeedbackType.error,
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final String? token = ref.watch(authTokenProvider);
    final bool signedIn = token != null && token.isNotEmpty;
    final tickets = ref.watch(supportTicketsProvider);
    return SettingsDetailScaffold(
      title: 'Help & support',
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: <Widget>[
          const SettingsSectionTitle('Quick help'),
          const ExpansionTile(
            leading: Icon(Icons.shopping_cart_outlined),
            title: Text('Cart and checkout'),
            childrenPadding: EdgeInsets.fromLTRB(72, 0, 20, 16),
            children: <Widget>[
              Text(
                'Add products from the catalog, review quantities in Cart, then sign in before checkout when required.',
              ),
            ],
          ),
          const ExpansionTile(
            leading: Icon(Icons.receipt_long_outlined),
            title: Text('Orders and credit'),
            childrenPadding: EdgeInsets.fromLTRB(72, 0, 20, 16),
            children: <Widget>[
              Text(
                'Order history and live credit information are available after mobile OTP login.',
              ),
            ],
          ),
          const ExpansionTile(
            leading: Icon(Icons.sync_outlined),
            title: Text('Data not refreshing'),
            childrenPadding: EdgeInsets.fromLTRB(72, 0, 20, 16),
            children: <Widget>[
              Text(
                'Check internet access, sign in again, and use the refresh button on the affected screen.',
              ),
            ],
          ),
          const SettingsSectionTitle('Contact support'),
          if (!signedIn)
            const ListTile(
              leading: Icon(Icons.lock_outline),
              title: Text('Log in to create a support request'),
            )
          else ...<Widget>[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: <Widget>[
                  TextField(
                    controller: _subject,
                    maxLength: 255,
                    decoration: const InputDecoration(
                      labelText: 'Subject',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _description,
                    minLines: 3,
                    maxLines: 6,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _priority,
                    decoration: const InputDecoration(
                      labelText: 'Priority',
                      border: OutlineInputBorder(),
                    ),
                    items: const <DropdownMenuItem<String>>[
                      DropdownMenuItem(value: 'LOW', child: Text('Low')),
                      DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                      DropdownMenuItem(value: 'HIGH', child: Text('High')),
                    ],
                    onChanged: (String? value) {
                      if (value != null) setState(() => _priority = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _submitting ? null : _submit,
                      icon: _submitting
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_outlined),
                      label: const Text('Submit request'),
                    ),
                  ),
                ],
              ),
            ),
            const SettingsSectionTitle('My requests'),
            tickets.when(
              loading: () => const ListTile(
                leading: CircularProgressIndicator(),
                title: Text('Loading requests'),
              ),
              error: (Object error, _) => ListTile(
                leading: const Icon(Icons.error_outline),
                title: const Text('Could not load requests'),
                subtitle: Text('$error'),
                trailing: IconButton(
                  tooltip: 'Retry',
                  onPressed: () => ref.invalidate(supportTicketsProvider),
                  icon: const Icon(Icons.refresh),
                ),
              ),
              data: (List<SupportTicketItem> items) => items.isEmpty
                  ? const ListTile(
                      leading: Icon(Icons.support_agent_outlined),
                      title: Text('No support requests yet'),
                    )
                  : Column(
                      children: items.map((SupportTicketItem item) {
                        return ListTile(
                          leading: const Icon(Icons.support_agent_outlined),
                          title: Text(item.subject),
                          subtitle: Text(
                            '${item.status} | ${item.priority}',
                          ),
                        );
                      }).toList(growable: false),
                    ),
            ),
          ],
        ],
      ),
    );
  }
}

class LegalSettingsScreen extends StatelessWidget {
  const LegalSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SettingsDetailScaffold(
      title: 'Legal & policies',
      child: ListView(
        children: const <Widget>[
          _PolicyTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy',
            body:
                'Account, device, cart and order data are used to provide this storefront service. You can delete your account from Security & privacy. Deletion removes personal profile, address, cart and sign-in data; invoices and legally required financial records are retained.',
          ),
          _PolicyTile(
            icon: Icons.description_outlined,
            title: 'Terms of use',
            body:
                'Orders placed in this app are transactions with the store distributor. Product availability, pricing, credit approval and fulfilment remain subject to distributor confirmation.',
          ),
          _PolicyTile(
            icon: Icons.local_shipping_outlined,
            title: 'Shipping & returns',
            body:
                'Shipping, cancellation and return eligibility can vary by distributor and product. Open a support request for the policy applicable to a specific order.',
          ),
          _PolicyTile(
            icon: Icons.receipt_long_outlined,
            title: 'Billing',
            body:
                'Invoices, taxes and payment terms are issued by the distributor. Device billing preferences do not replace the final invoice or agreed credit terms.',
          ),
        ],
      ),
    );
  }
}

class _PolicyTile extends StatelessWidget {
  const _PolicyTile({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      leading: Icon(icon),
      title: Text(title),
      childrenPadding: const EdgeInsets.fromLTRB(72, 0, 20, 18),
      expandedCrossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[Text(body)],
    );
  }
}

class AboutAppScreen extends ConsumerWidget {
  const AboutAppScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenant = ref.watch(tenantConfigProvider);
    final settings = ref.watch(userAppSettingsProvider);
    final config = ref.watch(storefrontAppConfigProvider).asData?.value;
    return SettingsDetailScaffold(
      title: 'About app',
      child: ListView(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
            child: Column(
              children: <Widget>[
                const CircleAvatar(
                  radius: 38,
                  child: Icon(Icons.storefront_outlined, size: 38),
                ),
                const SizedBox(height: 16),
                Text(
                  tenant.appName,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  'B2B ${config?.industryLabel ?? 'commerce'} mobile app',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SettingsSectionTitle('Configuration'),
          ListTile(
            leading: const Icon(Icons.business_center_outlined),
            title: const Text('Registered industry'),
            subtitle: Text(config?.industryLabel ?? 'General B2B commerce'),
          ),
          ListTile(
            leading: const Icon(Icons.language_outlined),
            title: const Text('Language'),
            subtitle: Text(settings.languageCode.toUpperCase()),
          ),
          ListTile(
            leading: const Icon(Icons.public_outlined),
            title: const Text('Region & currency'),
            subtitle: Text('${settings.regionCode} | ${settings.currencyCode}'),
          ),
          ListTile(
            leading: const Icon(Icons.grid_view_outlined),
            title: const Text('Catalog layout'),
            subtitle: Text('${config?.defaultHomeLayout ?? 'grid'} layout'),
          ),
        ],
      ),
    );
  }
}

String _industryProcurementFocus(String? industryName) {
  final String value = industryName?.trim().toLowerCase() ?? '';
  if (value.isEmpty) {
    return 'Bulk catalog, business pricing and repeat procurement.';
  }
  if (_containsAny(value, <String>[
    'pharma',
    'health',
    'medical',
    'laboratory',
    'veterinary',
    'safety',
  ])) {
    return 'Regulated and specification-sensitive business procurement.';
  }
  if (_containsAny(value, <String>[
    'food',
    'fmcg',
    'hospitality',
    'restaurant',
    'agri',
    'pet care',
  ])) {
    return 'Bulk packs, recurring supply and replenishment ordering.';
  }
  if (_containsAny(value, <String>[
    'machinery',
    'equipment',
    'automotive',
    'electrical',
    'hvac',
    'pumps',
    'tools',
    'hardware',
    'solar',
    'power systems',
    'mro',
  ])) {
    return 'Technical SKUs, parts and specification-led procurement.';
  }
  if (_containsAny(value, <String>[
    'textile',
    'footwear',
    'jewel',
    'furniture',
    'decor',
    'apparel',
  ])) {
    return 'Variant-led wholesale catalog and repeat ordering.';
  }
  if (_containsAny(value, <String>[
    'construction',
    'building',
    'chemical',
    'packaging',
    'paper',
    'plastic',
    'metal',
    'steel',
    'oil',
    'lubricant',
  ])) {
    return 'Quantity, unit and specification-led procurement.';
  }
  return 'Bulk catalog, business pricing and distributor fulfilment.';
}

bool _containsAny(String value, List<String> keywords) {
  return keywords.any(value.contains);
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

Future<String?> _selectOption(
  BuildContext context, {
  required String title,
  required Map<String, String> options,
  required String selected,
}) {
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (BuildContext context) => SafeArea(
      child: ListView(
        shrinkWrap: true,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 10),
            child: Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          for (final MapEntry<String, String> option in options.entries)
            ListTile(
              title: Text(option.value),
              trailing: option.key == selected ? const Icon(Icons.check) : null,
              onTap: () => Navigator.of(context).pop(option.key),
            ),
        ],
      ),
    ),
  );
}

Future<bool> _confirm(
  BuildContext context, {
  required String title,
  required String message,
  required String action,
}) async {
  return await showDialog<bool>(
        context: context,
        builder: (BuildContext context) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(action),
            ),
          ],
        ),
      ) ??
      false;
}

String _addressLabel(List<CustomerAddress> addresses, String selectedId) {
  if (addresses.isEmpty) return 'No saved address';
  for (final CustomerAddress address in addresses) {
    if (address.id == selectedId) return address.title;
  }
  final CustomerAddress fallback = addresses.firstWhere(
    (CustomerAddress address) => address.isDefault,
    orElse: () => addresses.first,
  );
  return fallback.title;
}
