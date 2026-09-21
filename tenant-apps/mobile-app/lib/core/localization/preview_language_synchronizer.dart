import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'language_provider.dart';
import 'preview_language_bridge.dart';

class PreviewLanguageSynchronizer extends ConsumerStatefulWidget {
  const PreviewLanguageSynchronizer({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  ConsumerState<PreviewLanguageSynchronizer> createState() =>
      _PreviewLanguageSynchronizerState();
}

class _PreviewLanguageSynchronizerState
    extends ConsumerState<PreviewLanguageSynchronizer> {
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = previewLanguageContractStream().listen((contract) {
      ref.read(previewLocalizationContractProvider.notifier).state = contract;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      announcePreviewLanguageReady(ref.read(localizationContractProvider));
    });
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final contract = ref.watch(localizationContractProvider);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      announcePreviewLanguageReady(contract);
    });
    return widget.child;
  }
}
