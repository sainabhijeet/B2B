<template>
  <header class="site-header sticky-top">
    <div class="top-strip">
      <span>Free express shipping over $150</span>
      <span class="d-none d-md-inline">Complimentary returns for 30 days</span>
    </div>
    <nav class="navbar navbar-expand-lg bg-body">
      <div class="container">
        <RouterLink class="navbar-brand brand" to="/">Luxury<span>Commerce</span></RouterLink>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div id="mainNav" class="collapse navbar-collapse">
          <ul class="navbar-nav mx-auto align-items-lg-center">
            <li class="nav-item dropdown position-static">
              <button class="nav-link dropdown-toggle btn btn-link" data-bs-toggle="dropdown" aria-expanded="false">Shop</button>
              <div class="dropdown-menu mega-menu shadow-lg border-0">
                <div class="container py-4">
                  <div class="row g-4">
                    <div class="col-md-3" v-for="category in categories" :key="category.id">
                      <RouterLink class="mega-card" :to="`/category/${category.id}`">
                        <img :src="category.image" :alt="category.name" loading="lazy" />
                        <strong>{{ category.name }}</strong>
                        <span>{{ category.accent }} · {{ category.count }} items</span>
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            <li class="nav-item"><RouterLink class="nav-link" to="/shop">New Arrivals</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/category/home">Home</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/orders">Orders</RouterLink></li>
            <li class="nav-item"><RouterLink class="nav-link" to="/account">Account</RouterLink></li>
          </ul>
          <div class="nav-actions">
            <button class="icon-btn" type="button" aria-label="Open search" @click="searchOpen = true"><i class="bi bi-search"></i></button>
            <button class="icon-btn" type="button" aria-label="Toggle dark mode" @click="toggleDarkMode"><i class="bi" :class="darkMode ? 'bi-sun' : 'bi-moon-stars'"></i></button>
            <button class="icon-btn" type="button" aria-label="Toggle RTL" @click="toggleRtl"><i class="bi bi-translate"></i></button>
            <RouterLink class="icon-btn" to="/wishlist" aria-label="Wishlist"><i class="bi bi-heart"></i><span>{{ wishlist.length }}</span></RouterLink>
            <RouterLink class="icon-btn" to="/cart" aria-label="Cart"><i class="bi bi-bag"></i><span>{{ cart.length }}</span></RouterLink>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <div v-if="searchOpen" class="search-overlay" role="dialog" aria-modal="true" aria-label="Search products">
    <div class="search-panel">
      <button class="icon-btn close-btn" type="button" aria-label="Close search" @click="searchOpen = false"><i class="bi bi-x-lg"></i></button>
      <label class="form-label" for="site-search">Search the collection</label>
      <input id="site-search" v-model="query" class="form-control form-control-lg" type="search" placeholder="Search dresses, ceramics, serum..." autofocus />
      <div class="row g-3 mt-3">
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
import { categories, products } from '../utils/catalog';
import { useCartStore } from '../stores/cart';
import { useUi } from '../composables/useUi';

const query = ref('');
const store = useCartStore();
const { cart, wishlist } = storeToRefs(store);
const { darkMode, searchOpen, toggleDarkMode, toggleRtl } = useUi();
const results = computed(() => products.filter((product) => product.name.toLowerCase().includes(query.value.toLowerCase())).slice(0, 6));
</script>
