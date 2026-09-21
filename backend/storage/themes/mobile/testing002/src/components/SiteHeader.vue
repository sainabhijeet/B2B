<template>
  <header class="site-header sticky-top">
    <div class="top-strip">
      <span>{{ t('home.promo') }}</span>
      <span class="d-none d-md-inline"><i class="bi bi-geo-alt"></i> {{ t('common.location') }}</span>
    </div>
    <nav class="navbar navbar-expand-lg bg-body">
      <div class="container">
        <RouterLink class="navbar-brand brand" to="/">{{ t('common.brand') }}</RouterLink>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" :aria-label="t('accessibility.mainNavigation')">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav mx-auto align-items-lg-center" :aria-label="t('accessibility.mainNavigation')">
            <li class="nav-item dropdown position-static">
              <button class="nav-link dropdown-toggle btn btn-link" data-bs-toggle="dropdown" aria-expanded="false">{{ t('navigation.shop') }}</button>
              <div class="dropdown-menu mega-menu shadow-lg border-0">
                <div class="container py-4">
                  <div class="row g-4">
                    <div class="col-md-3" v-for="category in categories" :key="category.id">
                      <RouterLink class="mega-card" :to="`/category/${category.id}`">
                        <img :src="category.image" :alt="category.key" loading="lazy" />
                        <strong>{{ category.key }}</strong>
                        <span>{{ category.count }} {{ t('category.productsFound') }}</span>
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            <li class="nav-item"><RouterLink class="nav-link" to="/search">{{ t('common.search') }}</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/orders">{{ t('navigation.orders') }}</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/support">{{ t('navigation.support') }}</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/mobile-app">{{ t('navigation.mobileApp') }}</RouterLink></li>
          </ul>
          <div class="nav-actions">
            <button class="icon-btn" type="button" :aria-label="t('accessibility.openSearch')" @click="searchOpen = true"><i class="bi bi-search"></i></button>
            <button class="icon-btn" type="button" :aria-label="t('accessibility.toggleTheme')" @click="toggleDarkMode"><i class="bi" :class="darkMode ? 'bi-sun' : 'bi-moon-stars'"></i></button>
            <select v-model="locale" class="locale-select" :aria-label="t('common.language')" @change="setLocale(locale)">
              <option v-for="entry in locales" :key="entry" :value="entry">{{ entry.toUpperCase() }}</option>
            </select>
            <RouterLink class="icon-btn" to="/account" :aria-label="t('common.account')"><i class="bi bi-person"></i></RouterLink>
            <RouterLink class="icon-btn" to="/wishlist" :aria-label="t('common.wishlist')"><i class="bi bi-heart"></i><span>{{ wishlist.length }}</span></RouterLink>
            <RouterLink class="icon-btn" to="/cart" :aria-label="t('common.cart')"><i class="bi bi-bag"></i><span>{{ cart.length }}</span></RouterLink>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <div v-if="searchOpen" class="search-overlay" role="dialog" aria-modal="true" :aria-label="t('search.title')">
    <div class="search-panel">
      <button class="icon-btn close-btn" type="button" :aria-label="t('accessibility.close')" @click="searchOpen = false"><i class="bi bi-x-lg"></i></button>
      <label class="form-label" for="site-search">{{ t('search.title') }}</label>
      <input id="site-search" v-model="query" class="form-control form-control-lg" type="search" :placeholder="t('home.searchPlaceholder')" autofocus />
      <div class="chip-row mt-3">
        <span v-for="term in searchTerms" :key="term" class="chip">{{ term }}</span>
      </div>
      <div class="row g-3 mt-2">
        <div class="col-md-6" v-for="product in results" :key="product.id">
          <RouterLink class="search-result" :to="`/product/${product.slug}`" @click="searchOpen = false">
            <img :src="product.image" :alt="product.name" />
            <span>{{ product.name }}</span>
            <strong>${{ product.price }}</strong>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { categories, products } from '../data/mockCatalog';
import { useCartStore } from '../stores/cart';
import { useUi } from '../composables/useUi';
import { useI18n } from '../localization';

const query = ref('');
const searchTerms = ['smart watch', 'serum', 'lamp', 'dress', 'tote'];
const store = useCartStore();
const { cart, wishlist } = storeToRefs(store);
const { darkMode, searchOpen, toggleDarkMode } = useUi();
const { t, locale, locales, setLocale } = useI18n();
const results = computed(() => products.filter((product) => product.name.toLowerCase().includes(query.value.toLowerCase())).slice(0, 6));
</script>
