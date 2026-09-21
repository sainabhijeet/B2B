<template>
  <section class="page-hero compact"><div class="container"><p class="eyebrow">Secure checkout</p><h1>Complete your order</h1></div></section>
  <section class="section"><div class="container"><div class="row g-4">
    <div class="col-lg-7">
      <form class="checkout-form">
        <h2>Shipping details</h2>
        <div class="row g-3">
          <div class="col-md-6"><input class="form-control" placeholder="First name" required /></div>
          <div class="col-md-6"><input class="form-control" placeholder="Last name" required /></div>
          <div class="col-12"><input class="form-control" type="email" placeholder="Email" required /></div>
          <div class="col-12"><input class="form-control" placeholder="Street address" required /></div>
          <div class="col-md-6"><input class="form-control" placeholder="City" required /></div>
          <div class="col-md-6"><input class="form-control" placeholder="Postal code" required /></div>
        </div>
        <h2 class="mt-4">Payment</h2>
        <input class="form-control mb-3" placeholder="Card number" inputmode="numeric" />
        <button class="btn btn-primary btn-lg w-100" type="submit">Place order</button>
      </form>
    </div>
    <div class="col-lg-5"><div class="summary-card"><h2>Pay today</h2><p v-for="item in items" :key="item.id"><span>{{ item.name }} x {{ item.quantity }}</span><strong>${{ item.price * item.quantity }}</strong></p><p class="total"><span>Total</span><strong>${{ total }}</strong></p></div></div>
  </div></div></section>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart';
const { items, total } = storeToRefs(useCartStore());
</script>
