import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { products } from '../utils/catalog';

const findProduct = (id) => products.find((product) => product.id === id);

export const useCartStore = defineStore('cart', () => {
  const cart = ref([{ id: 1, quantity: 1 }, { id: 6, quantity: 2 }]);
  const wishlist = ref([2, 5]);
  const compare = ref([1, 4]);

  const items = computed(() => cart.value.map((item) => ({ ...findProduct(item.id), quantity: item.quantity })));
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const discount = computed(() => Math.round(subtotal.value * 0.12));
  const total = computed(() => Math.max(0, subtotal.value - discount.value + 12));

  function addToCart(product, quantity = 1) {
    const existing = cart.value.find((item) => item.id === product.id);
    if (existing) existing.quantity += quantity;
    else cart.value.push({ id: product.id, quantity });
  }

  function removeFromCart(id) {
    cart.value = cart.value.filter((item) => item.id !== id);
  }

  function updateQuantity(id, quantity) {
    const item = cart.value.find((entry) => entry.id === id);
    if (item) item.quantity = Math.max(1, quantity);
  }

  function toggleWishlist(id) {
    wishlist.value = wishlist.value.includes(id) ? wishlist.value.filter((item) => item !== id) : [...wishlist.value, id];
  }

  function toggleCompare(id) {
    compare.value = compare.value.includes(id) ? compare.value.filter((item) => item !== id) : [...compare.value.slice(-2), id];
  }

  return { cart, wishlist, compare, items, subtotal, discount, total, addToCart, removeFromCart, updateQuantity, toggleWishlist, toggleCompare };
});
