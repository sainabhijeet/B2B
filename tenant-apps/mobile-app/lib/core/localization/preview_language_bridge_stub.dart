import 'dart:async';

import 'language_contract.dart';

Stream<LocalizationContract> previewLanguageContractStream() {
  return const Stream<LocalizationContract>.empty();
}

void announcePreviewLanguageReady(LocalizationContract contract) {}
