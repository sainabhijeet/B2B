import { ref, watchEffect } from 'vue';

const darkMode = ref(false);
const searchOpen = ref(false);
const quickViewProduct = ref(null);

export function useUi() {
  watchEffect(() => {
    document.documentElement.dataset.theme = darkMode.value ? 'dark' : 'light';
  });

  return {
    darkMode,
    searchOpen,
    quickViewProduct,
    toggleDarkMode: () => (darkMode.value = !darkMode.value),
    openQuickView: (product) => (quickViewProduct.value = product),
    closeQuickView: () => (quickViewProduct.value = null)
  };
}
