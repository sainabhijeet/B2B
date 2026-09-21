import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/language_provider.dart';
import '../../core/config/user_app_settings_provider.dart';
import '../b2b/b2b_screens.dart';
import 'credit_provider.dart';

class CreditScreen extends ConsumerWidget {
  const CreditScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final UserAppSettings settings = ref.watch(userAppSettingsProvider);

    if (!settings.creditEnabled) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Credit is turned off in Payments & credit settings.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final creditAsync = ref.watch(creditProvider);
    return creditAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (Object error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            '${t('Credit error')}: $error',
            textAlign: TextAlign.center,
          ),
        ),
      ),
      data: (credit) {
        if (credit == null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                t('Credit data is not available yet.'),
                textAlign: TextAlign.center,
              ),
            ),
          );
        }
        final usagePct = (credit.usage * 100).clamp(0, 999).toStringAsFixed(0);
        final hasNoLimit = credit.limit <= 0 && credit.outstanding <= 0;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: <Widget>[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      t('Credit'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${t('Limit')}: ${localization.formatCurrency(credit.limit)} | '
                      '${t('Outstanding')}: ${localization.formatCurrency(credit.outstanding)} | '
                      '${t('Usage')}: $usagePct%',
                    ),
                    if (hasNoLimit) ...<Widget>[
                      const SizedBox(height: 10),
                      Text(
                        t('No credit limit has been assigned to this account yet.'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.account_balance_wallet_outlined),
              title: Text(t('Credit ledger')),
              subtitle: Text(t('Credit transactions and due date history')),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const CreditLedgerScreen(),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.summarize_outlined),
              title: Text(t('Customer statement')),
              subtitle: Text(t('Debit, credit and balance statement')),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const CustomerStatementScreen(),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
