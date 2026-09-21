<template>
  <footer class="site-footer">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-4">
          <RouterLink class="brand footer-brand" to="/">{{ t('common.brand') }}</RouterLink>
          <p>{{ t('home.subtitle') }}</p>
          <div class="socials">
            <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a href="#" aria-label="Pinterest"><i class="bi bi-pinterest"></i></a>
            <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
          </div>
        </div>
        <div class="col-6 col-lg-2">
          <h2>{{ t('navigation.shop') }}</h2>
          <RouterLink to="/shop">{{ t('category.title') }}</RouterLink>
          <RouterLink to="/category/fashion">Fashion</RouterLink>
          <RouterLink to="/category/electronics">Electronics</RouterLink>
          <RouterLink to="/category/home">Home Living</RouterLink>
        </div>
        <div class="col-6 col-lg-2">
          <h2>{{ t('navigation.support') }}</h2>
          <RouterLink to="/support">{{ t('support.contact') }}</RouterLink>
          <RouterLink to="/orders">{{ t('orders.title') }}</RouterLink>
          <RouterLink to="/settings">{{ t('settings.title') }}</RouterLink>
          <RouterLink to="/wishlist">{{ t('wishlist.title') }}</RouterLink>
        </div>
        <div id="contact" class="col-lg-4">
          <h2>{{ t('support.contact') }}</h2>
          <p>Studio 8, Commerce Avenue<br />Mumbai, MH 400001</p>
          <p><a href="mailto:hello@lumacart.test">hello@lumacart.test</a></p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 {{ t('common.brand') }}</span>
        <span>{{ t('payment.upi') }} · Visa · Mastercard · Wallet</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from '../localization';
const { t } = useI18n();
</script>
