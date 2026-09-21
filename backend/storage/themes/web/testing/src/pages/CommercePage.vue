<template>
  <section v-if="page === 'home'" class="hero-commerce">
    <div class="container hero-grid">
      <div>
        <p class="eyebrow">{{ t('home.promo') }}</p>
        <h1>{{ t('home.title') }}</h1>
        <p>{{ t('home.subtitle') }}</p>
        <div class="hero-search" role="search">
          <i class="bi bi-search"></i>
          <input :placeholder="t('home.searchPlaceholder')" />
          <RouterLink class="btn btn-primary" to="/shop">{{ t('home.heroCta') }}</RouterLink>
        </div>
        <div class="trust-row">
          <span><i class="bi bi-shield-check"></i> {{ t('payment.success') }}</span>
          <span><i class="bi bi-truck"></i> {{ t('cart.delivery') }}</span>
          <span><i class="bi bi-arrow-repeat"></i> {{ t('orders.returned') }}</span>
        </div>
      </div>
      <img :src="banners[0].image" :alt="t('home.title')" />
    </div>
  </section>

  <section v-if="page === 'home'" class="section">
    <div class="container">
      <SectionHead eyebrow="navigation.shop" title="home.popularCategories" link="/shop" />
      <div class="category-grid">
        <RouterLink v-for="category in categories" :key="category.id" class="category-card" :to="`/category/${category.id}`">
          <img :src="category.image" :alt="category.key" loading="lazy" />
          <div><strong>{{ category.key }}</strong><span>{{ category.count }} {{ t('category.productsFound') }}</span></div>
        </RouterLink>
      </div>
    </div>
  </section>

  <section v-if="page === 'home'" class="section section-tint">
    <div class="container">
      <SectionHead eyebrow="home.flashSale" title="home.featuredProducts" link="/shop" />
      <ProductGrid :products="products.slice(0, 4)" />
    </div>
  </section>

  <section v-if="page === 'home'" class="section">
    <div class="container">
      <div class="commerce-band">
        <div>
          <p class="eyebrow">{{ t('home.deals') }}</p>
          <h2>{{ banners[1].metric }}</h2>
          <p>{{ t('home.newsletterCopy') }}</p>
        </div>
        <RouterLink class="btn btn-light" to="/shop">{{ t('common.shopNow') }}</RouterLink>
      </div>
    </div>
  </section>

  <section v-if="page === 'home'" class="section">
    <div class="container stacked-sections">
      <CommerceRail title="home.trendingProducts" :items="products.slice(2, 6)" />
      <CommerceRail title="home.bestSellers" :items="products.slice(0, 4)" variant="small" />
      <CommerceRail title="home.recommended" :items="products.slice(4)" />
      <CommerceRail title="home.recentlyViewed" :items="products.slice(1, 5)" variant="horizontal" />
      <div>
        <SectionHead eyebrow="home.brands" title="home.testimonials" />
        <div class="brand-row">
          <span v-for="brand in brands" :key="brand">{{ brand }}</span>
        </div>
        <div class="testimonial-grid">
          <article v-for="review in reviews" :key="review.name" class="state-card">
            <div class="rating"><i class="bi bi-star-fill"></i> {{ review.rating }}</div>
            <p>{{ review.text }}</p>
            <strong>{{ review.name }}</strong>
          </article>
        </div>
      </div>
    </div>
  </section>

  <section v-if="page === 'shop' || page === 'category' || page === 'search'" class="page-hero compact">
    <div class="container">
      <p class="eyebrow">{{ t(page === 'search' ? 'search.title' : 'category.title') }}</p>
      <h1>{{ pageTitle }}</h1>
      <p>{{ visibleProducts.length }} {{ t('category.productsFound') }}</p>
    </div>
  </section>

  <section v-if="page === 'shop' || page === 'category' || page === 'search'" class="section">
    <div class="container catalog-layout">
      <aside class="filter-panel">
        <h2>{{ t('category.filters') }}</h2>
        <label>{{ t('category.priceRange') }}<input class="form-range" type="range" min="20" max="350" value="220" /></label>
        <fieldset>
          <legend>{{ t('category.brand') }}</legend>
          <label v-for="brand in brands" :key="brand"><input type="checkbox" /> {{ brand }}</label>
        </fieldset>
        <fieldset>
          <legend>{{ t('category.availability') }}</legend>
          <label><input type="radio" name="stock" checked /> {{ t('common.available') }}</label>
          <label><input type="radio" name="stock" /> {{ t('common.outOfStock') }}</label>
        </fieldset>
        <EmptyState icon="bi-box-seam" title="emptyStates.products" action="common.retry" />
      </aside>
      <div>
        <div class="shop-toolbar">
          <input v-model="query" class="form-control" type="search" :placeholder="t('home.searchPlaceholder')" />
          <select class="form-select" :aria-label="t('category.sortBy')">
            <option>{{ t('category.sortBy') }}</option>
            <option>{{ t('common.price') }}</option>
            <option>{{ t('common.rating') }}</option>
          </select>
          <div class="segmented">
            <button type="button" class="active" :aria-label="t('category.gridView')"><i class="bi bi-grid"></i></button>
            <button type="button" :aria-label="t('category.listView')"><i class="bi bi-list"></i></button>
          </div>
        </div>
        <ProductGrid :products="visibleProducts" />
        <nav class="pagination-row" aria-label="Pagination">
          <button class="btn btn-outline-dark">{{ t('common.back') }}</button>
          <span>1 / 4</span>
          <button class="btn btn-dark">{{ t('common.next') }}</button>
        </nav>
      </div>
    </div>
  </section>

  <section v-if="page === 'product'" class="section">
    <div class="container product-detail-layout">
      <div class="product-gallery">
        <span class="badge-soft">{{ product.badge }}</span>
        <img :src="product.image" :alt="product.name" />
        <div class="thumb-row"><img v-for="item in products.slice(0, 4)" :key="item.id" :src="item.image" :alt="item.name" /></div>
      </div>
      <div class="detail-panel">
        <p class="eyebrow">{{ product.brand }}</p>
        <h1>{{ product.name }}</h1>
        <div class="rating"><i class="bi bi-star-fill"></i> {{ product.rating }} · {{ product.reviews }} {{ t('common.reviews') }}</div>
        <div class="detail-price"><strong>${{ product.price }}</strong><span>${{ product.mrp }}</span><b>{{ product.discount }}%</b></div>
        <div class="offer-grid">
          <span v-for="coupon in coupons" :key="coupon.code"><strong>{{ coupon.code }}</strong>{{ coupon.value }}</span>
        </div>
        <div class="quantity-row">
          <button class="btn btn-outline-dark" type="button">-</button>
          <input class="form-control text-center" value="1" :aria-label="t('common.quantity')" />
          <button class="btn btn-outline-dark" type="button">+</button>
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary btn-lg" @click="store.addToCart(product)"><i class="bi bi-bag-plus"></i> {{ t('product.addToCart') }}</button>
          <RouterLink class="btn btn-dark btn-lg" to="/checkout">{{ t('product.buyNow') }}</RouterLink>
          <button class="btn btn-outline-dark btn-lg"><i class="bi bi-heart"></i> {{ t('common.wishlist') }}</button>
          <button class="btn btn-outline-dark btn-lg"><i class="bi bi-share"></i> {{ t('product.share') }}</button>
        </div>
        <div class="pincode-card">
          <label>{{ t('product.delivery') }}<input class="form-control" :placeholder="t('product.pincode')" /></label>
        </div>
        <Tabs :items="productTabs" />
      </div>
    </div>
  </section>

  <section v-if="page === 'product'" class="section section-tint">
    <div class="container">
      <CommerceRail title="product.frequentlyBought" :items="products.slice(0, 3)" />
      <CommerceRail title="product.relatedProducts" :items="products.slice(4)" />
    </div>
  </section>

  <section v-if="page === 'cart'" class="section">
    <div class="container cart-layout">
      <div>
        <PageTitle title="cart.title" eyebrow="cart.items" />
        <LineItem v-for="item in items" :key="item.id" :item="item" />
        <EmptyState v-if="!items.length" icon="bi-cart-x" title="cart.emptyCart" copy="emptyStates.cart" action="common.shopNow" />
      </div>
      <SummaryCard action="cart.checkout" to="/checkout" />
    </div>
  </section>

  <section v-if="page === 'checkout' || page === 'payment'" class="section">
    <div class="container checkout-layout">
      <div>
        <PageTitle title="checkout.title" eyebrow="payment.title" />
        <div class="stepper">
          <span v-for="step in checkoutSteps" :key="step">{{ t(step) }}</span>
        </div>
        <div class="form-surface">
          <h2>{{ t('checkout.address') }}</h2>
          <div class="address-grid">
            <AddressCard title="address.home" />
            <AddressCard title="address.office" />
          </div>
          <h2>{{ t('payment.title') }}</h2>
          <div class="payment-grid">
            <button v-for="method in paymentMethods" :key="method" class="payment-card" type="button"><i class="bi bi-credit-card"></i>{{ t(method) }}</button>
          </div>
          <input class="form-control" :placeholder="t('payment.cardNumber')" inputmode="numeric" />
          <div class="state-grid">
            <StateBadge icon="bi-hourglass-split" label="payment.processing" />
            <StateBadge icon="bi-check2-circle" label="payment.success" />
            <StateBadge icon="bi-exclamation-triangle" label="payment.failed" />
          </div>
          <button class="btn btn-primary btn-lg w-100">{{ t('checkout.placeOrder') }}</button>
        </div>
      </div>
      <SummaryCard action="checkout.placeOrder" />
    </div>
  </section>

  <section v-if="page === 'account' || page === 'login' || page === 'register'" class="section">
    <div class="container account-layout">
      <div class="form-surface">
        <PageTitle :title="page === 'register' ? 'auth.registerTitle' : page === 'login' ? 'auth.loginTitle' : 'profile.title'" eyebrow="common.account" />
        <div class="avatar">{{ t('profile.profileImage') }}</div>
        <input class="form-control" :placeholder="t('auth.name')" />
        <input class="form-control" :placeholder="t('auth.emailMobile')" />
        <input class="form-control" :placeholder="t('auth.password')" type="password" />
        <input v-if="page === 'register'" class="form-control" :placeholder="t('auth.confirmPassword')" type="password" />
        <label class="check-row"><input type="checkbox" /> {{ t('auth.rememberMe') }}</label>
        <button class="btn btn-primary">{{ t(page === 'register' ? 'common.register' : 'common.login') }}</button>
        <button class="btn btn-outline-dark">{{ t('auth.socialLogin') }}</button>
      </div>
      <div class="dashboard-grid">
        <MetricCard icon="bi-person-gear" label="profile.editProfile" value="98%" />
        <MetricCard icon="bi-geo-alt" label="address.title" value="2" />
        <MetricCard icon="bi-shield-lock" label="profile.security" value="OTP" />
        <MetricCard icon="bi-bell" label="notifications.title" value="12" />
      </div>
    </div>
  </section>

  <section v-if="page === 'orders' || page === 'wishlist' || page === 'notifications' || page === 'settings' || page === 'support'" class="section">
    <div class="container">
      <PageTitle :title="pageTitleKey" eyebrow="common.account" />
      <div class="dashboard-grid">
        <OrderCard v-for="order in orders" v-if="page === 'orders'" :key="order.id" :order="order" />
        <ProductCard v-for="item in products.slice(0, 4)" v-if="page === 'wishlist'" :key="item.id" :product="item" />
        <StateBadge v-for="note in notificationKeys" v-if="page === 'notifications'" :key="note" icon="bi-bell" :label="note" />
        <StateBadge v-for="setting in settingKeys" v-if="page === 'settings'" :key="setting" icon="bi-gear" :label="setting" />
        <SupportPanel v-if="page === 'support'" />
      </div>
      <EmptyState v-if="page === 'notifications'" icon="bi-bell-slash" title="notifications.empty" copy="emptyStates.notifications" action="common.retry" />
    </div>
  </section>

  <section v-if="page === 'mobile'" class="section mobile-preview-section">
    <div class="container mobile-preview-layout">
      <div>
        <PageTitle title="navigation.mobileApp" eyebrow="mobile.splash" />
        <p class="lead">{{ t('mobile.onboarding') }}</p>
        <div class="state-grid">
          <StateBadge v-for="screen in mobileScreens" :key="screen" icon="bi-phone" :label="screen" />
        </div>
      </div>
      <div class="phone-frame">
        <div class="phone-bar"><span>{{ t('common.brand') }}</span><i class="bi bi-bell"></i></div>
        <div class="phone-search"><i class="bi bi-search"></i>{{ t('home.searchPlaceholder') }}</div>
        <div class="phone-banner">{{ t('home.flashSale') }}</div>
        <div class="phone-cats"><span v-for="category in categories.slice(0, 5)" :key="category.id"><i :class="`bi ${category.icon}`"></i>{{ category.key }}</span></div>
        <div class="phone-grid"><ProductCard v-for="item in products.slice(0, 4)" :key="item.id" :product="item" variant="small" /></div>
        <div class="phone-nav">
          <span v-for="nav in mobileNav" :key="nav"><i class="bi bi-circle"></i>{{ t(nav) }}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section pt-0">
    <div class="container">
      <div class="quality-grid">
        <StateBadge icon="bi-translate" label="common.language" />
        <StateBadge icon="bi-moon-stars" label="common.darkMode" />
        <StateBadge icon="bi-universal-access" label="accessibility.mainNavigation" />
        <StateBadge icon="bi-hdd-network" label="errors.network" />
        <SkeletonBlock />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, h, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import ProductCard from '../components/ProductCard.vue';
