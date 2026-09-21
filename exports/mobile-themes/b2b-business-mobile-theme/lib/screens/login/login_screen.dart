import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _mobile = TextEditingController();
  final _otp = TextEditingController();
  bool _otpSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _mobile.dispose();
    _otp.dispose();
    super.dispose();
  }

  void _sendOtp() {
    final digits = _mobile.text.trim();
    if (digits.length != 10) {
      setState(() => _error = 'Enter a valid 10 digit mobile number.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    Future<void>.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _otpSent = true;
      });
    });
  }

  void _verify() {
    if (_otp.text.trim().length != 6) {
      setState(() => _error = 'OTP must be exactly 6 digits.');
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Demo verified. Connect existing OTP API here.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: <Widget>[
          const SizedBox(height: 20),
          Container(
            width: 78,
            height: 78,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 38),
          ),
          const SizedBox(height: 24),
          Text(_otpSent ? 'Verify Mobile Number' : 'Welcome Back', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(
            _otpSent ? 'Enter the OTP sent to +91 ${_mobile.text}' : 'Sign in to continue to your business account.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  if (!_otpSent) ...<Widget>[
                    TextField(
                      controller: _mobile,
                      keyboardType: TextInputType.phone,
                      inputFormatters: <TextInputFormatter>[
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      decoration: const InputDecoration(
                        prefixText: '+91 ',
                        labelText: 'Enter mobile number',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _loading ? null : _sendOtp,
                      child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Send OTP'),
                    ),
                  ] else ...<Widget>[
                    TextField(
                      controller: _otp,
                      keyboardType: TextInputType.number,
                      inputFormatters: <TextInputFormatter>[
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(6),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'OTP',
                        hintText: '6 digit OTP',
                        prefixIcon: Icon(Icons.pin_outlined),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: <Widget>[
                        TextButton(onPressed: () {}, child: const Text('Resend OTP')),
                        const Spacer(),
                        const Text('00:30'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    FilledButton(onPressed: _verify, child: const Text('Verify & Continue')),
                    TextButton(
                      onPressed: () => setState(() => _otpSent = false),
                      child: const Text('Change mobile number'),
                    ),
                  ],
                  if (_error != null) ...<Widget>[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Text(_error!, style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Card(
            child: ListTile(
              leading: const Icon(Icons.code_rounded, color: AppColors.primary),
              title: const Text('Development demo values'),
              subtitle: const Text('Mobile: 9999999999\nOTP: 000000'),
              trailing: TextButton(
                onPressed: () {
                  _mobile.text = '9999999999';
                  _otp.text = '000000';
                },
                child: const Text('Fill'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
