<template>
  <section class="hero-slider">
    <div id="heroCarousel" class="carousel slide" data-bs-ride="carousel">
      <div class="carousel-inner">
        <div v-for="(slide, index) in heroSlides" :key="slide.title" class="carousel-item" :class="{ active: index === 0 }">
          <div class="hero-slide">
            <img :src="slide.image" :alt="slide.title" />
            <div class="hero-copy">
              <p class="eyebrow">{{ slide.badge }}</p>
              <h1>{{ slide.title }}</h1>
              <p>{{ slide.copy }}</p>
              <RouterLink class="btn btn-primary btn-lg" to="/shop">{{ slide.cta }}</RouterLink>
            </div>
          </div>
        </div>
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev" aria-label="Previous slide"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next" aria-label="Next slide"><span class="carousel-control-next-icon"></span></button>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Collections</p>
        <h2>Shop by category</h2>
        <RouterLink to="/shop">View all</RouterLink>
      </div>
      <div class="category-grid">
        <RouterLink v-for="category in categories" :key="category.id" class="category-card" :to="`/category/${category.id}`">
          <img :src="category.image" :alt="category.name" loading="lazy" />
          <div><strong>{{ category.name }}</strong><span>{{ category.accent }}</span></div>
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Featured products</p>
        <h2>Curated best sellers</h2>
      </div>
      <ProductGrid :products="products.slice(0, 4)" />
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="promo-band">
        <div>
          <p class="eyebrow">Flash sale</p>
          <h2>Ends tonight. Select icons up to 35% off.</h2>
          <p>Premium finds for wardrobe, vanity, and home with fast shipping included.</p>
        </div>
        <RouterLink class="btn btn-light" to="/shop">Shop sale</RouterLink>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">New arrival</p>
        <h2>Freshly added</h2>
      </div>
      <ProductGrid :products="products.slice(4)" />
    </div>
  </section>
</template>

<script setup>
import ProductGrid from '../components/ProductGrid.vue';
import { categories, heroSlides, products } from '../utils/catalog';
</script>
