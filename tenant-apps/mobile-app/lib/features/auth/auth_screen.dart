import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/config/build_config.dart';
import '../../core/localization/language_provider.dart';
import 'auth_provider.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final TextEditingController _mobile = TextEditingController(
    text: BuildConfig.developmentLoginPhone,
  );
  final TextEditingController _otp = TextEditingController();
  final FocusNode _mobileFocus = FocusNode();
  final FocusNode _otpFocus = FocusNode();
  bool _otpRequested = false;

  Future<void> _requestOtp() async {
    final notifier = ref.read(authProvider.notifier);
    final developmentOtp = await notifier.loginWithOtp(mobile: _mobile.text);
    final latestAuth = ref.read(authProvider);
    if (!mounted || latestAuth.error != null || latestAuth.isAuthenticated) {
      return;
    }
    if (developmentOtp != null) {
      _otp.value = TextEditingValue(
        text: developmentOtp,
        selection: TextSelection.collapsed(offset: developmentOtp.length),
      );
    }
    setState(() => _otpRequested = true);
  }

  void _editMobile() {
    setState(() => _otpRequested = false);
  }

  @override
  void dispose() {
    _mobile.dispose();
    _otp.dispose();
    _mobileFocus.dispose();
    _otpFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final String? token = ref.watch(authTokenProvider);
    final bool isAuthenticated =
        auth.isAuthenticated || (token != null && token.isNotEmpty);
    final tenant = ref.watch(tenantConfigProvider);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final t = ref.watch(appTranslatorProvider);
    final mobileDigits = storefrontMobileDigits(_mobile.text);

    if (isAuthenticated) {
      return _SignedInAccount(
        appName: tenant.appName,
        mobile: auth.mobile,
        onLogout: auth.isLoading
            ? null
            : () => ref.read(authProvider.notifier).logout(),
      );
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[
            Color.alphaBlend(
              colorScheme.primary.withValues(alpha: 0.18),
              colorScheme.surface,
            ),
            Color.alphaBlend(
              colorScheme.primary.withValues(alpha: 0.08),
              colorScheme.surface,
            ),
            colorScheme.surface,
          ],
          stops: const <double>[0, 0.48, 1],
        ),
      ),
      child: Stack(
        children: <Widget>[
          const Positioned(
            top: -72,
            left: -28,
            right: -28,
            child: _BackgroundGlow(size: 280, opacity: 0.16),
          ),
          const Positioned(
            top: 170,
            right: -80,
            child: _BackgroundGlow(size: 230, opacity: 0.12),
          ),
          const Positioned(
            top: 38,
            right: -54,
            child: _BackgroundBubble(size: 176, opacity: 0.10),
          ),
          const Positioned(
            top: 88,
            left: 34,
            child: _BackgroundBubble(size: 58, opacity: 0.07),
          ),
          const Positioned(
            top: 126,
            right: 132,
            child: _BackgroundBubble(size: 28, opacity: 0.08),
          ),
          const Positioned(
            top: 190,
            left: -48,
            child: _BackgroundBubble(size: 122, opacity: 0.08),
          ),
          const Positioned(
            top: 222,
            left: 122,
            child: _BackgroundBubble(size: 38, opacity: 0.07),
          ),
          const Positioned(
            top: 250,
            right: 50,
            child: _BackgroundBubble(size: 46, opacity: 0.07),
          ),
          const Positioned(
            right: 44,
            bottom: 170,
            child: _BackgroundBubble(size: 72, opacity: 0.06),
          ),
          const Positioned(
            right: -18,
            bottom: 42,
            child: _BackgroundBubble(size: 112, opacity: 0.055),
          ),
          const Positioned(
            left: 32,
            bottom: 66,
            child: _BackgroundBubble(size: 44, opacity: 0.07),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (BuildContext context, BoxConstraints constraints) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(26, 40, 26, 28),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight - 56,
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          if (!_otpRequested) ...<Widget>[
                            Text(
                              t('Enter your mobile number'),
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              t(
                                'Please confirm your country code and enter your phone number.',
                              ),
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                                height: 1.35,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _PhoneEntryField(
                              controller: _mobile,
                              focusNode: _mobileFocus,
                              enabled: !auth.isLoading &&
                                  BuildConfig.developmentLoginPhone.isEmpty,
                            ),
                            const SizedBox(height: 24),
                            _AuthPrimaryButton(
                              label: t('CONTINUE'),
                              loading: auth.isLoading,
                              onTap: auth.isLoading ? null : _requestOtp,
                            ),
                          ] else ...<Widget>[
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: <Widget>[
                                      Text(
                                        t('Enter verification code'),
                                        style: theme.textTheme.titleMedium
                                            ?.copyWith(
                                          color: colorScheme.onSurface,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        mobileDigits.length == 10
                                            ? t('OTP sent to +91 $mobileDigits')
                                            : t(
                                                'OTP sent to your mobile number.',
                                              ),
                                        style:
                                            theme.textTheme.bodySmall?.copyWith(
                                          color: colorScheme.onSurfaceVariant,
                                          height: 1.35,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                _AuthTextAction(
                                  label: t('Change'),
                                  icon: Icons.edit_outlined,
                                  onTap: auth.isLoading ? null : _editMobile,
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            _OtpEntryField(
                              controller: _otp,
                              focusNode: _otpFocus,
                              enabled: !auth.isLoading,
                            ),
                            const SizedBox(height: 24),
                            _AuthPrimaryButton(
                              label: t('VERIFY'),
                              loading: auth.isLoading,
                              onTap: auth.isLoading
                                  ? null
                                  : () =>
                                      ref.read(authProvider.notifier).verifyOtp(
                                            _otp.text,
                                            mobileFromField: _mobile.text,
                                          ),
                            ),
                          ],
                          if (auth.error != null) ...<Widget>[
                            const SizedBox(height: 18),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: colorScheme.errorContainer,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: SelectableText(
                                auth.error!,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onErrorContainer,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BackgroundGlow extends StatelessWidget {
  const _BackgroundGlow({
    required this.size,
    required this.opacity,
  });

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;

    return IgnorePointer(
      child: Center(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: <Color>[
                colorScheme.primary.withValues(alpha: opacity),
                colorScheme.primary.withValues(alpha: 0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BackgroundBubble extends StatelessWidget {
  const _BackgroundBubble({
    required this.size,
    required this.opacity,
  });

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;

    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: colorScheme.primary.withValues(alpha: opacity),
          border: Border.all(
            color: colorScheme.primary.withValues(alpha: opacity + 0.04),
          ),
        ),
      ),
    );
  }
}

class _PhoneEntryField extends StatelessWidget {
  const _PhoneEntryField({
    required this.controller,
    required this.focusNode,
    required this.enabled,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: <Widget>[
        SizedBox(
          width: 78,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Country code',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                height: 40,
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: colorScheme.outline.withValues(alpha: 0.7),
                    ),
                  ),
                ),
                alignment: Alignment.centerLeft,
                child: Text(
                  '+91',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            enabled: enabled,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.done,
            inputFormatters: <TextInputFormatter>[
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurface,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
            decoration: InputDecoration(
              labelText: 'Mobile number',
              labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
              hintText: '9500022050',
              hintStyle: TextStyle(
                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.55),
                letterSpacing: 0,
              ),
              isDense: true,
              contentPadding: const EdgeInsets.only(bottom: 10),
              enabledBorder: UnderlineInputBorder(
                borderSide: BorderSide(
                  color: colorScheme.outline.withValues(alpha: 0.7),
                ),
              ),
              focusedBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: colorScheme.primary, width: 1.4),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _OtpEntryField extends StatelessWidget {
  const _OtpEntryField({
    required this.controller,
    required this.focusNode,
    required this.enabled,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return TextField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      keyboardType: TextInputType.number,
      textInputAction: TextInputAction.done,
      inputFormatters: <TextInputFormatter>[
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(6),
      ],
      style: theme.textTheme.bodyLarge?.copyWith(
        color: colorScheme.onSurface,
        fontWeight: FontWeight.w900,
        letterSpacing: 5,
      ),
      decoration: InputDecoration(
        labelText: 'OTP code',
        labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
        isDense: true,
        contentPadding: const EdgeInsets.only(bottom: 10),
        enabledBorder: UnderlineInputBorder(
          borderSide: BorderSide(
            color: colorScheme.outline.withValues(alpha: 0.7),
          ),
        ),
        focusedBorder: UnderlineInputBorder(
          borderSide: BorderSide(color: colorScheme.primary, width: 1.4),
        ),
      ),
    );
  }
}

class _AuthPrimaryButton extends StatelessWidget {
  const _AuthPrimaryButton({
    required this.label,
    required this.loading,
    required this.onTap,
  });

  final String label;
  final bool loading;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool enabled = onTap != null;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 160),
        opacity: enabled ? 1 : 0.58,
        child: Container(
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: colorScheme.primary,
            borderRadius: BorderRadius.circular(7),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: colorScheme.primary.withValues(alpha: 0.2),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: loading
              ? SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(colorScheme.onPrimary),
                  ),
                )
              : Text(
                  label,
                  style: TextStyle(
                    color: colorScheme.onPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
        ),
      ),
    );
  }
}

class _SignedInAccount extends StatelessWidget {
  const _SignedInAccount({
    required this.appName,
    required this.mobile,
    required this.onLogout,
  });

  final String appName;
  final String mobile;
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final ColorScheme colorScheme = theme.colorScheme;
    final String accountLabel = mobile.trim().isEmpty ? appName : '+91 $mobile';

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const SizedBox(height: 24),
            Icon(
              Icons.verified_user_outlined,
              size: 64,
              color: colorScheme.primary,
            ),
            const SizedBox(height: 20),
            Text(
              'Signed in',
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              accountLabel,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: onLogout,
              icon: const Icon(Icons.logout),
              label: const Text('Log out'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthTextAction extends StatelessWidget {
  const _AuthTextAction({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool enabled = onTap != null;

    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: enabled ? 1 : 0.55,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(icon, size: 18, color: colorScheme.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
