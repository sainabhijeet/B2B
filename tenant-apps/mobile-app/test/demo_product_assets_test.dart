import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/shared/data/demo_app_data.dart';

void main() {
  test('every demo product uses a unique bundled product photo', () {
    final Set<String> imagePaths = <String>{};

    for (final product in kDemoProducts) {
      final String imagePath = product.imageUrl ?? '';
      expect(imagePath, startsWith('assets/images/demo_products/'));
      expect(File(imagePath).existsSync(), isTrue, reason: imagePath);
      expect(imagePaths.add(imagePath), isTrue, reason: imagePath);
    }
  });
}
