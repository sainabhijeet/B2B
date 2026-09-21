import { ref, watchEffect } from 'vue';

const darkMode = ref(false);
const rtl = ref(false);
const searchOpen = ref(false);
const quickViewProduct = ref(null);

export function useUi() {
  watchEffect(() => {
    document.documentElement.dataset.theme = darkMode.value ? 'dark' : 'light';
    document.documentElement.dir = rtl.value ? 'rtl' : 'ltr';
  });

  return {
    darkMode,
    rtl,
    searchOpen,
    quickViewProduct,
    toggleDarkMode: () => (darkMode.value = !darkMode.value),
    toggleRtl: () => (rtl.value = !rtl.value),
    openQuickView: (product) => (quickViewProduct.value = product),
    closeQuickView: () => (quickViewProduct.value = null)
  };
}
