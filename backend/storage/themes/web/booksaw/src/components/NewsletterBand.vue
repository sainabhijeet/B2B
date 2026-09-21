<template>
  <section class="newsletter-band" aria-labelledby="newsletter-title">
    <div class="container">
      <div class="newsletter-inner">
        <div>
          <p class="eyebrow">Private list</p>
          <h2 id="newsletter-title">Early access to edits, drops, and flash offers.</h2>
        </div>
        <form class="newsletter-form" @submit.prevent="submitted = true">
          <label class="visually-hidden" for="newsletter-email">Email address</label>
          <input id="newsletter-email" class="form-control" type="email" placeholder="Email address" required />
          <button class="btn btn-primary" type="submit">{{ submitted ? 'Joined' : 'Join' }}</button>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
const submitted = ref(false);
</script>