import ProductGrid from '../components/ProductGrid.vue';
import { useCartStore } from '../stores/cart';
import { useI18n } from '../localization';
import { banners, brands, categories, coupons, getProduct, orders, products, productsByCategory, reviews } from '../data/mockCatalog';

const props = defineProps({ page: { type: String, default: 'home' } });
const route = useRoute();
const store = useCartStore();
const { items } = storeToRefs(store);
const { t } = useI18n();
const query = ref('');

const page = computed(() => props.page);
const product = computed(() => getProduct(route.params.slug));
const visibleProducts = computed(() => {
  const pool = page.value === 'category' ? productsByCategory(route.params.id) : products;
  return pool.filter((item) => item.name.toLowerCase().includes(query.value.toLowerCase()));
});
const pageTitle = computed(() => (page.value === 'category' ? categories.find((item) => item.id === route.params.id)?.key || t('category.title') : t(page.value === 'search' ? 'search.title' : 'category.title')));
const pageTitleKey = computed(() => ({
  orders: 'orders.title',
  wishlist: 'wishlist.title',
  notifications: 'notifications.title',
  settings: 'settings.title',
  support: 'support.title'
}[page.value] || 'common.account'));

const checkoutSteps = ['checkout.address', 'checkout.delivery', 'checkout.payment', 'checkout.review', 'checkout.confirmation'];
const paymentMethods = ['payment.upi', 'payment.creditCard', 'payment.debitCard', 'payment.netBanking', 'payment.wallet', 'payment.cashOnDelivery'];
const productTabs = ['product.description', 'product.specifications', 'product.features', 'product.reviews'];
const notificationKeys = ['notifications.orderUpdates', 'notifications.offers', 'notifications.promotions', 'notifications.system'];
const settingKeys = ['settings.language', 'settings.notifications', 'settings.privacy', 'settings.security', 'settings.changePassword', 'settings.terms', 'settings.privacyPolicy', 'settings.deleteAccount'];
const mobileScreens = ['mobile.splash', 'auth.loginTitle', 'auth.registerTitle', 'auth.otp', 'common.home', 'common.categories', 'product.description', 'cart.title', 'checkout.title', 'payment.title', 'orders.title', 'wishlist.title', 'notifications.title', 'profile.title', 'settings.title', 'support.helpCenter'];
const mobileNav = ['mobile.bottomHome', 'mobile.bottomCategories', 'mobile.bottomSearch', 'mobile.bottomCart', 'mobile.bottomAccount'];

