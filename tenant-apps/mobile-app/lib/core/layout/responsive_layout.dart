abstract final class ResponsiveLayout {
  static int gridColumns(
    double width, {
    required double minimumItemWidth,
    double spacing = 12,
    int maximumColumns = 2,
  }) {
    if (!width.isFinite || width <= 0) return 1;
    final int columns =
        ((width + spacing) / (minimumItemWidth + spacing)).floor();
    return columns.clamp(1, maximumColumns);
  }
}
