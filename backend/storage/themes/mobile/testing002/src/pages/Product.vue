<template>
  <section class="section product-detail">
    <div class="container">
      <div class="row g-5 align-items-start">
        <div class="col-lg-6">
          <div class="product-gallery">
            <img :src="product.image" :alt="product.name" />
          </div>
        </div>
        <div class="col-lg-6">
          <p class="eyebrow">{{ product.tag }}</p>
          <h1>{{ product.name }}</h1>
          <div class="rating mb-3"><i class="bi bi-star-fill"></i> {{ product.rating }} · {{ product.stock }} in stock</div>
          <p class="lead">Designed for effortless daily luxury with considered materials, precise detailing, and an elevated finish.</p>
          <div class="product-price detail-price"><strong>${{ product.price }}</strong><span>${{ product.compareAt }}</span></div>
          <div class="swatches my-4"><span v-for="swatch in product.swatches" :key="swatch" :style="{ backgroundColor: swatch }"></span></div>
          <div class="quantity-row">
            <button class="btn btn-outline-dark" type="button" @click="quantity = Math.max(1, quantity - 1)">-</button>
            <input v-model.number="quantity" class="form-control" type="number" min="1" aria-label="Quantity" />
            <button class="btn btn-outline-dark" type="button" @click="quantity++">+</button>
          </div>
          <button class="btn btn-primary btn-lg w-100 my-3" type="button" @click="store.addToCart(product, quantity)"><i class="bi bi-bag-plus"></i> Add to cart</button>
          <div class="detail-actions">
            <button class="btn btn-outline-dark" type="button" @click="store.toggleWishlist(product.id)"><i class="bi bi-heart"></i> Wishlist</button>
            <button class="btn btn-outline-dark" type="button" @click="store.toggleCompare(product.id)"><i class="bi bi-arrow-left-right"></i> Compare</button>
          </div>
          <div class="accordion mt-4" id="productInfo">
            <div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#materials">Materials</button></h2><div id="materials" class="accordion-collapse collapse show" data-bs-parent="#productInfo"><div class="accordion-body">Premium construction, durable finishing, and recyclable protective packaging.</div></div></div>
            <div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#shipping">Shipping</button></h2><div id="shipping" class="accordion-collapse collapse" data-bs-parent="#productInfo"><div class="accordion-body">Ships in 1-2 business days with tracking and complimentary returns.</div></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { getProduct } from '../utils/catalog';

const route = useRoute();
const store = useCartStore();
const quantity = ref(1);
const product = computed(() => getProduct(route.params.slug));
</script>
