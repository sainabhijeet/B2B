import { createRouter, createWebHistory } from 'vue-router';
import CommercePage from '../pages/CommercePage.vue';

export default createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: CommercePage, props: { page: 'home' } },
    { path: '/shop', name: 'shop', component: CommercePage, props: { page: 'shop' } },
    { path: '/category/:id', name: 'category', component: CommercePage, props: { page: 'category' } },
    { path: '/product/:slug', name: 'product', component: CommercePage, props: { page: 'product' } },
    { path: '/search', name: 'search', component: CommercePage, props: { page: 'search' } },
    { path: '/cart', name: 'cart', component: CommercePage, props: { page: 'cart' } },
    { path: '/checkout', name: 'checkout', component: CommercePage, props: { page: 'checkout' } },
    { path: '/payment', name: 'payment', component: CommercePage, props: { page: 'payment' } },
    { path: '/wishlist', name: 'wishlist', component: CommercePage, props: { page: 'wishlist' } },
    { path: '/account', name: 'account', component: CommercePage, props: { page: 'account' } },
    { path: '/login', name: 'login', component: CommercePage, props: { page: 'login' } },
    { path: '/register', name: 'register', component: CommercePage, props: { page: 'register' } },
    { path: '/orders', name: 'orders', component: CommercePage, props: { page: 'orders' } },
    { path: '/notifications', name: 'notifications', component: CommercePage, props: { page: 'notifications' } },
    { path: '/support', name: 'support', component: CommercePage, props: { page: 'support' } },
    { path: '/settings', name: 'settings', component: CommercePage, props: { page: 'settings' } },
    { path: '/mobile-app', name: 'mobile-app', component: CommercePage, props: { page: 'mobile' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: CommercePage, props: { page: 'home' } }
  ]
});
