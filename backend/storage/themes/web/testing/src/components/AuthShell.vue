<template>
  <section class="auth-page">
    <form class="auth-card">
      <p class="eyebrow">Luxury Commerce</p>
      <h1>{{ title }}</h1>
      <input v-if="register" class="form-control" placeholder="Full name" autocomplete="name" />
      <input class="form-control" type="email" placeholder="Email address" autocomplete="email" />
      <input class="form-control" type="password" placeholder="Password" autocomplete="current-password" />
      <button class="btn btn-primary w-100" type="submit">{{ cta }}</button>
      <p>{{ note }} <RouterLink :to="link">{{ linkText }}</RouterLink></p>
    </form>
  </section>
</template>

<script setup>
defineProps({ title: String, cta: String, note: String, link: String, linkText: String, register: Boolean });
</script>
