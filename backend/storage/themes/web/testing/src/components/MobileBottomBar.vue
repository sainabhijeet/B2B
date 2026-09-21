<template>
  <nav class="mobile-bottom-bar" :aria-label="t('accessibility.mobileNavigation')">
    <RouterLink to="/"><i class="bi bi-house"></i><span>{{ t('mobile.bottomHome') }}</span></RouterLink>
    <RouterLink to="/shop"><i class="bi bi-grid"></i><span>{{ t('mobile.bottomCategories') }}</span></RouterLink>
    <RouterLink to="/search"><i class="bi bi-search"></i><span>{{ t('mobile.bottomSearch') }}</span></RouterLink>
    <RouterLink to="/cart"><i class="bi bi-bag"></i><span>{{ t('mobile.bottomCart') }}</span></RouterLink>
    <RouterLink to="/account"><i class="bi bi-person"></i><span>{{ t('mobile.bottomAccount') }}</span></RouterLink>
  </nav>
</template>

<script setup>
import { useI18n } from '../localization';
const { t } = useI18n();
</script>
