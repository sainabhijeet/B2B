import { computed, ref, watchEffect } from 'vue';
import en from './en.json';
import hi from './hi.json';

const messages = { en, hi };
const rtlLocales = new Set(['ar', 'he', 'fa', 'ur']);
const locale = ref(localStorage.getItem('lc-locale') || 'en');

function read(path, source) {
  return path.split('.').reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), source);
}

export function t(path) {
  return read(path, messages[locale.value]) ?? read(path, messages.en) ?? path;
}

export function useI18n() {
  const isRtl = computed(() => rtlLocales.has(locale.value));

  function setLocale(nextLocale) {
    if (!messages[nextLocale]) return;
    locale.value = nextLocale;
    localStorage.setItem('lc-locale', nextLocale);
  }

  watchEffect(() => {
    document.documentElement.lang = locale.value;
    document.documentElement.dir = isRtl.value ? 'rtl' : 'ltr';
  });

  return { t, locale, locales: Object.keys(messages), isRtl, setLocale };
}
