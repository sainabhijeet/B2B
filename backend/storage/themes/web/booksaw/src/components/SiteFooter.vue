<template>
  <footer class="site-footer">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-4">
          <RouterLink class="brand footer-brand" to="/">Luxury<span>Commerce</span></RouterLink>
          <p>Premium ecommerce theme for curated fashion, beauty, home, and lifestyle storefronts.</p>
          <div class="socials">
            <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a href="#" aria-label="Pinterest"><i class="bi bi-pinterest"></i></a>
            <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
          </div>
        </div>
        <div class="col-6 col-lg-2">
          <h2>Shop</h2>
          <RouterLink to="/shop">All Products</RouterLink>
          <RouterLink to="/category/women">Women</RouterLink>
          <RouterLink to="/category/men">Men</RouterLink>
          <RouterLink to="/category/home">Home</RouterLink>
        </div>
        <div class="col-6 col-lg-2">
          <h2>Support</h2>
          <a href="#contact">Contact</a>
          <RouterLink to="/orders">Order History</RouterLink>
          <RouterLink to="/compare">Compare</RouterLink>
          <RouterLink to="/wishlist">Wishlist</RouterLink>
        </div>
        <div id="contact" class="col-lg-4">
          <h2>Contact</h2>
          <p>Studio 8, Commerce Avenue<br />New York, NY 10013</p>
          <p><a href="mailto:hello@luxurycommerce.test">hello@luxurycommerce.test</a></p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Luxury Commerce</span>
        <span>Visa · Mastercard · Amex · PayPal</span>
      </div>
    </div>
  </footer>
</template>
