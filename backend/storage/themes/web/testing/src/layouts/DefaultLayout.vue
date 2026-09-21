<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <SiteHeader />
  <main id="main" tabindex="-1">
    <slot />
  </main>
  <NewsletterBand />
  <SiteFooter />
  <MobileBottomBar />
  <QuickViewModal />
</template>

<script setup>
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import NewsletterBand from '../components/NewsletterBand.vue';
import MobileBottomBar from '../components/MobileBottomBar.vue';
import QuickViewModal from '../components/QuickViewModal.vue';
</script>
