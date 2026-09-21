import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/nest_json.dart';
import '../../shared/models/models.dart';

final businessProfileProvider = FutureProvider<BusinessProfile>((ref) async {
  final token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) {
    throw StateError('Sign in required to load business profile.');
  }
  final dio = ref.watch(apiClientProvider);
  final response =
      await dio.get<Map<String, dynamic>>('/storefront/customer/business');
  final data = nestEnvelopeData(response.data);
  if (data is! Map) {
    throw const FormatException('Business profile response is invalid.');
  }
  return _businessProfileFromJson(Map<String, dynamic>.from(data));
});

final businessProfileServiceProvider = Provider<BusinessProfileService>(
  BusinessProfileService.new,
);

class BusinessProfileService {
  const BusinessProfileService(this._ref);

  final Ref _ref;

  Future<BusinessProfile> save({
    required String companyLegalName,
    required String gstin,
    String? certificatePath,
    String? certificateFileName,
  }) async {
    final normalizedGstin = gstin.trim().toUpperCase();
    if (!isValidGstin(normalizedGstin)) {
      throw const FormatException('Enter a valid 15 character GSTIN.');
    }
    final dio = _ref.read(apiClientProvider);
    final Response<Map<String, dynamic>> response;
    if (certificatePath?.trim().isNotEmpty == true) {
      response = await dio.post<Map<String, dynamic>>(
        '/storefront/customer/business/certificate',
        data: FormData.fromMap(<String, dynamic>{
          'companyLegalName': companyLegalName.trim(),
          'gstin': normalizedGstin,
          'certificate': await MultipartFile.fromFile(
            certificatePath!,
            filename: certificateFileName,
          ),
        }),
      );
    } else {
      response = await dio.patch<Map<String, dynamic>>(
        '/storefront/customer/business',
        data: <String, dynamic>{
          'companyLegalName': companyLegalName.trim(),
          'gstin': normalizedGstin,
        },
      );
    }
    final data = nestEnvelopeData(response.data);
    if (data is! Map) {
      throw const FormatException('Business profile response is invalid.');
    }
    _ref.invalidate(businessProfileProvider);
    return _businessProfileFromJson(Map<String, dynamic>.from(data));
  }
}

bool isValidGstin(String value) {
  return RegExp(
    r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$',
  ).hasMatch(value.trim().toUpperCase());
}

final distributorPaymentSettingsProvider =
    FutureProvider<DistributorPaymentSettings>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response =
      await dio.get<Map<String, dynamic>>('/storefront/payment-settings');
  final data = nestEnvelopeData(response.data);
  if (data is! Map) {
    throw const FormatException('Payment settings response is invalid.');
  }
  return _paymentSettingsFromJson(Map<String, dynamic>.from(data));
});

final paymentSubmissionServiceProvider = Provider<PaymentSubmissionService>(
  PaymentSubmissionService.new,
);

class PaymentSubmissionService {
  const PaymentSubmissionService(this._ref);

  final Ref _ref;

  Future<PaymentSubmission> submit({
    required String orderId,
    required String method,
    String? utrNumber,
    String? proofPath,
    String? proofFileName,
    String? idempotencyKey,
  }) async {
    final dio = _ref.read(apiClientProvider);
    final reference = utrNumber?.trim().isNotEmpty == true
        ? utrNumber!.trim()
        : method.trim();
    if (!RegExp(r'^[A-Za-z0-9]{6,35}$').hasMatch(reference)) {
      throw const FormatException('UTR must contain 6 to 35 letters or digits.');
    }
    final String? cleanProofPath = proofPath?.trim().isNotEmpty == true
        ? proofPath!.trim()
        : null;
    final Map<String, dynamic> fields = <String, dynamic>{
      'paymentMode': method.trim(),
      'paymentReference': reference,
      'utrNumber': reference,
      'paymentNote': method.trim(),
      if (idempotencyKey?.trim().isNotEmpty == true)
        'idempotencyKey': idempotencyKey!.trim(),
    };
    if (cleanProofPath == null) {
      throw const FormatException('Payment proof file is required.');
    }
    final response = await dio.post<Map<String, dynamic>>(
      '/orders/$orderId/payment-proof/upload',
      data: FormData.fromMap(<String, dynamic>{
        ...fields,
        'proof': await MultipartFile.fromFile(
          cleanProofPath,
          filename: proofFileName,
        ),
      }),
    );
    final data = nestEnvelopeData(response.data);
    if (data is! Map) {
      throw const FormatException('Payment submission response is invalid.');
    }
    return _paymentSubmissionFromJson(Map<String, dynamic>.from(data));
  }
}