const SectionHead = (props) => h('div', { class: 'section-heading' }, [
  h('div', [h('p', { class: 'eyebrow' }, t(props.eyebrow)), h('h2', t(props.title))]),
  props.link ? h('a', { href: props.link }, t('common.viewAll')) : null
]);
const PageTitle = (props) => h('div', { class: 'page-title' }, [h('p', { class: 'eyebrow' }, t(props.eyebrow)), h('h1', t(props.title))]);
const CommerceRail = (props) => h('div', { class: 'rail-block' }, [h(SectionHead, { eyebrow: 'navigation.shop', title: props.title }), h(ProductGrid, { products: props.items, variant: props.variant || 'medium' })]);
const EmptyState = (props) => h('div', { class: 'empty-state' }, [h('i', { class: `bi ${props.icon}` }), h('strong', t(props.title)), props.copy ? h('p', t(props.copy)) : null, h('button', { class: 'btn btn-outline-dark', type: 'button' }, t(props.action))]);
const StateBadge = (props) => h('article', { class: 'state-card' }, [h('i', { class: `bi ${props.icon}` }), h('span', t(props.label))]);
const SkeletonBlock = () => h('div', { class: 'skeleton-card', 'aria-label': t('common.loading') }, [h('span'), h('span'), h('span')]);
const MetricCard = (props) => h('article', { class: 'metric-card' }, [h('i', { class: `bi ${props.icon}` }), h('strong', props.value), h('span', t(props.label))]);
const AddressCard = (props) => h('article', { class: 'address-card' }, [h('strong', t(props.title)), h('p', 'A-1204 Skyline Habitat, Mumbai 400001'), h('div', [h('button', { class: 'btn btn-sm btn-outline-dark' }, t('common.edit')), h('button', { class: 'btn btn-sm btn-outline-danger' }, t('common.delete'))])]);
const OrderCard = (props) => h('article', { class: 'order-card' }, [h('div', [h('strong', `${t('orders.orderId')} ${props.order.id}`), h('span', props.order.date), h('small', props.order.items.join(', '))]), h('span', t(props.order.status)), h('strong', `$${props.order.total}`), h('button', { class: 'btn btn-outline-dark' }, t('orders.tracking'))]);
const LineItem = (props) => h('article', { class: 'line-item' }, [h('img', { src: props.item.image, alt: props.item.name }), h('div', [h('h2', props.item.name), h('p', props.item.brand), h('button', { class: 'btn btn-sm btn-link p-0' }, t('cart.moveToWishlist'))]), h('input', { class: 'form-control', value: props.item.quantity, 'aria-label': t('common.quantity') }), h('strong', `$${props.item.price * props.item.quantity}`)]);
const SummaryCard = (props) => h('aside', { class: 'summary-card' }, [
  h('h2', t('checkout.orderSummary')),
  h('p', [h('span', t('cart.subtotal')), h('strong', `$${store.subtotal}`)]),
  h('p', [h('span', t('cart.delivery')), h('strong', `$${store.delivery}`)]),
  h('p', [h('span', t('cart.taxes')), h('strong', `$${store.taxes}`)]),
  h('p', [h('span', t('cart.savings')), h('strong', `$${store.discount}`)]),
  h('p', { class: 'total' }, [h('span', t('cart.total')), h('strong', `$${store.total}`)]),
  props.to ? h('a', { class: 'btn btn-primary w-100', href: props.to }, t(props.action)) : h('button', { class: 'btn btn-primary w-100' }, t(props.action))
]);
const Tabs = (props) => h('div', { class: 'tabs-card' }, props.items.map((item, index) => h('section', [h('h2', t(item)), h('p', index === 0 ? t('home.subtitle') : t('success.saved'))])));
const SupportPanel = () => h('div', { class: 'support-grid' }, ['support.helpCenter', 'support.faq', 'support.contact', 'support.createTicket', 'support.ticketDetails', 'support.chat'].map((item) => h(StateBadge, { icon: 'bi-chat-dots', label: item })));
</script>
