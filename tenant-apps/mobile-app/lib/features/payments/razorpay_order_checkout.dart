import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../core/api/dio_errors.dart';
import '../../core/api/nest_json.dart';

String razorpayContactFromProfile(String raw) {
  final String trimmed = raw.trim();
  final String digits = trimmed.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return '';
  if (trimmed.startsWith('+')) return '+$digits';
  if (digits.length == 10) return '+91$digits';
  if (digits.length == 12 && digits.startsWith('91')) return '+$digits';
  return digits;
}

class RazorpayOrderCheckoutResult {
  const RazorpayOrderCheckoutResult({
    required this.orderId,
    required this.paymentStatus,
    required this.alreadyPaid,
  });

  final String orderId;
  final String paymentStatus;
  final bool alreadyPaid;
}

class RazorpayOrderCheckoutException implements Exception {
  const RazorpayOrderCheckoutException(
    this.message, {
    this.cancelled = false,
    this.paymentMayHaveSucceeded = false,
  });

  final String message;
  final bool cancelled;
  final bool paymentMayHaveSucceeded;

  @override
  String toString() => message;
}

class RazorpayOrderCheckout {
  static const MethodChannel _paymentNavigationChannel =
      MethodChannel('glowora/payment_navigation');

  static Future<RazorpayOrderCheckoutResult> pay({
    required Dio dio,
    required String orderId,
    required String merchantName,
    required String customerName,
    required String customerPhone,
    required String customerEmail,
    required int primaryColorValue,
    VoidCallback? onPaymentSuccess,
  }) async {
    if (kIsWeb) {
      throw const RazorpayOrderCheckoutException(
        'Online Pay is available in the Android or iOS app.',
      );
    }

    late final Response<Map<String, dynamic>> sessionResponse;
    try {
      sessionResponse = await dio
          .post<Map<String, dynamic>>('/orders/$orderId/razorpay/order');
    } on DioException catch (error) {
      throw RazorpayOrderCheckoutException(_apiMessage(error));
    }
    final Object? rawSession = nestEnvelopeData(sessionResponse.data);
    if (rawSession is! Map) {
      throw const RazorpayOrderCheckoutException(
        'The online payment session response is invalid.',
      );
    }
    final Map<String, dynamic> session = Map<String, dynamic>.from(rawSession);
    final bool alreadyPaid = session['alreadyPaid'] == true;
    if (alreadyPaid) {
      return RazorpayOrderCheckoutResult(
        orderId: orderId,
        paymentStatus: 'VERIFIED',
        alreadyPaid: true,
      );
    }

    final String keyId = '${session['razorpayKeyId'] ?? ''}'.trim();
    final String providerOrderId = '${session['razorpayOrderId'] ?? ''}'.trim();
    final int amountPaise = _integer(session['amountPaise']);
    final String currency = '${session['currency'] ?? 'INR'}'.trim();
    if (keyId.isEmpty ||
        providerOrderId.isEmpty ||
        amountPaise < 100 ||
        currency != 'INR') {
      throw const RazorpayOrderCheckoutException(
        'The online payment session is incomplete.',
      );
    }

    final _RazorpayCheckoutCompletion completion;
    try {
      completion = await _openCheckout(
        keyId: keyId,
        providerOrderId: providerOrderId,
        amountPaise: amountPaise,
        currency: currency,
        merchantName: merchantName,
        orderNumber: '${session['orderNumber'] ?? orderId}',
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        primaryColorValue: primaryColorValue,
        onPaymentSuccess: onPaymentSuccess,
        reconcilePayment: () => _watchCapturedPayment(
          dio: dio,
          orderId: orderId,
        ),
      );
    } on RazorpayOrderCheckoutException catch (error) {
      final synced = await _syncCapturedPayment(dio: dio, orderId: orderId);
      if (synced != null) return synced;
      throw RazorpayOrderCheckoutException(
        error.paymentMayHaveSucceeded
            ? '${error.message} Check Orders or tap Pay Online again to verify.'
            : error.message,
        cancelled: error.cancelled,
        paymentMayHaveSucceeded: error.paymentMayHaveSucceeded,
      );
    }
    final RazorpayOrderCheckoutResult? reconciled = completion.reconciled;
    if (reconciled != null) return reconciled;

    final PaymentSuccessResponse success = completion.response!;
    final String paymentId = success.paymentId?.trim() ?? '';
    final String callbackOrderId = success.orderId?.trim() ?? '';
    final String signature = success.signature?.trim() ?? '';
    if (paymentId.isEmpty ||
        callbackOrderId != providerOrderId ||
        signature.isEmpty) {
      final synced = await _syncCapturedPayment(dio: dio, orderId: orderId);
      if (synced != null) return synced;
      throw const RazorpayOrderCheckoutException(
        'Razorpay returned incomplete payment verification details.',
        paymentMayHaveSucceeded: true,
      );
    }

    late final Response<Map<String, dynamic>> verificationResponse;
    try {
      verificationResponse = await dio.post<Map<String, dynamic>>(
        '/orders/$orderId/razorpay/verify',
        data: <String, dynamic>{
          'razorpayOrderId': providerOrderId,
          'razorpayPaymentId': paymentId,
          'razorpaySignature': signature,
        },
      );
    } on DioException catch (error) {
      final synced = await _syncCapturedPayment(dio: dio, orderId: orderId);
      if (synced != null) return synced;
      throw RazorpayOrderCheckoutException(
        '${_apiMessage(error)} Retry verification from Orders.',
        paymentMayHaveSucceeded: true,
      );
    }
    final Object? rawVerification = nestEnvelopeData(verificationResponse.data);
    if (rawVerification is! Map) {
      throw const RazorpayOrderCheckoutException(
        'Payment was received but server verification failed. Retry from Orders.',
        paymentMayHaveSucceeded: true,
      );
    }
    final String paymentStatus =
        '${rawVerification['paymentStatus'] ?? ''}'.toUpperCase();
    if (paymentStatus != 'VERIFIED') {
      throw const RazorpayOrderCheckoutException(
        'Payment is not verified yet. Retry from Orders.',
        paymentMayHaveSucceeded: true,
      );
    }
    return RazorpayOrderCheckoutResult(
      orderId: orderId,
      paymentStatus: paymentStatus,
      alreadyPaid: false,
    );
  }

