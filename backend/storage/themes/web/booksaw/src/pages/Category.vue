<template>
  <section class="page-hero compact">
    <div class="container">
      <p class="eyebrow">{{ category.accent }}</p>
      <h1>{{ category.name }}</h1>
      <p>{{ category.count }} thoughtfully selected products with premium finishes.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <ProductGrid :products="items" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ProductGrid from '../components/ProductGrid.vue';
import { getCategory, products } from '../utils/catalog';

const route = useRoute();
const category = computed(() => getCategory(route.params.id));
const items = computed(() => products.filter((product) => product.category === category.value.id));
</script>
