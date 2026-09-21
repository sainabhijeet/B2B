<template><section class="page-hero compact"><div class="container"><p class="eyebrow">Orders</p><h1>Order history</h1></div></section><section class="section"><div class="container"><div class="order-card" v-for="order in orders" :key="order.id"><div><strong>{{ order.id }}</strong><span>{{ order.date }}</span></div><span>{{ order.status }}</span><strong>${{ order.total }}</strong></div></div></section></template>
<script setup>
const orders = [{ id: '#LC-1048', date: 'Aug 2, 2026', status: 'In transit', total: 392 }, { id: '#LC-1021', date: 'Jul 18, 2026', status: 'Delivered', total: 178 }, { id: '#LC-0988', date: 'Jun 29, 2026', status: 'Delivered', total: 521 }];
</script>
