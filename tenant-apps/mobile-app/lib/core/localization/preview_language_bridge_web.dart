import 'dart:async';
// ignore: deprecated_member_use, avoid_web_libraries_in_flutter
import 'dart:html' as html;

import 'language_contract.dart';

const String _previewMessageType = 'theme-editor-state';
const String _previewReadyMessageType = 'theme-editor-ready';

Stream<LocalizationContract> previewLanguageContractStream() {
  return html.window.onMessage
      .map((html.MessageEvent event) => _contractFromMessage(event.data))
      .where((LocalizationContract? contract) => contract != null)
      .cast<LocalizationContract>();
}

void announcePreviewLanguageReady(LocalizationContract contract) {
  html.window.parent?.postMessage(
    <String, Object?>{
      'type': _previewReadyMessageType,
      'languageContract': _contractToJson(contract),
    },
    '*',
  );
}

LocalizationContract? _contractFromMessage(Object? data) {
  if (data is! Map) return null;
  final Object? type = data['type'];
  if (type != _previewMessageType) return null;
  final Object? rawState = data['state'];
  if (rawState is! Map) return null;
  final Object? rawContract = rawState['languageContract'];
  if (rawContract is Map) {
    return LocalizationContract.fromJson(
      Map<String, dynamic>.from(rawContract),
      fallbackLanguage: rawState['languageCode']?.toString() ?? 'en',
    );
  }
  final Object? rawLanguage = rawState['languageCode'];
  if (rawLanguage is String && rawLanguage.trim().isNotEmpty) {
    return LocalizationContract.fromLanguage(rawLanguage);
  }
  return null;
}

Map<String, Object?> _contractToJson(LocalizationContract contract) {
  return <String, Object?>{
    'languageCode': contract.languageCode,
    'locale': contract.locale,
    'direction': contract.directionName,
    'revision': contract.revision,
    'supportedLanguages': contract.supportedLanguages,
    'source': contract.source,
  };
}
