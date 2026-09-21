<template>
  <article class="product-card">
    <RouterLink class="product-media" :to="`/product/${product.slug}`">
      <span class="badge-soft">{{ product.tag }}</span>
      <img :src="product.image" :alt="product.name" loading="lazy" />
    </RouterLink>
    <div class="product-actions">
      <button class="icon-btn" type="button" aria-label="Quick view" @click="openQuickView(product)"><i class="bi bi-eye"></i></button>
      <button class="icon-btn" type="button" aria-label="Add to wishlist" @click="store.toggleWishlist(product.id)"><i class="bi" :class="wishlist.includes(product.id) ? 'bi-heart-fill' : 'bi-heart'"></i></button>
      <button class="icon-btn" type="button" aria-label="Compare" @click="store.toggleCompare(product.id)"><i class="bi bi-arrow-left-right"></i></button>
    </div>
    <div class="product-body">
      <div class="rating" aria-label="Rating"><i class="bi bi-star-fill"></i> {{ product.rating }}</div>
      <RouterLink class="product-title" :to="`/product/${product.slug}`">{{ product.name }}</RouterLink>
      <div class="product-price">
        <strong>${{ product.price }}</strong>
        <span>${{ product.compareAt }}</span>
      </div>
      <div class="swatches" aria-label="Available colors">
        <span v-for="swatch in product.swatches" :key="swatch" :style="{ backgroundColor: swatch }"></span>
      </div>
      <button class="btn btn-dark w-100" type="button" @click="store.addToCart(product)"><i class="bi bi-bag-plus"></i> Add to cart</button>
    </div>
  </article>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart';
import { useUi } from '../composables/useUi';

defineProps({ product: { type: Object, required: true } });
const store = useCartStore();
const { wishlist } = storeToRefs(store);
const { openQuickView } = useUi();
</script>
