import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:ridego/core/localization/mobile_localization_service.dart';
import 'package:ridego/core/localization/language_contract.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting();
  });

  test('formats order date time with selected language locale', () {
    final date = DateTime(2026, 8, 14, 18, 30);

    final english = formatDateTimeValue(date, 'en');
    final hindi = formatDateTimeValue(date, 'hi');

    expect(english, isNot(equals(hindi)));
    expect(hindi, isNot(contains('Aug')));
  });

  test('formats utc order timestamp in device local time', () {
    final date = DateTime.utc(2026, 9, 4, 0, 12);

    expect(
      formatDateTimeValue(date, 'en'),
      DateFormat.yMMMd('en_IN').add_jm().format(date.toLocal()),
    );
  });

  test('reads available language names from the API contract', () {
    final LocalizationContract contract = LocalizationContract.fromJson(
      <String, dynamic>{
        'languageCode': 'en',
        'supportedLanguages': <String>['en', 'hi'],
        'languageOptions': <Map<String, String>>[
          <String, String>{'code': 'en', 'name': 'English'},
          <String, String>{'code': 'hi', 'name': 'Hindi'},
        ],
      },
    );

    expect(contract.supportedLanguages, <String>['en', 'hi']);
    expect(
      contract.languageOptions.map((LanguageOption option) => option.name),
      <String>['English', 'Hindi'],
    );
  });
}
