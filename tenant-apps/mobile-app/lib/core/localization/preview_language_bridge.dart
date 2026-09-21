import 'dart:async';

import 'language_contract.dart';
import 'preview_language_bridge_stub.dart'
    if (dart.library.html) 'preview_language_bridge_web.dart'
    as impl;

Stream<LocalizationContract> previewLanguageContractStream() {
  return impl.previewLanguageContractStream();
}

void announcePreviewLanguageReady(LocalizationContract contract) {
  impl.announcePreviewLanguageReady(contract);
}
