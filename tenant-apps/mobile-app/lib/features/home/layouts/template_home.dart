import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/theme_model.dart';
import '../../../core/localization/language_provider.dart';
import '../../../core/config/user_app_settings_provider.dart';
import '../../../shared/models/models.dart';
import '../../products/product_detail_screen.dart';
import '../../products/products_screen.dart';
import '../../products/products_provider.dart';
import '../../products/recently_viewed_provider.dart';
import '../../wishlist/wishlist_provider.dart';

class TemplateHome extends ConsumerWidget {
  const TemplateHome({super.key, required this.theme});

  final StorefrontTheme theme;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dio = ref.watch(apiClientProvider);
    final sections =
        theme.preview?.homeSections ?? const <ThemeTemplateSection>[];
    final fallbackImages = _fallbackImages(theme);
    final categoriesAsync = ref.watch(categoriesProvider);
    final productsAsync = ref.watch(productsProvider);
    final productsTotalAsync = ref.watch(productsTotalProvider);
    final recentlyViewedProducts = ref.watch(recentlyViewedProductsProvider);
    final t = ref.watch(appTranslatorProvider);
    final localization = ref.watch(mobileLocalizationServiceProvider);
    final bool recommendationsEnabled = ref.watch(
      userAppSettingsProvider.select(
        (UserAppSettings settings) => settings.recommendationsEnabled,
      ),
    );

