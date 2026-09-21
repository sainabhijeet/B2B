<template><section class="page-hero compact"><div class="container"><p class="eyebrow">Wishlist</p><h1>Saved favorites</h1></div></section><section class="section"><div class="container"><ProductGrid :products="items" /></div></section></template>
<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import ProductGrid from '../components/ProductGrid.vue';
import { products } from '../utils/catalog';
import { useCartStore } from '../stores/cart';
const { wishlist } = storeToRefs(useCartStore());
const items = computed(() => products.filter((product) => wishlist.value.includes(product.id)));
</script>
