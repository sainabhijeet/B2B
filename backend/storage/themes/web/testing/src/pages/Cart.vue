<template>
  <section class="page-hero compact"><div class="container"><p class="eyebrow">Cart</p><h1>Your bag</h1></div></section>
  <section class="section">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-8">
          <article v-for="item in items" :key="item.id" class="line-item">
            <img :src="item.image" :alt="item.name" />
            <div><h2>{{ item.name }}</h2><p>${{ item.price }}</p></div>
            <input class="form-control" type="number" min="1" :value="item.quantity" @input="store.updateQuantity(item.id, Number($event.target.value))" aria-label="Quantity" />
            <button class="icon-btn" type="button" aria-label="Remove item" @click="store.removeFromCart(item.id)"><i class="bi bi-trash"></i></button>
          </article>
        </div>
        <div class="col-lg-4">
          <div class="summary-card">
            <h2>Order summary</h2>
            <p><span>Subtotal</span><strong>${{ subtotal }}</strong></p>
            <p><span>Promotion</span><strong>-${{ discount }}</strong></p>
            <p><span>Shipping</span><strong>$12</strong></p>
            <p class="total"><span>Total</span><strong>${{ total }}</strong></p>
            <RouterLink class="btn btn-primary w-100" to="/checkout">Checkout</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart';
const store = useCartStore();
const { items, subtotal, discount, total } = storeToRefs(store);
</script>
