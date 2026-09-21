import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';

class AppNotificationItem {
  const AppNotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    required this.readAt,
    required this.actionUrl,
  });

  final String id;
  final String title;
  final String message;
  final String type;
  final DateTime? createdAt;
  final DateTime? readAt;
  final String? actionUrl;
  bool get isRead => readAt != null;

  factory AppNotificationItem.fromJson(Map<String, dynamic> json) {
    return AppNotificationItem(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? 'Notification'}',
      message: '${json['message'] ?? ''}',
      type: '${json['type'] ?? ''}',
      createdAt: DateTime.tryParse('${json['createdAt'] ?? ''}'),
      readAt: DateTime.tryParse('${json['readAt'] ?? ''}'),
      actionUrl:
          json['actionUrl'] is String ? json['actionUrl'] as String : null,
    );
  }
}

class SupportTicketItem {
  const SupportTicketItem({
    required this.id,
    required this.subject,
    required this.description,
    required this.priority,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String subject;
  final String description;
  final String priority;
  final String status;
  final DateTime? createdAt;

  factory SupportTicketItem.fromJson(Map<String, dynamic> json) {
    return SupportTicketItem(
      id: '${json['id'] ?? ''}',
      subject: '${json['subject'] ?? 'Support request'}',
      description: '${json['description'] ?? ''}',
      priority: '${json['priority'] ?? 'MEDIUM'}',
      status: '${json['status'] ?? 'OPEN'}',
      createdAt: DateTime.tryParse('${json['createdAt'] ?? ''}'),
    );
  }
}

List<T> _parseList<T>(
  Object? body,
  T Function(Map<String, dynamic>) fromJson,
) {
  final Object? data = nestEnvelopeData(body);
  if (data is! List) return <T>[];
  return data
      .whereType<Map>()
      .map((Map raw) => fromJson(Map<String, dynamic>.from(raw)))
      .toList(growable: false);
}

final notificationsInboxProvider =
    FutureProvider.autoDispose<List<AppNotificationItem>>((Ref ref) async {
  final String? token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return <AppNotificationItem>[];
  final Dio dio = ref.watch(apiClientProvider);
  final Response<Map<String, dynamic>> response =
      await dio.get<Map<String, dynamic>>('/notifications');
  return _parseList<AppNotificationItem>(
    response.data,
    AppNotificationItem.fromJson,
  );
});

class NotificationInboxService {
  const NotificationInboxService(this._dio);

  final Dio _dio;

  Future<void> markRead(String id) async {
    await _dio.patch<Map<String, dynamic>>('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.patch<Map<String, dynamic>>('/notifications/read-all');
  }
}

final notificationInboxServiceProvider = Provider<NotificationInboxService>(
  (Ref ref) => NotificationInboxService(ref.watch(apiClientProvider)),
);

final supportTicketsProvider =
    FutureProvider<List<SupportTicketItem>>((Ref ref) async {
  final String? token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return <SupportTicketItem>[];
  final Dio dio = ref.watch(apiClientProvider);
  final Response<Map<String, dynamic>> response =
      await dio.get<Map<String, dynamic>>('/support/tickets');
  return _parseList<SupportTicketItem>(
    response.data,
    SupportTicketItem.fromJson,
  );
});

class SettingsSupportService {
  const SettingsSupportService(this._dio);

  final Dio _dio;

  Future<void> createTicket({
    required String subject,
    required String description,
    required String priority,
  }) async {
    await _dio.post<Map<String, dynamic>>(
      '/support/tickets',
      data: <String, dynamic>{
        'subject': subject.trim(),
        'description': description.trim(),
        'priority': priority,
      },
    );
  }
}

final settingsSupportServiceProvider = Provider<SettingsSupportService>(
  (Ref ref) => SettingsSupportService(ref.watch(apiClientProvider)),
);

class AccountDeletionService {
  const AccountDeletionService(this._dio);

  final Dio _dio;

  Future<void> requestOtp() async {
    await _dio.post<Map<String, dynamic>>(
      '/storefront/customer/account-deletion/otp',
    );
  }

  Future<void> deleteAccount({required String code}) async {
    await _dio.delete<Map<String, dynamic>>(
      '/storefront/customer/me',
      data: <String, dynamic>{'code': code},
    );
  }
}

final accountDeletionServiceProvider = Provider<AccountDeletionService>(
  (Ref ref) => AccountDeletionService(ref.watch(apiClientProvider)),
);
