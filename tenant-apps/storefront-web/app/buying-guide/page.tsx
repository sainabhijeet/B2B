import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Buying Guide", description: "A practical guide to browsing, comparing and ordering products." };

export default function BuyingGuidePage() {
  return <StorefrontInformationPage
    pageVariant="buying-guide"
    eyebrow="Buying guide"
    title="A simple path from product discovery to confirmed order."
    introduction="Use this guide to compare products, understand quantities and complete an order with fewer surprises."
    highlights={[
      { label: "Discover", value: "Find the right category" },
      { label: "Compare", value: "Review the buying details" },
      { label: "Plan", value: "Confirm pack and quantity" },
      { label: "Order", value: "Checkout and track" },
    ]}
    sections={[
      { title: "Discover", description: "Start with categories or search to narrow the catalogue.", items: ["Use category filters to refine results", "Save useful products to your wishlist", "Open product pages for complete information"] },
      { title: "Compare", description: "Review the details that matter for your use case.", items: ["Check SKU, pack size and unit price", "Review descriptions and available imagery", "Confirm stock or enquiry requirements"] },
      { title: "Plan quantities", description: "Choose an appropriate order quantity before adding the item to cart.", items: ["The cart count represents distinct products", "Each line keeps its own quantity", "Use bulk-order support for larger requirements"] },
      { title: "Checkout and track", description: "Review the order summary and keep your reference after checkout.", items: ["Confirm contact and delivery information", "Review the final payable amount", "Use Orders to follow confirmed purchases"] },
    ]}
    primaryAction={{ label: "Start browsing", href: "/category" }}
    secondaryAction={{ label: "Read FAQs", href: "/faq" }}
  />;
}
