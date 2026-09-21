export const categories = [
  { id: 'women', name: 'Women', image: '/images/category-women.svg', count: 124, accent: 'Rose edit' },
  { id: 'men', name: 'Men', image: '/images/category-men.svg', count: 98, accent: 'Tailored daily' },
  { id: 'home', name: 'Home', image: '/images/category-home.svg', count: 62, accent: 'Modern living' },
  { id: 'beauty', name: 'Beauty', image: '/images/category-beauty.svg', count: 48, accent: 'Clean glow' }
];

export const products = [
  { id: 1, slug: 'silk-wrap-dress', name: 'Silk Wrap Dress', category: 'women', price: 248, compareAt: 320, rating: 4.9, tag: 'Best Seller', image: '/images/product-dress.svg', swatches: ['#111827', '#b76e79', '#f1d5bd'], stock: 14 },
  { id: 2, slug: 'atelier-leather-tote', name: 'Atelier Leather Tote', category: 'women', price: 189, compareAt: 229, rating: 4.8, tag: 'New Arrival', image: '/images/product-bag.svg', swatches: ['#784421', '#111827', '#d6b982'], stock: 9 },
  { id: 3, slug: 'linen-resort-shirt', name: 'Linen Resort Shirt', category: 'men', price: 86, compareAt: 112, rating: 4.7, tag: 'Flash Sale', image: '/images/product-shirt.svg', swatches: ['#e8dcc8', '#2f5d62', '#1f2937'], stock: 18 },
  { id: 4, slug: 'ceramic-ritual-set', name: 'Ceramic Ritual Set', category: 'home', price: 132, compareAt: 168, rating: 4.9, tag: 'Limited', image: '/images/product-ceramic.svg', swatches: ['#f4efe7', '#708871', '#c6a969'], stock: 7 },
  { id: 5, slug: 'cashmere-travel-scarf', name: 'Cashmere Travel Scarf', category: 'women', price: 154, compareAt: 196, rating: 4.8, tag: 'Gift Pick', image: '/images/product-scarf.svg', swatches: ['#d7b98e', '#64748b', '#492f24'], stock: 12 },
  { id: 6, slug: 'botanical-serum', name: 'Botanical Serum', category: 'beauty', price: 72, compareAt: 96, rating: 4.9, tag: 'Clean Beauty', image: '/images/product-serum.svg', swatches: ['#d4a373', '#edf6f9', '#2d6a4f'], stock: 21 },
  { id: 7, slug: 'tailored-knit-jacket', name: 'Tailored Knit Jacket', category: 'men', price: 210, compareAt: 278, rating: 4.6, tag: 'Editor Pick', image: '/images/product-jacket.svg', swatches: ['#172554', '#525252', '#c9ada7'], stock: 6 },
  { id: 8, slug: 'marble-table-lamp', name: 'Marble Table Lamp', category: 'home', price: 178, compareAt: 240, rating: 4.7, tag: 'Best Seller', image: '/images/product-lamp.svg', swatches: ['#f8fafc', '#d4af37', '#111827'], stock: 5 }
];

export const heroSlides = [
  { title: 'Modern essentials, quietly luxurious', copy: 'Curated apparel, home objects, and clean beauty with premium details for everyday rituals.', image: '/images/hero-storefront.svg', badge: 'New season edit', cta: 'Shop the edit' },
  { title: 'Flash sale: refined pieces up to 35% off', copy: 'Limited-time favorites with considered materials, elevated forms, and effortless gifting appeal.', image: '/images/hero-sale.svg', badge: '48 hour event', cta: 'View flash sale' }
];

export const testimonials = [
  'A polished storefront foundation with the details our catalog needs.',
  'Fast, responsive, and premium without feeling fragile or over-designed.',
  'The mobile commerce flow feels finished right out of the package.'
];

export function getProduct(slug) {
  return products.find((product) => product.slug === slug) || products[0];
}

export function getCategory(id) {
  return categories.find((category) => category.id === id) || categories[0];
}