    void openProductDetails(Product product) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ProductDetailScreen(product: product),
        ),
      );
    }

    void openCategoryProducts(Category category) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (BuildContext context) => Scaffold(
            appBar: AppBar(
              toolbarHeight: 60,
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              title: Text(
                t(category.name),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            body: ProductsScreen(category: category),
          ),
        ),
      );
    }

    void openAllProducts() {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (BuildContext context) => Scaffold(
            appBar: AppBar(
              toolbarHeight: 60,
              title: Text(
                t('All products'),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            body: const ProductsScreen(),
          ),
        ),
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      children: sections
          .map(
            (section) => _sectionWidget(
              section,
              categoriesAsync: categoriesAsync,
              productsAsync: productsAsync,
              productsTotalAsync: productsTotalAsync,
              recentlyViewedProducts: recentlyViewedProducts,
              fallbackImages: fallbackImages,
              t: t,
              formatCurrency: localization.formatCurrency,
              recommendationsEnabled: recommendationsEnabled,
              onOpenCategory: openCategoryProducts,
              onOpenProduct: openProductDetails,
              onBrowseProducts: openAllProducts,
              onRetryCategories: () => ref.invalidate(categoriesProvider),
              onRetryProducts: () => ref.invalidate(productsProvider),
              mediaBaseUrl: dio.options.baseUrl,
            ),
          )
          .whereType<Widget>()
          .toList(growable: false),
    );
  }

  Widget? _sectionWidget(
    ThemeTemplateSection section, {
    required AsyncValue<List<Category>> categoriesAsync,
    required AsyncValue<List<Product>> productsAsync,
    required AsyncValue<int> productsTotalAsync,
    required List<Product> recentlyViewedProducts,
    required List<String> fallbackImages,
    required String Function(String) t,
    required String Function(num) formatCurrency,
    required bool recommendationsEnabled,
    required void Function(Category category) onOpenCategory,
    required void Function(Product product) onOpenProduct,
    required VoidCallback onBrowseProducts,
    required VoidCallback onRetryCategories,
    required VoidCallback onRetryProducts,
    required String mediaBaseUrl,
  }) {
    final type = section.type.toLowerCase().trim();
    if (!recommendationsEnabled &&
        (type.contains('recommend') || type.contains('trend'))) {
      return null;
    }
    if (type.contains('header') || type.contains('footer')) return null;
    if (type.contains('spacer')) return const SizedBox(height: 16);
    if (type.contains('divider')) return const Divider(height: 24);
    if (type.contains('hero')) {
      return _HeroSection(
        eyebrow: t(section.stringSetting('eyebrow')),
        title: t(_sectionTitle(section)),
        subtitle: t(
          section.stringSetting(
            'subtitle',
            'Trade pricing and live catalog ordering for modern retailers.',
          ),
        ),
        image: theme.assetUrl(section.stringSetting('image')),
        ctaLabel: t(section.stringSetting('primaryCta', 'Shop products')),
        onCtaPressed: onBrowseProducts,
      );
    }
    if (type == 'feature-grid' || type == 'catalog-summary') {
      return _CatalogSummarySection(
        section: section,
        categoriesAsync: categoriesAsync,
        productsAsync: productsAsync,
        productsTotalAsync: productsTotalAsync,
        t: t,
      );
    }
    if (type.contains('category') || type.contains('collection')) {
      return _CategorySection(
        theme: theme,
        section: section,
        categoriesAsync: categoriesAsync,
        productsAsync: productsAsync,
        fallbackImages: fallbackImages,
        t: t,
        onOpenCategory: onOpenCategory,
        onRetry: onRetryCategories,
        mediaBaseUrl: mediaBaseUrl,
      );
    }
    if (type.contains('brand')) {
      return _BrandSection(
        theme: theme,
        section: section,
        productsAsync: productsAsync,
        t: t,
        onRetry: onRetryProducts,
      );
    }
    if (type.contains('recent')) {
      if (recentlyViewedProducts.isEmpty) return null;
      return _ProductSection(
        theme: theme,
        section: section,
        productsAsync: AsyncValue<List<Product>>.data(recentlyViewedProducts),
        fallbackImages: fallbackImages,
        t: t,
        formatCurrency: formatCurrency,
        onOpenProduct: onOpenProduct,
        onRetry: () {},
        mediaBaseUrl: mediaBaseUrl,
      );
    }
    if (type.contains('product') ||
        type.contains('arrival') ||
        type.contains('seller') ||
        type.contains('trend') ||
        type.contains('essential') ||
        type.contains('beverage') ||
        type.contains('snack') ||
        type.contains('dairy') ||
        type.contains('cooking') ||
        type.contains('cleaning') ||
        type.contains('personal') ||
        type.contains('wholesale')) {
      return _ProductSection(
        theme: theme,
        section: section,
        productsAsync: productsAsync,
        fallbackImages: fallbackImages,
        t: t,
        formatCurrency: formatCurrency,
        onOpenProduct: onOpenProduct,
        onRetry: onRetryProducts,
        mediaBaseUrl: mediaBaseUrl,
      );
    }
    if (type.contains('promo') ||
        type.contains('campaign') ||
        type.contains('offer') ||
        type.contains('sale') ||
        type.contains('announcement')) {
      return _PromoSection(
        section: section,
        t: t,
        onPressed: onBrowseProducts,
      );
    }
    if (type.contains('image-with-text') || type.contains('image-text')) {
      return _ImageTextSection(
        theme: theme,
        section: section,
        t: t,
      );
    }
    if (type.contains('feature-list')) {
      return _FeatureListSection(section: section, t: t);
    }
    if (type.contains('testimonial')) {
      return _TestimonialSection(section: section, t: t);
    }
    if (type.contains('cta')) {
      return _CtaSection(
        section: section,
        t: t,
        onPressed: onBrowseProducts,
      );
    }
    return null;
  }
}

String _defaultSectionTitle(String rawType) {
  final type = rawType.toLowerCase().trim().replaceAll('-', '_');
  const titles = <String, String>{
    'hero_banners': 'Wholesale Grocery Deals',
    'hero_banner': 'Wholesale Grocery Deals',
    'shop_by_category': 'Shop by Category',
    'category_grid': 'Shop by Category',
    'fmcg_brands': 'FMCG Brands',
    'best_selling_products': 'Best Selling Products',
    'best_sellers': 'Best Selling Products',
    'daily_essentials': 'Daily Essentials',
    'beverages': 'Beverages',
    'snacks_biscuits': 'Snacks & Biscuits',
    'dairy_products': 'Dairy Products',
    'cooking_essentials': 'Cooking Essentials',
    'cleaning_products': 'Cleaning Products',
    'personal_care': 'Personal Care',
    'wholesale_deals': 'Wholesale Deals',
    'recently_ordered': 'Recently Ordered',
    'recommended_products': 'Recommended Products',
  };
  final exact = titles[type];
  if (exact != null) return exact;
  return type
      .split('_')
      .where((word) => word.isNotEmpty)
      .map((word) => '${word[0].toUpperCase()}${word.substring(1)}')
      .join(' ');
}

