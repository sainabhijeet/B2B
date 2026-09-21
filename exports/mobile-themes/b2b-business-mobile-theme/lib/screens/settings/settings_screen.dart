import 'package:flutter/material.dart';

import '../../mock_data/mock_data.dart';
import '../../theme/app_colors.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const settings = MockData.settings;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Text('Settings', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: <Widget>[
                ListTile(title: const Text('App Name'), subtitle: Text(settings.appName)),
                ListTile(title: const Text('Language'), subtitle: Text(settings.language)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: <Widget>[
                _FeatureSwitchTile(title: 'Guest Cart', value: settings.guestCart),
                _FeatureSwitchTile(title: 'Orders', value: settings.orders),
                _FeatureSwitchTile(title: 'Credit', value: settings.credit),
                _FeatureSwitchTile(title: 'Notifications', value: settings.notifications),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Card(
            child: Column(
              children: <Widget>[
                _SettingsTile(icon: Icons.person_outline_rounded, title: 'Profile'),
                _SettingsTile(icon: Icons.lock_outline_rounded, title: 'Change Password'),
                _SettingsTile(icon: Icons.support_agent_rounded, title: 'Support'),
                _SettingsTile(icon: Icons.help_outline_rounded, title: 'FAQ'),
                _SettingsTile(icon: Icons.privacy_tip_outlined, title: 'Privacy Policy'),
                _SettingsTile(icon: Icons.description_outlined, title: 'Terms & Conditions'),
                _SettingsTile(icon: Icons.delete_outline_rounded, title: 'Delete Account', danger: true),
                _SettingsTile(icon: Icons.logout_rounded, title: 'Logout'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureSwitchTile extends StatelessWidget {
  const _FeatureSwitchTile({required this.title, required this.value});

  final String title;
  final bool value;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: Text(title),
      subtitle: const Text('Controlled by app config'),
      value: value,
      onChanged: null,
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({required this.icon, required this.title, this.danger = false});

  final IconData icon;
  final String title;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: danger ? AppColors.error : AppColors.primary),
      title: Text(title, style: TextStyle(color: danger ? AppColors.error : null)),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: () {},
    );
  }
}
