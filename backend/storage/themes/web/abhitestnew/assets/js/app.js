const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

$(".mobile-toggle")?.addEventListener("click", () => {
  $(".nav-row")?.classList.toggle("open");
});

function updateCountdown() {
  const timers = $$(".timer");
  if (!timers.length) return;
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end - now);
  const h = String(Math.floor(diff / 36e5)).padStart(2, "0");
  const m = String(Math.floor((diff % 36e5) / 6e4)).padStart(2, "0");
  const s = String(Math.floor((diff % 6e4) / 1000)).padStart(2, "0");
  timers.forEach((timer) => {
    timer.innerHTML = `<span>${h}</span>:<span>${m}</span>:<span>${s}</span>`;
  });
}
updateCountdown();
setInterval(updateCountdown, 1000);

$$("[data-wishlist]").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("ghost");
    btn.textContent = btn.classList.contains("ghost") ? "Wishlist" : "Saved";
  });
});

$$("[data-qty]").forEach((box) => {
  const input = $("input", box);
  $$("button", box).forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = btn.dataset.step === "up" ? 1 : -1;
      input.value = Math.max(1, Number(input.value || 1) + step);
    });
  });
});

$$(".faq-q").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".faq-item")?.classList.toggle("open");
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.12 });
$$(".fade-up").forEach((el) => observer.observe(el));

$$("[data-filter]").forEach((control) => {
  control.addEventListener("change", () => {
    const selected = $$("[data-filter]:checked").map((item) => item.value);
    $$(".product-card").forEach((card) => {
      const tags = (card.dataset.tags || "").split(",");
      const show = selected.length === 0 || selected.some((tag) => tags.includes(tag));
      card.style.display = show ? "" : "none";
    });
  });
});
