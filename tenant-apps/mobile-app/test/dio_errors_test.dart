import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/api/dio_errors.dart';

void main() {
  test('reads the global exception filter error message', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/orders'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/orders'),
        statusCode: 400,
        data: <String, dynamic>{
          'success': false,
          'error': 'Online payment is not configured.',
        },
      ),
    );

    expect(
      describeDioError(error),
      '[400] Online payment is not configured.',
    );
  });

  test('reads nested provider errors', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/orders/order-id/razorpay/order'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/orders/order-id/razorpay/order'),
        statusCode: 502,
        data: <String, dynamic>{
          'success': false,
          'error': <String, dynamic>{
            'message': 'Razorpay order could not be created.',
          },
        },
      ),
    );

    expect(
      describeDioError(error),
      '[502] Razorpay order could not be created.',
    );
  });
}
