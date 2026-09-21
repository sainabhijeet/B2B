import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../mock_data/mock_data.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../widgets/common/state_views.dart';

class CreditScreen extends StatelessWidget {
  const CreditScreen({super.key, this.loginRequired = false, this.creditDisabled = false});

  final bool loginRequired;
  final bool creditDisabled;

  @override
  Widget build(BuildContext context) {
    if (loginRequired) {
      return const AppStateView(
        icon: Icons.lock_outline_rounded,
        title: 'Sign in to view credit',
        message: 'Credit limits and usage are available after login.',
        actionLabel: 'Sign in',
      );
    }
    if (creditDisabled) {
      return const AppStateView(
        icon: Icons.block_rounded,
        title: 'Credit disabled',
        message: 'Credit view is turned off for this store.',
      );
    }
    const credit = MockData.credit;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Text('Business Credit', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(AppRadius.xl),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text('Credit Limit', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text('Rs ${credit.limit.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: credit.usage.clamp(0, 1),
                  color: Colors.white,
                  backgroundColor: Colors.white.withValues(alpha: 0.22),
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                const SizedBox(height: 8),
                Text('${(credit.usage * 100).toStringAsFixed(1)}% Used', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.35,
            children: <Widget>[
              _Metric('Available Credit', credit.available),
              _Metric('Outstanding', credit.outstanding),
              _Metric('Due Soon', credit.dueSoon),
              _MetricText('Payment Status', credit.status),
            ],
          ),
          const SizedBox(height: 22),
          Text('Recent Credit Transactions', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          ...MockData.creditTransactions.map(
            (tx) => Card(
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: AppColors.primaryLight,
                  child: Icon(Icons.receipt_rounded, color: AppColors.primary),
                ),
                title: Text(tx.invoice),
                subtitle: Text(DateFormat('dd MMM yyyy').format(tx.date)),
                trailing: Text('Rs ${tx.amount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w900)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    return _MetricText(label, 'Rs ${value.toStringAsFixed(0)}');
  }
}

class _MetricText extends StatelessWidget {
  const _MetricText(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}
