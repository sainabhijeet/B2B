<template>
  <div class="product-grid">
    <ProductCard v-for="product in products" :key="product.id" :product="product" :variant="variant" />
  </div>
</template>

<script setup>
import ProductCard from './ProductCard.vue';
defineProps({ products: { type: Array, required: true }, variant: { type: String, default: 'medium' } });
</script>
