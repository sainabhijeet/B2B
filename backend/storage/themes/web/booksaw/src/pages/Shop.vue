<template>
  <section class="page-hero compact">
    <div class="container">
      <p class="eyebrow">Shop</p>
      <h1>Premium catalog</h1>
      <p>Explore best sellers, flash sale pieces, and new arrivals across every category.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="shop-toolbar">
        <input v-model="query" class="form-control" type="search" placeholder="Search products" aria-label="Search products" />
        <select v-model="category" class="form-select" aria-label="Filter category">
          <option value="">All categories</option>
          <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <select v-model="sort" class="form-select" aria-label="Sort products">
          <option value="featured">Featured</option>
          <option value="low">Price low to high</option>
          <option value="high">Price high to low</option>
        </select>
      </div>
      <ProductGrid :products="filtered" />
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import ProductGrid from '../components/ProductGrid.vue';
import { categories, products } from '../utils/catalog';

const query = ref('');
const category = ref('');
const sort = ref('featured');
const filtered = computed(() => {
  const list = products.filter((product) => (!category.value || product.category === category.value) && product.name.toLowerCase().includes(query.value.toLowerCase()));
  return [...list].sort((a, b) => (sort.value === 'low' ? a.price - b.price : sort.value === 'high' ? b.price - a.price : a.id - b.id));
});
</script>
