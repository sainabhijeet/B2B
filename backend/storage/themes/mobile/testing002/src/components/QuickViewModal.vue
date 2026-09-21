<template>
  <div v-if="quickViewProduct" class="quick-view-backdrop" role="dialog" aria-modal="true" :aria-label="t('product.zoom')" @click.self="closeQuickView">
    <div class="quick-view">
      <button class="icon-btn close-btn" type="button" :aria-label="t('accessibility.close')" @click="closeQuickView"><i class="bi bi-x-lg"></i></button>
      <img :src="quickViewProduct.image" :alt="quickViewProduct.name" />
      <div>
        <p class="eyebrow">{{ quickViewProduct.badge }}</p>
        <h2>{{ quickViewProduct.name }}</h2>
        <p class="lead">{{ t('home.subtitle') }}</p>
        <div class="product-price mb-3"><strong>${{ quickViewProduct.price }}</strong><span>${{ quickViewProduct.mrp }}</span></div>
        <button class="btn btn-primary" type="button" @click="addAndClose"><i class="bi bi-bag-plus"></i> {{ t('product.addToCart') }}</button>
        <RouterLink class="btn btn-outline-dark ms-2" :to="`/product/${quickViewProduct.slug}`" @click="closeQuickView">{{ t('orders.details') }}</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../stores/cart';
import { useUi } from '../composables/useUi';
import { useI18n } from '../localization';

const store = useCartStore();
const { quickViewProduct, closeQuickView } = useUi();
const { t } = useI18n();
function addAndClose() {
  store.addToCart(quickViewProduct.value);
  closeQuickView();
}
</script>
