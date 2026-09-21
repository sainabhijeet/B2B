import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Shop from '../pages/Shop.vue';
import Category from '../pages/Category.vue';
import Product from '../pages/Product.vue';
import Cart from '../pages/Cart.vue';
import Checkout from '../pages/Checkout.vue';
import Wishlist from '../pages/Wishlist.vue';
import Compare from '../pages/Compare.vue';
import Account from '../pages/Account.vue';
import Login from '../pages/Login.vue';
import Register from '../pages/Register.vue';
import OrderHistory from '../pages/OrderHistory.vue';
import NotFound from '../pages/NotFound.vue';

export default createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/shop', name: 'shop', component: Shop },
    { path: '/category/:id', name: 'category', component: Category },
    { path: '/product/:slug', name: 'product', component: Product },
    { path: '/cart', name: 'cart', component: Cart },
    { path: '/checkout', name: 'checkout', component: Checkout },
    { path: '/wishlist', name: 'wishlist', component: Wishlist },
    { path: '/compare', name: 'compare', component: Compare },
    { path: '/account', name: 'account', component: Account },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
    { path: '/orders', name: 'orders', component: OrderHistory },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }
  ]
});
