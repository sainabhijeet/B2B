import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';

class CustomerAddress {
  const CustomerAddress({
    required this.id,
    required this.label,
    required this.line1,
    required this.line2,
    required this.city,
    required this.state,
    required this.pincode,
    required this.countryCode,
    required this.isDefault,
  });

  final String id;
  final String label;
  final String line1;
  final String line2;
  final String city;
  final String state;
  final String pincode;
  final String countryCode;
  final bool isDefault;

  String get title => label.isNotEmpty ? label : 'Address';

  String get formatted {
    return <String>[line1, line2, city, state, pincode, countryCode]
        .where((String value) => value.trim().isNotEmpty)
        .join(', ');
  }

  CustomerAddress copyWith({bool? isDefault}) {
    return CustomerAddress(
      id: id,
      label: label,
      line1: line1,
      line2: line2,
      city: city,
      state: state,
      pincode: pincode,
      countryCode: countryCode,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'label': label,
      'line1': line1,
      'line2': line2,
      'city': city,
      'state': state,
      'pincode': pincode,
      'countryCode': countryCode,
      'isDefault': isDefault,
    };
  }

  factory CustomerAddress.fromJson(Map<String, dynamic> json) {
    String value(String key) => '${json[key] ?? ''}'.trim();
    return CustomerAddress(
      id: value('id'),
      label: value('label'),
      line1: value('line1'),
      line2: value('line2'),
      city: value('city'),
      state: value('state'),
      pincode: value('pincode'),
      countryCode: value('countryCode').isNotEmpty
          ? value('countryCode')
          : value('country_code'),
      isDefault: json['isDefault'] == true || json['is_default'] == true,
    );
  }
}

class CustomerProfile {
  const CustomerProfile({
    required this.id,
    required this.name,
    required this.mobile,
    required this.email,
    required this.profileImageUrl,
    required this.creditLimit,
    required this.creditBalance,
    required this.addresses,
  });

  final String id;
  final String name;
  final String mobile;
  final String email;
  final String profileImageUrl;
  final double creditLimit;
  final double creditBalance;
  final List<CustomerAddress> addresses;

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    String value(String key) => '${json[key] ?? ''}'.trim();
    double money(String key) => double.tryParse('${json[key] ?? 0}') ?? 0;
    final Object? rawAddresses = json['addresses'];
    return CustomerProfile(
      id: value('id'),
      name: value('name'),
      mobile: value('mobile'),
      email: value('email'),
      profileImageUrl: value('profileImageUrl').isNotEmpty
          ? value('profileImageUrl')
          : value('profile_image_url'),
      creditLimit: money('creditLimit'),
      creditBalance: money('creditBalance'),
      addresses: rawAddresses is List
          ? rawAddresses
              .whereType<Map>()
              .map(
                (Map raw) => CustomerAddress.fromJson(
                  Map<String, dynamic>.from(raw),
                ),
              )
              .toList(growable: false)
          : const <CustomerAddress>[],
    );
  }

  CustomerProfile copyWith({
    String? name,
    String? email,
    String? profileImageUrl,
    List<CustomerAddress>? addresses,
  }) {
    return CustomerProfile(
      id: id,
      name: name ?? this.name,
      mobile: mobile,
      email: email ?? this.email,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      creditLimit: creditLimit,
      creditBalance: creditBalance,
      addresses: addresses ?? this.addresses,
    );
  }
}

final customerProfileProvider =
    FutureProvider<CustomerProfile?>((Ref ref) async {
  final String? token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return null;

  final Dio dio = ref.watch(apiClientProvider);
  late final Response<Map<String, dynamic>> response;
  try {
    response = await dio.get<Map<String, dynamic>>('/storefront/customer/me');
  } on DioException catch (error) {
    if (error.response?.statusCode == 401) {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt');
      ref.read(authTokenProvider.notifier).state = null;
      return null;
    }
    rethrow;
  }
  final Object? data = nestEnvelopeData(response.data);
  if (data is! Map) {
    throw const FormatException('Customer profile response is invalid.');
  }
  return CustomerProfile.fromJson(Map<String, dynamic>.from(data));
});
