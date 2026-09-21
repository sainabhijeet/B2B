<template>
  <div v-if="quickViewProduct" class="quick-view-backdrop" role="dialog" aria-modal="true" aria-label="Product quick view" @click.self="closeQuickView">
    <div class="quick-view">
      <button class="icon-btn close-btn" type="button" aria-label="Close quick view" @click="closeQuickView"><i class="bi bi-x-lg"></i></button>
      <img :src="quickViewProduct.image" :alt="quickViewProduct.name" />
      <div>
        <p class="eyebrow">{{ quickViewProduct.tag }}</p>
        <h2>{{ quickViewProduct.name }}</h2>
        <p class="lead">Premium materials, thoughtful finishing, and easy styling for a modern wardrobe or home.</p>
        <div class="product-price mb-3"><strong>${{ quickViewProduct.price }}</strong><span>${{ quickViewProduct.compareAt }}</span></div>
        <button class="btn btn-primary" type="button" @click="addAndClose"><i class="bi bi-bag-plus"></i> Add to cart</button>
        <RouterLink class="btn btn-outline-dark ms-2" :to="`/product/${quickViewProduct.slug}`" @click="closeQuickView">Details</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../stores/cart';
import { useUi } from '../composables/useUi';

const store = useCartStore();
const { quickViewProduct, closeQuickView } = useUi();
function addAndClose() {
  store.addToCart(quickViewProduct.value);
  closeQuickView();
}
</script>