final invoiceCenterProvider =
    FutureProvider<List<InvoiceDocument>>((ref) async {
  final token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return const <InvoiceDocument>[];
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get<Map<String, dynamic>>('/invoices');
  final data = nestEnvelopeData(response.data);
  if (data is! List) return const <InvoiceDocument>[];
  return data
      .whereType<Map>()
      .map((raw) => _invoiceFromJson(Map<String, dynamic>.from(raw)))
      .toList(growable: false);
});

final orderTimelineProvider =
    FutureProvider.family<List<OrderTimelineEvent>, String>((ref, id) async {
  final token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return const <OrderTimelineEvent>[];
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get<Map<String, dynamic>>('/orders/$id/timeline');
  final data = nestEnvelopeData(response.data);
  if (data is! List) return const <OrderTimelineEvent>[];
  return data
      .whereType<Map>()
      .map((raw) => _timelineFromJson(Map<String, dynamic>.from(raw)))
      .toList(growable: false);
});

final orderRequestServiceProvider = Provider<OrderRequestService>(
  OrderRequestService.new,
);

class OrderRequestService {
  const OrderRequestService(this._ref);

  final Ref _ref;

  Future<void> createRequest({
    required String orderId,
    required String type,
    required String reason,
    String? description,
    String? note,
    List<String> photoPaths = const <String>[],
  }) async {
    final dio = _ref.read(apiClientProvider);
    if (type == 'REPLACEMENT') {
      final files = <MultipartFile>[];
      for (final path in photoPaths) {
        files.add(await MultipartFile.fromFile(
          path,
          filename: path.split(RegExp(r'[/\\]')).last,
        ));
      }
      await dio.post<Map<String, dynamic>>(
        '/orders/$orderId/requests',
        data: FormData.fromMap(<String, dynamic>{
          'type': type,
          'reason': reason.trim(),
          'description': description?.trim() ?? '',
          'photos': files,
        }),
      );
      return;
    }
    await dio.post<Map<String, dynamic>>(
      '/orders/$orderId/requests',
      data: <String, dynamic>{
        'type': type,
        'reason': reason.trim(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
  }

  Future<String?> activeRequestStatus(String orderId) async {
    final response = await _ref.read(apiClientProvider).get<Map<String, dynamic>>(
          '/orders/$orderId/requests',
        );
    final data = nestEnvelopeData(response.data);
    if (data is! List) return null;
    const active = <String>{
      'REQUESTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REPLACEMENT_SHIPPED',
    };
    for (final raw in data.whereType<Map>()) {
      final status = '${raw['status'] ?? ''}'.trim().toUpperCase();
      if (active.contains(status)) return status;
    }
    return null;
  }
}

final rfqProvider = FutureProvider<List<RfqRequest>>((ref) async {
  final token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return const <RfqRequest>[];
  final response =
      await ref.watch(apiClientProvider).get<Map<String, dynamic>>('/rfqs');
  final data = nestEnvelopeData(response.data);
  if (data is! List) return const <RfqRequest>[];
  return data
      .whereType<Map>()
      .map((raw) => _rfqFromJson(Map<String, dynamic>.from(raw)))
      .toList(growable: false);
});

final quotationProvider = FutureProvider<List<Quotation>>((ref) async {
  final token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return const <Quotation>[];
  final response = await ref
      .watch(apiClientProvider)
      .get<Map<String, dynamic>>('/quotations');
  final data = nestEnvelopeData(response.data);
  if (data is! List) return const <Quotation>[];
  return data
      .whereType<Map>()
      .map((raw) => _quoteFromJson(Map<String, dynamic>.from(raw)))
      .toList(growable: false);
});

final rfqServiceProvider = Provider<RfqService>(RfqService.new);

class RfqService {
  const RfqService(this._ref);

  final Ref _ref;

  Future<void> create({
    required Product product,
    required int quantity,
    double? targetPrice,
    String? message,
  }) async {
    await _ref.read(apiClientProvider).post<Map<String, dynamic>>(
      '/rfqs',
      data: <String, dynamic>{
        'productId': product.id,
        'productName': product.name,
        'quantity': quantity,
        if (targetPrice != null) 'targetPrice': targetPrice,
        if (message?.trim().isNotEmpty == true) 'message': message!.trim(),
      },
    );
    _ref.invalidate(rfqProvider);
  }

  Future<void> approveQuote(Quotation quote) async {
    await _ref
        .read(apiClientProvider)
        .post<Map<String, dynamic>>('/quotations/${quote.id}/approve');
    _ref.invalidate(quotationProvider);
  }
}

final creditLedgerProvider =
    FutureProvider<List<CreditLedgerEntry>>((ref) async {
  final token = ref.watch(authTokenProvider);
  if (token == null || token.isEmpty) return const <CreditLedgerEntry>[];
  final response = await ref
      .watch(apiClientProvider)
      .get<Map<String, dynamic>>('/storefront/customer/credit-ledger');
  final data = nestEnvelopeData(response.data);
  if (data is! List) return const <CreditLedgerEntry>[];
  return data
      .whereType<Map>()
      .map((raw) => _ledgerFromJson(Map<String, dynamic>.from(raw)))
      .toList(growable: false);
});

BusinessProfile _businessProfileFromJson(Map<String, dynamic> json) {
  final status =
      '${json['status'] ?? json['verificationStatus'] ?? json['verification_status'] ?? ''}'
          .trim()
          .toUpperCase();
  return BusinessProfile(
    companyLegalName:
        '${json['companyLegalName'] ?? json['company_legal_name'] ?? json['legalName'] ?? ''}'
            .trim(),
    gstin: '${json['gstin'] ?? json['gstNumber'] ?? json['gst_number'] ?? ''}'
        .trim()
        .toUpperCase(),
    verified: json['verified'] == true || status == 'VERIFIED',
    status: status.isEmpty ? 'UNVERIFIED' : status,
    message: json['message']?.toString(),
    certificateUrl: json['certificateUrl']?.toString() ??
        json['certificate_url']?.toString(),
    certificateFileName: json['certificateFileName']?.toString() ??
        json['certificate_file_name']?.toString(),
    verifiedAt:
        DateTime.tryParse('${json['verifiedAt'] ?? json['verified_at'] ?? ''}'),
  );
}

DistributorPaymentSettings _paymentSettingsFromJson(Map<String, dynamic> json) {
  String text(String camel, String snake) =>
      '${json[camel] ?? json[snake] ?? ''}'.trim();
  return DistributorPaymentSettings(
    accountHolderName: text('accountHolderName', 'account_holder_name'),
    bankName: text('bankName', 'bank_name'),
    accountNumber: text('accountNumber', 'account_number'),
    ifsc: text('ifsc', 'ifsc'),
    branch: text('branch', 'branch'),
    upiId: text('upiId', 'upi_id'),
  );
}

PaymentSubmission _paymentSubmissionFromJson(Map<String, dynamic> json) {
  return PaymentSubmission(
    orderId: '${json['orderId'] ?? json['order_id'] ?? ''}',
    method: '${json['method'] ?? json['paymentMethod'] ?? json['payment_method'] ?? ''}',
    status: '${json['status'] ?? 'PENDING_VERIFICATION'}',
    utrNumber: json['utrNumber']?.toString() ?? json['utr_number']?.toString(),
    proofPath: json['proofPath']?.toString() ??
        json['proof_path']?.toString() ??
        json['paymentScreenshotUrl']?.toString() ??
        json['payment_screenshot_url']?.toString(),
  );
}

InvoiceDocument _invoiceFromJson(Map<String, dynamic> json) {
  double money(Object? raw) => double.tryParse('${raw ?? 0}') ?? 0;
  return InvoiceDocument(
    id: '${json['id'] ?? ''}',
    orderId: '${json['orderId'] ?? json['order_id'] ?? ''}',
    invoiceNumber:
        '${json['invoiceNumber'] ?? json['invoice_number'] ?? json['number'] ?? ''}',
    total: money(json['total'] ?? json['totalAmount'] ?? json['total_amount']),
    gstTotal: money(json['gstTotal'] ?? json['gst_total'] ?? json['taxAmount']),
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? json['created_at'] ?? ''}') ??
            DateTime.now(),
    pdfUrl: json['pdfUrl']?.toString() ?? json['pdf_url']?.toString(),
  );
}

OrderTimelineEvent _timelineFromJson(Map<String, dynamic> json) {
  return OrderTimelineEvent(
    title: '${json['title'] ?? json['status'] ?? 'Update'}',
    status: '${json['status'] ?? ''}',
    description: json['description']?.toString(),
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? json['created_at'] ?? ''}') ??
            DateTime.now(),
  );
}

RfqRequest _rfqFromJson(Map<String, dynamic> json) {
  double? money(Object? raw) => raw == null ? null : double.tryParse('$raw');
  return RfqRequest(
    id: '${json['id'] ?? ''}',
    productId: '${json['productId'] ?? json['product_id'] ?? ''}',
    productName: '${json['productName'] ?? json['product_name'] ?? 'Product'}',
    quantity: int.tryParse('${json['quantity'] ?? 1}') ?? 1,
    status: '${json['status'] ?? 'REQUESTED'}',
    targetPrice: money(json['targetPrice'] ?? json['target_price']),
    message: json['message']?.toString(),
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? json['created_at'] ?? ''}') ??
            DateTime.now(),
  );
}

