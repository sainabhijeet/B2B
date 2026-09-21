export const categories = [
  { id: 'fashion', key: 'Fashion', icon: 'bi-bag-heart', image: '/images/category-women.svg', count: 326 },
  { id: 'electronics', key: 'Electronics', icon: 'bi-phone', image: '/images/product-lamp.svg', count: 184 },
  { id: 'home', key: 'Home Living', icon: 'bi-house-heart', image: '/images/category-home.svg', count: 142 },
  { id: 'beauty', key: 'Beauty', icon: 'bi-droplet', image: '/images/category-beauty.svg', count: 96 },
  { id: 'grocery', key: 'Grocery', icon: 'bi-basket', image: '/images/product-ceramic.svg', count: 212 },
  { id: 'sports', key: 'Sports', icon: 'bi-lightning-charge', image: '/images/product-jacket.svg', count: 75 }
];

export const brands = ['Aura', 'Northline', 'CasaCraft', 'GlowLab', 'Voltix', 'FreshNest'];

export const products = [
  { id: 1, slug: 'silk-wrap-dress', name: 'Silk Wrap Dress', brand: 'Aura', category: 'fashion', price: 248, mrp: 320, rating: 4.9, reviews: 842, badge: 'Best Seller', image: '/images/product-dress.svg', stock: 14, discount: 22 },
  { id: 2, slug: 'atelier-leather-tote', name: 'Atelier Leather Tote', brand: 'Aura', category: 'fashion', price: 189, mrp: 229, rating: 4.8, reviews: 611, badge: 'New Arrival', image: '/images/product-bag.svg', stock: 9, discount: 17 },
  { id: 3, slug: 'linen-resort-shirt', name: 'Linen Resort Shirt', brand: 'Northline', category: 'fashion', price: 86, mrp: 112, rating: 4.7, reviews: 319, badge: 'Flash Sale', image: '/images/product-shirt.svg', stock: 18, discount: 23 },
  { id: 4, slug: 'ceramic-ritual-set', name: 'Ceramic Ritual Set', brand: 'CasaCraft', category: 'home', price: 132, mrp: 168, rating: 4.9, reviews: 402, badge: 'Limited', image: '/images/product-ceramic.svg', stock: 7, discount: 21 },
  { id: 5, slug: 'cashmere-travel-scarf', name: 'Cashmere Travel Scarf', brand: 'Northline', category: 'fashion', price: 154, mrp: 196, rating: 4.8, reviews: 267, badge: 'Gift Pick', image: '/images/product-scarf.svg', stock: 12, discount: 21 },
  { id: 6, slug: 'botanical-serum', name: 'Botanical Serum', brand: 'GlowLab', category: 'beauty', price: 72, mrp: 96, rating: 4.9, reviews: 1204, badge: 'Clean Beauty', image: '/images/product-serum.svg', stock: 21, discount: 25 },
  { id: 7, slug: 'noise-smart-watch', name: 'AMOLED Smart Watch', brand: 'Voltix', category: 'electronics', price: 129, mrp: 179, rating: 4.6, reviews: 934, badge: 'Deal', image: '/images/product-watch.svg', stock: 16, discount: 28 },
  { id: 8, slug: 'marble-table-lamp', name: 'Marble Table Lamp', brand: 'CasaCraft', category: 'home', price: 178, mrp: 240, rating: 4.7, reviews: 188, badge: 'Best Seller', image: '/images/product-lamp.svg', stock: 5, discount: 26 }
];

export const banners = [
  { id: 'hero', image: '/images/hero-storefront.svg', metric: '2 hour express in selected cities' },
  { id: 'sale', image: '/images/hero-sale.svg', metric: 'Up to 35% off curated favorites' }
];

export const coupons = [
  { code: 'LUMA15', value: '15% off prepaid orders' },
  { code: 'FREESHIP', value: 'Free delivery above $99' }
];

export const orders = [
  { id: 'LC-20491', date: '08 Aug 2026', status: 'orders.delivered', total: 392, items: ['Silk Wrap Dress', 'Botanical Serum'] },
  { id: 'LC-20412', date: '02 Aug 2026', status: 'orders.shipped', total: 178, items: ['Marble Table Lamp'] },
  { id: 'LC-20377', date: '26 Jul 2026', status: 'orders.returned', total: 86, items: ['Linen Resort Shirt'] }
];

export const reviews = [
  { name: 'Meera S.', text: 'Premium product discovery with a checkout flow that feels fast and trustworthy.', rating: 5 },
  { name: 'Arjun K.', text: 'The mobile screens are polished enough for a serious retail launch.', rating: 5 },
  { name: 'Priya N.', text: 'Filters, order tracking, and support are all where customers expect them.', rating: 4 }
];

export function getProduct(slug) {
  return products.find((product) => product.slug === slug) || products[0];
}

export function productsByCategory(categoryId) {
  return products.filter((product) => product.category === categoryId);
}
