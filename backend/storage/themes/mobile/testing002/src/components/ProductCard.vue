<template>
  <article class="product-card" :class="`product-card-${variant}`">
    <RouterLink class="product-media" :to="`/product/${product.slug}`">
      <span class="badge-soft">{{ product.badge }}</span>
      <img :src="product.image" :alt="`${t('accessibility.productImage')}: ${product.name}`" loading="lazy" />
    </RouterLink>
    <div class="product-actions">
      <button class="icon-btn" type="button" :aria-label="t('product.zoom')" @click="openQuickView(product)"><i class="bi bi-eye"></i></button>
      <button class="icon-btn" type="button" :aria-label="t('accessibility.toggleWishlist')" @click="store.toggleWishlist(product.id)"><i class="bi" :class="wishlist.includes(product.id) ? 'bi-heart-fill' : 'bi-heart'"></i></button>
    </div>
    <div class="product-body">
      <div class="rating" :aria-label="t('common.rating')"><i class="bi bi-star-fill"></i> {{ product.rating }} <span>({{ product.reviews }})</span></div>
      <small>{{ product.brand }}</small>
      <RouterLink class="product-title" :to="`/product/${product.slug}`">{{ product.name }}</RouterLink>
      <div class="product-price">
        <strong>${{ product.price }}</strong>
        <span>${{ product.mrp }}</span>
        <b>{{ product.discount }}%</b>
      </div>
      <div class="stock-row">
        <span :class="product.stock ? 'text-success' : 'text-danger'">{{ product.stock ? t('common.available') : t('common.outOfStock') }}</span>
        <span>{{ t('common.quantity') }} {{ product.stock }}</span>
      </div>
      <button class="btn btn-dark w-100" type="button" :disabled="!product.stock" @click="store.addToCart(product)">
        <i class="bi bi-bag-plus"></i> {{ t('product.addToCart') }}
      </button>
    </div>
  </article>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart';
import { useUi } from '../composables/useUi';
import { useI18n } from '../localization';

defineProps({ product: { type: Object, required: true }, variant: { type: String, default: 'medium' } });
const store = useCartStore();
const { wishlist } = storeToRefs(store);
const { openQuickView } = useUi();
const { t } = useI18n();
</script>