Quotation _quoteFromJson(Map<String, dynamic> json) {
  double money(Object? raw) => double.tryParse('${raw ?? 0}') ?? 0;
  return Quotation(
    id: '${json['id'] ?? ''}',
    rfqId: '${json['rfqId'] ?? json['rfq_id'] ?? ''}',
    productName: '${json['productName'] ?? json['product_name'] ?? 'Product'}',
    quantity: int.tryParse('${json['quantity'] ?? 1}') ?? 1,
    quotedPrice: money(json['quotedPrice'] ?? json['quoted_price']),
    status: '${json['status'] ?? 'PENDING'}',
    validUntil: DateTime.tryParse(
            '${json['validUntil'] ?? json['valid_until'] ?? ''}') ??
        DateTime.now().add(const Duration(days: 7)),
  );
}

CreditLedgerEntry _ledgerFromJson(Map<String, dynamic> json) {
  double money(Object? raw) => double.tryParse('${raw ?? 0}') ?? 0;
  return CreditLedgerEntry(
    id: '${json['id'] ?? ''}',
    type: '${json['type'] ?? 'DEBIT'}',
    amount: money(json['amount']),
    balance: money(json['balance']),
    reference: json['reference']?.toString(),
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? json['created_at'] ?? ''}') ??
            DateTime.now(),
    dueDate: DateTime.tryParse('${json['dueDate'] ?? json['due_date'] ?? ''}'),
  );
}
