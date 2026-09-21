<template><section class="page-hero compact"><div class="container"><p class="eyebrow">Compare</p><h1>Product comparison</h1></div></section><section class="section"><div class="container"><div class="compare-table"><div class="compare-col" v-for="product in items" :key="product.id"><img :src="product.image" :alt="product.name" /><h2>{{ product.name }}</h2><p>${{ product.price }}</p><p>{{ product.rating }} rating</p><p>{{ product.stock }} available</p><RouterLink class="btn btn-dark" :to="`/product/${product.slug}`">View</RouterLink></div></div></div></section></template>
<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { products } from '../utils/catalog';
import { useCartStore } from '../stores/cart';
const { compare } = storeToRefs(useCartStore());
const items = computed(() => products.filter((product) => compare.value.includes(product.id)));
</script>
