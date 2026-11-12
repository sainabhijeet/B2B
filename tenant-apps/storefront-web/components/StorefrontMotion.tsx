"use client";

import { useEffect } from "react";

export default function StorefrontMotion({ designId }: { designId?: string }) {
  useEffect(() => {
    const filterDisclosure = document.querySelector<HTMLDetailsElement>(".category-filter-disclosure");
    const compactCatalog = window.matchMedia("(max-width: 900px)");
    const categoryMenus = Array.from(document.querySelectorAll<HTMLDetailsElement>(".industrial-nav-menu,.industrial-commerce-menu"));
    const syncCatalogFilter = () => {
      if (!filterDisclosure) return;
      if (compactCatalog.matches) filterDisclosure.removeAttribute("open");
      else filterDisclosure.setAttribute("open", "");
    };
    const closeCategoryMenus = (except?: HTMLDetailsElement) => {
      categoryMenus.forEach((menu) => {
        if (menu !== except) menu.removeAttribute("open");
      });
    };
    const onDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const containingMenu = categoryMenus.find((menu) => menu.contains(target));
      if (!containingMenu) closeCategoryMenus();
    };
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".industrial-nav-menu a,.industrial-commerce-menu a")) closeCategoryMenus();
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCategoryMenus();
    };
    const cleanupCommon = () => {
      compactCatalog.removeEventListener("change", syncCatalogFilter);
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };

    const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 28);
    syncCatalogFilter();
    compactCatalog.addEventListener("change", syncCatalogFilter);
    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeyDown);

    if (designId !== "ds-01-web" && designId !== "ds-03-web") return cleanupCommon;

    const root = document.body;
    root.classList.add("storefront-motion-ready");
    const header = document.querySelector<HTMLElement>(".storefront-header");
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-motion-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    const revealItemSelector = [
      ".category-card",
      ".product-card",
      "li",
      "details",
      ".category-browse-stat",
      ".category-results-toolbar",
      ".category-filter-panel",
      ".pdp-gallery-stage",
      ".pdp-product-summary",
    ].join(",");
    const assignRevealIndexes = (rootNode: ParentNode) => {
      rootNode.querySelectorAll<HTMLElement>(revealItemSelector).forEach((item, index) => {
        item.style.setProperty("--reveal-index", String(index % 12));
      });
    };
    const observedSections = new WeakSet<HTMLElement>();
    const observeSection = (section: HTMLElement) => {
      if (observedSections.has(section)) return;
      observedSections.add(section);
      section.classList.add("is-motion-pending");
      assignRevealIndexes(section);
      observer.observe(section);
    };
    const observeSectionsInside = (rootNode: ParentNode) => {
      if (rootNode instanceof HTMLElement && rootNode.matches(".theme-section-root")) observeSection(rootNode);
      rootNode.querySelectorAll<HTMLElement>(".theme-section-root").forEach(observeSection);
      assignRevealIndexes(rootNode);
    };
    observeSectionsInside(document);
    const sectionMutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) observeSectionsInside(node);
        });
      });
    });
    sectionMutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cleanupCommon();
      observer.disconnect();
      sectionMutationObserver.disconnect();
      root.classList.remove("storefront-motion-ready");
    };
  }, [designId]);

  return null;
}