String _sectionTitle(ThemeTemplateSection section) {
  final title = section.stringSetting('title');
  if (title.isNotEmpty) return title;
  final titleKey = section.stringSetting('titleKey');
  if (titleKey.isNotEmpty) return titleKey;
  return _defaultSectionTitle(section.type);
}

int _sectionLimit(ThemeTemplateSection section, int fallback) {
  final value = section.settings['limit'];
  final parsed = value is num ? value.toInt() : int.tryParse('$value');
  return parsed != null && parsed > 0 ? parsed : fallback;
}

List<String> _fallbackImages(StorefrontTheme theme) {
  final sections =
      theme.preview?.homeSections ?? const <ThemeTemplateSection>[];
  return sections
      .map((section) => section.stringSetting('image'))
      .where((image) => image.isNotEmpty)
      .map(theme.assetUrl)
      .toList(growable: false);
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    required this.image,
    required this.ctaLabel,
    required this.onCtaPressed,
  });

  final String eyebrow;
  final String title;
  final String subtitle;
  final String image;
  final String ctaLabel;
  final VoidCallback onCtaPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              if (image.isEmpty)
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: <Color>[
                        Theme.of(context).colorScheme.primaryContainer,
                        Theme.of(context).colorScheme.secondaryContainer,
                      ],
                    ),
                  ),
                )
              else
                _ThemeImage(
                  url: image,
                  fit: BoxFit.cover,
                  showFallbackIcon: false,
                ),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: <Color>[
                      Color(0xF7FFFFFF),
                      Color(0xCFFFFFFF),
                      Color(0x00FFFFFF),
                    ],
                    stops: <double>[0, 0.42, 0.76],
                  ),
                ),
              ),
              Positioned(
                left: 18,
                top: 0,
                bottom: 0,
                width: 184,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    if (eyebrow.isNotEmpty) ...<Widget>[
                      Text(
                        eyebrow,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 5),
                    ],
                    Text(
                      title,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF1F1720),
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        height: 1.05,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF5C4655),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        height: 1.25,
                      ),
                    ),
                    if (ctaLabel.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 30,
                        child: FilledButton(
                          onPressed: onCtaPressed,
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            textStyle: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          child: Text(ctaLabel),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CatalogSummarySection extends StatelessWidget {
  const _CatalogSummarySection({
    required this.section,
    required this.categoriesAsync,
    required this.productsAsync,
    required this.productsTotalAsync,
    required this.t,
  });

  final ThemeTemplateSection section;
  final AsyncValue<List<Category>> categoriesAsync;
  final AsyncValue<List<Product>> productsAsync;
  final AsyncValue<int> productsTotalAsync;
  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    final categories = categoriesAsync.valueOrNull ?? const <Category>[];
    final products = productsAsync.valueOrNull ?? const <Product>[];
    final productTotal = productsTotalAsync.valueOrNull ?? products.length;
    final brands = products
        .map((product) => product.brand?.trim() ?? '')
        .where((brand) => brand.isNotEmpty)
        .toSet()
        .length;
    final metrics = <(String, String)>[
      ('$productTotal', t('Live products')),
      ('${categories.length}', t('Categories')),
      ('$brands', t('Active brands')),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _SectionHeading(section: section, t: t),
          const SizedBox(height: 12),
          Row(
            children: metrics
                .map(
                  (metric) => Expanded(
                    child: Card(
                      margin: EdgeInsets.only(
                        right: metric == metrics.last ? 0 : 8,
                      ),
                      elevation: 0,
                      color: Theme.of(context).colorScheme.surfaceContainerLow,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 12,
                        ),
                        child: Column(
                          children: <Widget>[
                            Text(
                              metric.$1,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    color:
                                        Theme.of(context).colorScheme.primary,
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              metric.$2,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
        ],
      ),
    );
  }
}

class _PromoSection extends StatelessWidget {
  const _PromoSection({
    required this.section,
    required this.t,
    required this.onPressed,
  });

  final ThemeTemplateSection section;
  final String Function(String) t;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: <Color>[scheme.primary, scheme.secondary],
          ),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      t(section.stringSetting('eyebrow')),
                      style: TextStyle(
                        color: scheme.onPrimary.withValues(alpha: 0.8),
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      t(_sectionTitle(section)),
                      style: TextStyle(
                        color: scheme.onPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      t(section.stringSetting('subtitle')),
                      style: TextStyle(
                        color: scheme.onPrimary.withValues(alpha: 0.88),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              FilledButton.tonal(
                onPressed: onPressed,
                child: Text(t(section.stringSetting('ctaLabel', 'Explore'))),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageTextSection extends StatelessWidget {
  const _ImageTextSection({
    required this.theme,
    required this.section,
    required this.t,
  });

  final StorefrontTheme theme;
  final ThemeTemplateSection section;
  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    final rawHighlights = section.settings['highlights'];
    final highlights = rawHighlights is List
        ? rawHighlights.map((value) => value.toString()).toList(growable: false)
        : const <String>[];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
      child: Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            SizedBox(
              height: 190,
              child: _ThemeImage(
                url: theme.assetUrl(section.stringSetting('image')),
                fit: BoxFit.cover,
                showFallbackIcon: false,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  _SectionHeading(section: section, t: t),
                  if (section.stringSetting('body').isNotEmpty) ...<Widget>[
                    const SizedBox(height: 8),
                    Text(t(section.stringSetting('body'))),
                  ],
                  if (highlights.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 10),
                    ...highlights.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 5),
                        child: Row(
                          children: <Widget>[
                            Icon(
                              Icons.check_circle,
                              color: Theme.of(context).colorScheme.primary,
                              size: 17,
                            ),
                            const SizedBox(width: 7),
                            Expanded(child: Text(t(item))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureListSection extends StatelessWidget {
  const _FeatureListSection({required this.section, required this.t});

  final ThemeTemplateSection section;
  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    final rawItems = section.settings['items'];
    final items = rawItems is List
        ? rawItems.whereType<Map>().toList(growable: false)
        : const <Map>[];
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _SectionHeading(section: section, t: t),
          const SizedBox(height: 10),
          ...items.map(
            (item) => Card(
              elevation: 0,
              color: Theme.of(context).colorScheme.surfaceContainerLow,
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      Theme.of(context).colorScheme.primaryContainer,
                  child: Text(
                    '${item['icon'] ?? ''}',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                title: Text(
                  t('${item['title'] ?? ''}'),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(t('${item['text'] ?? ''}')),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TestimonialSection extends StatelessWidget {
  const _TestimonialSection({required this.section, required this.t});

  final ThemeTemplateSection section;
  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
      child: Card(
        elevation: 0,
        color: Theme.of(context).colorScheme.primaryContainer,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                Icons.format_quote,
                color: Theme.of(context).colorScheme.primary,
                size: 30,
              ),
              Text(
                t(section.stringSetting('quote')),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                t(section.stringSetting('author')),
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CtaSection extends StatelessWidget {
  const _CtaSection({
    required this.section,
    required this.t,
    required this.onPressed,
  });

  final ThemeTemplateSection section;
  final String Function(String) t;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                t(_sectionTitle(section)),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 5),
              Text(t(section.stringSetting('subtitle'))),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onPressed,
                icon: const Icon(Icons.arrow_forward),
                label: Text(
                  t(section.stringSetting('buttonLabel', 'Start shopping')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.section, required this.t});

  final ThemeTemplateSection section;
  final String Function(String) t;

  @override
  Widget build(BuildContext context) {
    final eyebrow = section.stringSetting('eyebrow');
    final subtitle = section.stringSetting('subtitle');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (eyebrow.isNotEmpty) ...<Widget>[
          Text(
            t(eyebrow),
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 4),
        ],
        Text(
          t(_sectionTitle(section)),
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        if (subtitle.isNotEmpty) ...<Widget>[
          const SizedBox(height: 4),
          Text(
            t(subtitle),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ],
    );
  }
}

class _CategorySection extends StatelessWidget {
  const _CategorySection({
    required this.theme,
    required this.section,
    required this.categoriesAsync,
    required this.productsAsync,
    required this.fallbackImages,
    required this.t,
    required this.onOpenCategory,
    required this.onRetry,
    required this.mediaBaseUrl,
  });

  final StorefrontTheme theme;
  final ThemeTemplateSection section;
  final AsyncValue<List<Category>> categoriesAsync;
  final AsyncValue<List<Product>> productsAsync;
  final List<String> fallbackImages;
  final String Function(String) t;
  final void Function(Category category) onOpenCategory;
  final VoidCallback onRetry;
  final String mediaBaseUrl;

  @override
  Widget build(BuildContext context) {
    final images = section.stringListSetting('images');
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            t(_sectionTitle(section)),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          if (section.stringSetting('subtitle').isNotEmpty) ...<Widget>[
            const SizedBox(height: 4),
            Text(
              t(section.stringSetting('subtitle')),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: 12),
          categoriesAsync.when(
            loading: () => const _HorizontalLoadingCards(),
            error: (Object error, _) => _SectionMessageCard(
              title: t('Categories could not load'),
              message: '$error',
              actionLabel: t('Retry'),
              onPressed: onRetry,
            ),
            data: (List<Category> categories) {
              final products = productsAsync.valueOrNull ?? const <Product>[];
              final seenCategoryKeys = <String>{};
              final visibleCategories = categories.where(
                (Category category) {
                  final key = _normalizeCategoryKey(
                    category.slug?.trim().isNotEmpty == true
                        ? category.slug
                        : category.name,
                  );
                  return t(category.name.trim()).trim().isNotEmpty &&
                      (products.isEmpty ||
                          products.any(
                            (product) => _matchesCategory(product, category),
                          )) &&
                      seenCategoryKeys.add(key);
                },
              ).toList(growable: false);
              if (visibleCategories.isEmpty) {
                return _SectionMessageCard(
                  title: t('No categories found'),
                  message:
                      t('Add active categories in catalog to show them here.'),
                  actionLabel: t('Retry'),
                  onPressed: onRetry,
                );
              }
              return SizedBox(
                height: 148,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: visibleCategories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final category = visibleCategories[index];
                    final image =
                        _categoryImage(category, products, images, index);
                    return SizedBox(
                      width: 118,
                      child: Card(
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => onOpenCategory(category),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: <Widget>[
                              Expanded(
                                child: _ThemeImage(
                                  url: image,
                                  fit: BoxFit.cover,
                                  showFallbackIcon: false,
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(8),
                                child: Text(
                                  t(category.name.trim()),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _categoryImage(
    Category category,
    List<Product> products,
    List<String> configuredImages,
    int index,
  ) {
    final categoryImage = category.imageUrl?.trim() ?? '';
    if (categoryImage.startsWith('assets/')) return categoryImage;
    if (categoryImage.isNotEmpty) return _resolveImage(categoryImage);

    for (final product in products) {
      final productImage = product.imageUrl?.trim() ?? '';
      if (_matchesCategory(product, category) && productImage.isNotEmpty) {
        return _resolveImage(productImage);
      }
    }
    final indexedProductImage =
        index < products.length ? products[index].imageUrl?.trim() ?? '' : '';
    if (indexedProductImage.isNotEmpty) {
      return _resolveImage(indexedProductImage);
    }
    if (configuredImages.length > index) {
      return theme.assetUrl(configuredImages[index]);
    }
    if (fallbackImages.isNotEmpty) {
      return fallbackImages[index % fallbackImages.length];
    }
    return '';
  }

  String _normalizeCategoryKey(String? value) {
    return (value ?? '')
        .toLowerCase()
        .trim()
        .replaceAll('&', 'and')
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  bool _matchesCategory(Product product, Category category) {
    final productCategory = _normalizeCategoryKey(product.categoryId);
    return productCategory == _normalizeCategoryKey(category.id) ||
        productCategory == _normalizeCategoryKey(category.slug) ||
        productCategory == _normalizeCategoryKey(category.name);
  }

  String _resolveImage(String image) {
    if (image.startsWith('assets/') ||
        image.startsWith('http://') ||
        image.startsWith('https://') ||
        image.startsWith('data:')) {
      return image;
    }
    if (image.startsWith('/')) {
      return _absoluteFromApiBase(image);
    }
    return theme.assetUrl(image);
  }

  String _absoluteFromApiBase(String image) {
    final base = Uri.tryParse(mediaBaseUrl);
    if (base == null || !base.hasScheme || base.host.isEmpty) return image;
    return base.replace(path: image, query: '').toString();
  }
}

class _BrandSection extends StatelessWidget {
  const _BrandSection({
    required this.theme,
    required this.section,
    required this.productsAsync,
    required this.t,
    required this.onRetry,
  });

  final StorefrontTheme theme;
  final ThemeTemplateSection section;
  final AsyncValue<List<Product>> productsAsync;
  final String Function(String) t;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            t(_sectionTitle(section)),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          if (section.stringSetting('subtitle').isNotEmpty) ...<Widget>[
            const SizedBox(height: 4),
            Text(
              t(section.stringSetting('subtitle')),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: 12),
          productsAsync.when(
            loading: () => const _HorizontalLoadingCards(),
            error: (Object error, _) => _SectionMessageCard(
              title: t('Products could not load'),
              message: '$error',
              actionLabel: t('Retry'),
              onPressed: onRetry,
            ),
            data: (List<Product> products) {
              final brands = products
                  .map((product) => product.brand?.trim() ?? '')
                  .where((brand) => brand.isNotEmpty)
                  .toSet()
                  .take(_sectionLimit(section, 12))
                  .toList(growable: false);
              if (brands.isEmpty) return const SizedBox.shrink();
              return SizedBox(
                height: 98,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: brands.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (BuildContext context, int index) {
                    final brand = brands[index];
                    return SizedBox(
                      width: 106,
                      child: Card(
                        clipBehavior: Clip.antiAlias,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(10, 8, 10, 7),
                          child: Column(
                            children: <Widget>[
                              Expanded(
                                child: _ThemeImage(
                                  url: theme.assetUrl(
                                    'assets/brands/${_brandSlug(brand)}.svg',
                                  ),
                                  fit: BoxFit.contain,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                brand,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _brandSlug(String brand) {
    return brand
        .toLowerCase()
        .replaceAll('é', 'e')
        .replaceAll('&', 'and')
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }
}

class _ProductSection extends StatelessWidget {
  const _ProductSection({
    required this.theme,
    required this.section,
    required this.productsAsync,
    required this.fallbackImages,
    required this.t,
    required this.formatCurrency,
    required this.onOpenProduct,
    required this.onRetry,
    required this.mediaBaseUrl,
  });

  final StorefrontTheme theme;
  final ThemeTemplateSection section;
  final AsyncValue<List<Product>> productsAsync;
  final List<String> fallbackImages;
  final String Function(String) t;
  final String Function(num) formatCurrency;
  final void Function(Product product) onOpenProduct;
  final VoidCallback onRetry;
  final String mediaBaseUrl;

  @override
  Widget build(BuildContext context) {
    final images = section.stringListSetting('images');
    final layout = theme.normalizedLayout;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            t(_sectionTitle(section)),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          if (section.stringSetting('subtitle').isNotEmpty) ...<Widget>[
            const SizedBox(height: 4),
            Text(t(section.stringSetting('subtitle'))),
          ],
          const SizedBox(height: 12),
          productsAsync.when(
            loading: () => const _ProductLoadingCards(),
            error: (Object error, _) => _SectionMessageCard(
              title: t('Products could not load'),
              message: '$error',
              actionLabel: t('Retry'),
              onPressed: onRetry,
            ),
            data: (List<Product> rows) {
              if (rows.isEmpty) {
                return _SectionMessageCard(
                  title: t('No products found'),
                  message: t(
                      'Add active products to the catalog to show live pricing here.'),
                  actionLabel: t('Retry'),
                  onPressed: onRetry,
                );
              }
              final visibleRows = _productsForSection(rows);
              if (layout == 'list' || layout == 'fast_order') {
                return Column(
                  children: List<Widget>.generate(visibleRows.length, (index) {
                    final product = visibleRows[index];
                    final image = _productImage(product, images, index);
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        onTap: () => onOpenProduct(product),
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: _ThemeImage(url: image, width: 58, height: 58),
                        ),
                        title: Text(
                          t(product.name.trim()),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: Text(_priceLabel(product.price)),
                      ),
                    );
                  }),
                );
              }
              return SizedBox(
                height: 292,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: visibleRows.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (BuildContext context, int index) {
                    final product = visibleRows[index];
                    final image = _productImage(product, images, index);
                    return SizedBox(
                      width: 166,
                      child: _RecommendedProductCard(
                        product: product,
                        image: image,
                        title: t(product.name.trim()),
                        categoryLabel: _categoryLabel(product),
                        priceLabel: _priceLabel(product.price),
                        inventoryLabel: _inventoryLabel(product),
                        onTap: () => onOpenProduct(product),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  List<Product> _productsForSection(List<Product> products) {
    final type = section.type.toLowerCase();
    bool categoryMatches(Product product, List<String> terms) {
      final category = product.categoryId.toLowerCase();
      return terms.any((term) => category.contains(term));
    }

    Iterable<Product> selected = products;
    if (type.contains('beverage')) {
      selected = products.where(
        (product) =>
            categoryMatches(product, <String>['beverage', 'tea-coffee']),
      );
    } else if (type.contains('snack')) {
      selected = products.where(
        (product) =>
            categoryMatches(product, <String>['biscuit', 'snack', 'bakery']),
      );
    } else if (type.contains('dairy')) {
      selected = products.where(
        (product) => categoryMatches(product, <String>['dairy']),
      );
    } else if (type.contains('cooking')) {
      selected = products.where(
        (product) => categoryMatches(
          product,
          <String>[
            'rice-flour',
            'pulses-dal',
            'oil-ghee',
            'spices',
            'sugar-salt'
          ],
        ),
      );
    } else if (type.contains('cleaning')) {
      selected = products.where(
        (product) =>
            categoryMatches(product, <String>['cleaning', 'home-care']),
      );
    } else if (type.contains('personal')) {
      selected = products.where(
        (product) => categoryMatches(product, <String>['personal-care']),
      );
    } else if (type.contains('essential')) {
      selected = products.where(
        (product) => categoryMatches(
          product,
          <String>[
            'grocery',
            'rice-flour',
            'pulses-dal',
            'oil-ghee',
            'sugar-salt'
          ],
        ),
      );
    } else if (type.contains('recommend')) {
      selected = products.reversed;
    }

    final limit = _sectionLimit(section, 6);
    final result = selected.take(limit).toList(growable: false);
    return result.isEmpty
        ? products.take(limit).toList(growable: false)
        : result;
  }

  String _productImage(Product product, List<String> images, int index) {
    if (product.imageUrl?.trim().isNotEmpty == true) {
      return _resolveImage(product.imageUrl!.trim());
    }
    if (images.length > index) return theme.assetUrl(images[index]);
    if (fallbackImages.isNotEmpty) {
      return fallbackImages[index % fallbackImages.length];
    }
    return '';
  }

  String _resolveImage(String image) {
    if (image.startsWith('assets/') ||
        image.startsWith('http://') ||
        image.startsWith('https://') ||
        image.startsWith('data:')) {
      return image;
    }
    if (image.startsWith('/')) {
      final base = Uri.tryParse(mediaBaseUrl);
      if (base == null || !base.hasScheme || base.host.isEmpty) return image;
      return base.replace(path: image, query: '').toString();
    }
    return theme.assetUrl(image);
  }

  String _priceLabel(double? price) {
    if (price == null) {
      return t(
        section.stringSetting('priceUnavailableText', 'Sign in to see price'),
      );
    }
    return formatCurrency(price);
  }

  String _categoryLabel(Product product) {
    final brand = product.brand?.trim() ?? '';
    final category = product.categoryId.trim();
    if (brand.isNotEmpty && category.isNotEmpty) return '$brand | $category';
    if (brand.isNotEmpty) return brand;
    return category;
  }

  String _inventoryLabel(Product product) {
    final stock = product.stockQuantity;
    if (stock != null) {
      return stock > 0 ? t('$stock units available') : t('Out of stock');
    }
    if (product.moq > 1) return t('Minimum order: ${product.moq}');
    return t('Live catalog item');
  }
}

class _RecommendedProductCard extends ConsumerWidget {
  const _RecommendedProductCard({
    required this.product,
    required this.image,
    required this.title,
    required this.categoryLabel,
    required this.priceLabel,
    required this.inventoryLabel,
    required this.onTap,
  });

  final Product product;
  final String image;
  final String title;
  final String categoryLabel;
  final String priceLabel;
  final String inventoryLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final bool isWishlisted = ref.watch(
      wishlistProvider.select(
        (AsyncValue<List<Product>> wishlist) =>
            wishlist.valueOrNull?.any(
              (Product row) => row.id == product.id,
            ) ??
            false,
      ),
    );
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      elevation: 1,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Stack(
                  children: <Widget>[
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: _ThemeImage(
                          url: image,
                          fit: BoxFit.cover,
                          showFallbackIcon: false,
                        ),
                      ),
                    ),
                    Positioned(
                      right: 6,
                      top: 6,
                      child: SizedBox(
                        width: 30,
                        height: 30,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: colorScheme.surface,
                            shape: BoxShape.circle,
                            boxShadow: <BoxShadow>[
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.10),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints.tightFor(
                              width: 30,
                              height: 30,
                            ),
                            visualDensity: VisualDensity.compact,
                            tooltip: 'Wishlist',
                            icon: Icon(
                              isWishlisted
                                  ? Icons.favorite
                                  : Icons.favorite_border,
                              size: 18,
                            ),
                            color: isWishlisted ? Colors.red : null,
                            onPressed: () async {
                              try {
                                await ref
                                    .read(wishlistProvider.notifier)
                                    .toggle(product);
                              } catch (error) {
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('$error')),
                                );
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  height: 1.08,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                categoryLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10,
                  height: 1,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                priceLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  height: 1,
                ),
              ),
              const SizedBox(height: 7),
              Container(
                height: 24,
                padding: const EdgeInsets.symmetric(horizontal: 7),
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: <Widget>[
                    Icon(
                      Icons.inventory_2_outlined,
                      color: colorScheme.primary,
                      size: 13,
                    ),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        inventoryLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colorScheme.onPrimaryContainer,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionMessageCard extends StatelessWidget {
  const _SectionMessageCard({
    required this.title,
    required this.message,
    this.actionLabel,
    this.onPressed,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(message),
            if (actionLabel != null && onPressed != null) ...<Widget>[
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: onPressed,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _HorizontalLoadingCards extends StatelessWidget {
  const _HorizontalLoadingCards();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 132,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 3,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, __) => SizedBox(
          width: 118,
          child: Card(
            child: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductLoadingCards extends StatelessWidget {
  const _ProductLoadingCards();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: SizedBox(
        height: 120,
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _ThemeImage extends StatelessWidget {
  const _ThemeImage({
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.showFallbackIcon = true,
  });

  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool showFallbackIcon;

  @override
  Widget build(BuildContext context) {
    final clean = url.trim();
    final fallback = ColoredBox(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: SizedBox(
        width: width,
        height: height,
        child: showFallbackIcon
            ? Icon(
                Icons.image_outlined,
                color: Theme.of(context).colorScheme.primary,
              )
            : null,
      ),
    );
    if (clean.isEmpty) {
      return fallback;
    }
    if (_isSvg(clean)) {
      return SvgPicture.network(
        clean,
        width: width,
        height: height,
        fit: BoxFit.contain,
        placeholderBuilder: (_) => fallback,
      );
    }
    if (clean.startsWith('assets/')) {
      return Image.asset(
        clean,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.network(
      clean,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => fallback,
    );
  }

  bool _isSvg(String value) {
    final lower = value.toLowerCase();
    return lower.endsWith('.svg') || lower.startsWith('data:image/svg+xml');
  }
}