  static Future<_RazorpayCheckoutCompletion> _openCheckout({
    required String keyId,
    required String providerOrderId,
    required int amountPaise,
    required String currency,
    required String merchantName,
    required String orderNumber,
    required String customerName,
    required String customerPhone,
    required String customerEmail,
    required int primaryColorValue,
    VoidCallback? onPaymentSuccess,
    required Future<RazorpayOrderCheckoutResult?> Function() reconcilePayment,
  }) async {
    final Razorpay razorpay = Razorpay();
    final Completer<_RazorpayCheckoutCompletion> completer =
        Completer<_RazorpayCheckoutCompletion>();

    void success(PaymentSuccessResponse response) {
      onPaymentSuccess?.call();
      if (!completer.isCompleted) {
        completer.complete(_RazorpayCheckoutCompletion(response: response));
      }
    }

    void failure(PaymentFailureResponse response) {
      if (completer.isCompleted) return;
      final bool cancelled = response.code == Razorpay.PAYMENT_CANCELLED;
      final String fallback = cancelled
          ? 'Online payment was cancelled.'
          : 'Online payment failed.';
      final String message = response.message?.trim() ?? '';
      completer.completeError(
        RazorpayOrderCheckoutException(
          message.isEmpty ? fallback : message,
          cancelled: cancelled,
          paymentMayHaveSucceeded: !cancelled,
        ),
      );
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, success);
    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, failure);
    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET,
        (ExternalWalletResponse response) {
      // UPI apps such as PhonePe can emit this before the final result.
      // Keep checkout open until Razorpay sends success/error.
    });
    try {
      final String profileContact = razorpayContactFromProfile(customerPhone);
      final Map<String, String> prefill = <String, String>{
        if (customerName.trim().isNotEmpty) 'name': customerName.trim(),
        if (profileContact.isNotEmpty) 'contact': profileContact,
        if (customerEmail.trim().isNotEmpty) 'email': customerEmail.trim(),
      };
      razorpay.open(<String, dynamic>{
        'key': keyId,
        'amount': amountPaise,
        'currency': currency,
        'order_id': providerOrderId,
        'method': 'upi',
        'name':
            merchantName.trim().isEmpty ? 'B2B Commerce' : merchantName.trim(),
        'description': 'Payment for order $orderNumber',
        'timeout': 300,
        // A failed UPI hand-off must return control to the app. Razorpay's
        // retry sheet can otherwise remain above Flutter even after the bank
        // has completed the payment.
        'retry': <String, dynamic>{'enabled': false},
        if (prefill.isNotEmpty) 'prefill': prefill,
        'config': <String, dynamic>{
          'display': <String, dynamic>{
            'blocks': <String, dynamic>{
              'upi': <String, dynamic>{
                'name': 'Pay via UPI',
                'instruments': <Map<String, dynamic>>[
                  <String, dynamic>{
                    'method': 'upi',
                    'flows': <String>['collect', 'intent', 'qr'],
                  },
                ],
              },
            },
            'sequence': <String>['block.upi'],
            'preferences': <String, dynamic>{
              'show_default_blocks': true,
            },
          },
        },
        'theme': <String, String>{
          'color':
              '#${(primaryColorValue & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}',
        },
      });

      // Razorpay Android occasionally receives a successful UPI payment but
      // emits neither EVENT_PAYMENT_SUCCESS nor EVENT_PAYMENT_ERROR. Do not
      // leave the customer trapped in Checkout in that case: independently
      // reconcile the provider order on our server and use that authoritative
      // result to finish the native Checkout activity.
      unawaited(
        reconcilePayment().then((RazorpayOrderCheckoutResult? result) async {
          if (result == null || completer.isCompleted) return;
          onPaymentSuccess?.call();
          completer.complete(_RazorpayCheckoutCompletion(reconciled: result));
          await _returnToAppAfterConfirmedPayment();
        }).catchError((Object _) {
          // The normal Razorpay callbacks remain active if reconciliation is
          // temporarily unavailable.
        }),
      );
      return await completer.future.timeout(
        const Duration(minutes: 6),
        onTimeout: () => throw const RazorpayOrderCheckoutException(
          'Online payment timed out. Retry from Orders.',
          paymentMayHaveSucceeded: true,
        ),
      );
    } catch (error) {
      if (error is RazorpayOrderCheckoutException) rethrow;
      throw RazorpayOrderCheckoutException(
        error is DioException
            ? _apiMessage(error)
            : 'Unable to open Online Pay. Please try again.',
      );
    } finally {
      razorpay.clear();
    }
  }

  static int _integer(Object? value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }

  static Future<RazorpayOrderCheckoutResult?> _syncCapturedPayment({
    required Dio dio,
    required String orderId,
  }) async {
    for (int attempt = 0; attempt < 6; attempt += 1) {
      if (attempt > 0) {
        await Future<void>.delayed(const Duration(seconds: 2));
      }
      try {
        final Response<Map<String, dynamic>> response = await dio
            .post<Map<String, dynamic>>('/orders/$orderId/razorpay/order');
        final Object? raw = nestEnvelopeData(response.data);
        if (raw is! Map) continue;
        final Map<String, dynamic> data = Map<String, dynamic>.from(raw);
        if (data['alreadyPaid'] == true) {
          return RazorpayOrderCheckoutResult(
            orderId: orderId,
            paymentStatus: 'VERIFIED',
            alreadyPaid: true,
          );
        }
      } catch (_) {
        continue;
      }
    }
    return null;
  }

  static Future<RazorpayOrderCheckoutResult?> _watchCapturedPayment({
    required Dio dio,
    required String orderId,
  }) async {
    // The first request is immediate so a webhook that won the race is picked
    // up without delay. Subsequent requests also ask the backend to reconcile
    // the Razorpay order directly, covering delayed/missing webhooks.
    for (int attempt = 0; attempt < 80; attempt += 1) {
      if (attempt > 0) {
        await Future<void>.delayed(const Duration(seconds: 4));
      }
      try {
        final Response<Map<String, dynamic>> response = await dio
            .post<Map<String, dynamic>>('/orders/$orderId/razorpay/order');
        final Object? raw = nestEnvelopeData(response.data);
        if (raw is! Map) continue;
        final Map<String, dynamic> data = Map<String, dynamic>.from(raw);
        if (data['alreadyPaid'] == true) {
          return RazorpayOrderCheckoutResult(
            orderId: orderId,
            paymentStatus: 'VERIFIED',
            alreadyPaid: true,
          );
        }
      } catch (_) {
        // Keep the gateway callbacks usable during a transient API outage.
      }
    }
    return null;
  }

  static Future<void> _returnToAppAfterConfirmedPayment() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _paymentNavigationChannel
          .invokeMethod<void>('returnToAppAfterPayment');
    } on MissingPluginException {
      // Older builds/platforms can still return through the SDK callback.
    } on PlatformException {
      // Server verification has succeeded; navigation must not be converted
      // back into a payment failure if Android cannot close Checkout itself.
    }
  }

  static String _apiMessage(DioException error) {
    return describeDioError(error);
  }
}

class _RazorpayCheckoutCompletion {
  const _RazorpayCheckoutCompletion({this.response, this.reconciled})
      : assert((response == null) != (reconciled == null));

  final PaymentSuccessResponse? response;
  final RazorpayOrderCheckoutResult? reconciled;
}
