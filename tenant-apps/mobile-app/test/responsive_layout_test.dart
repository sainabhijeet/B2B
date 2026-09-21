import 'package:flutter_test/flutter_test.dart';
import 'package:ridego/core/layout/responsive_layout.dart';

void main() {
  test('uses one column for compact mobile product grids', () {
    expect(
      ResponsiveLayout.gridColumns(
        320,
        minimumItemWidth: 220,
        spacing: 10,
      ),
      1,
    );
    expect(
      ResponsiveLayout.gridColumns(328, minimumItemWidth: 164),
      1,
    );
  });

  test('uses two columns when normal mobile width allows it', () {
    expect(
      ResponsiveLayout.gridColumns(288, minimumItemWidth: 130),
      2,
    );
    expect(
      ResponsiveLayout.gridColumns(
        516,
        minimumItemWidth: 220,
        spacing: 10,
      ),
      2,
    );
    expect(
      ResponsiveLayout.gridColumns(368, minimumItemWidth: 164),
      2,
    );
  });
}
