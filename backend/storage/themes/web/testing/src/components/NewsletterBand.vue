<template>
  <section class="newsletter-band" aria-labelledby="newsletter-title">
    <div class="container">
      <div class="newsletter-inner">
        <div>
          <p class="eyebrow">{{ t('home.newsletter') }}</p>
          <h2 id="newsletter-title">{{ t('home.newsletterCopy') }}</h2>
        </div>
        <form class="newsletter-form" @submit.prevent="submitted = true">
          <label class="visually-hidden" for="newsletter-email">{{ t('auth.email') }}</label>
          <input id="newsletter-email" class="form-control" type="email" :placeholder="t('auth.email')" required />
          <button class="btn btn-primary" type="submit">{{ submitted ? t('success.saved') : t('common.submit') }}</button>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from '../localization';

const submitted = ref(false);
const { t } = useI18n();
</script>
