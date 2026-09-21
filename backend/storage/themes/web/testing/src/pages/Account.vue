<template><section class="page-hero compact"><div class="container"><p class="eyebrow">Account</p><h1>Welcome back, Jordan</h1></div></section><section class="section"><div class="container"><div class="dashboard-grid"><div class="metric-card"><span>Orders</span><strong>12</strong></div><div class="metric-card"><span>Rewards</span><strong>4,820</strong></div><div class="metric-card"><span>Saved</span><strong>{{ wishlist.length }}</strong></div></div><RouterLink class="btn btn-primary mt-4" to="/orders">View order history</RouterLink></div></section></template>
<script setup>
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart';
const { wishlist } = storeToRefs(useCartStore());
</script>
