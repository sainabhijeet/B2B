import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Offers", description: "Explore current storefront offers and buying opportunities." };

export default function OffersPage() {
  return <StorefrontInformationPage
    pageVariant="offers"
    eyebrow="Current offers"
    title="Better-value buying opportunities, clearly explained."
    introduction="Review eligible promotions, product price breaks and limited-time catalogue opportunities in one place. Final eligibility is always shown on the product or checkout page."
    highlights={[
      { label: "Product pricing", value: "Visible before checkout" },
      { label: "Bulk requirements", value: "Support available" },
      { label: "Availability", value: "Confirmed per product" },
      { label: "Checkout", value: "Final total reviewed" },
    ]}
    sections={[
      { title: "Product offers", description: "Eligible sale prices and discounts appear directly with the relevant catalogue item.", items: ["Compare the current and previous price where available", "Review pack size and quantity requirements", "Check availability before placing an order"] },
      { title: "Volume opportunities", description: "Larger requirements may need a tailored commercial conversation with the buying team.", items: ["Share the product and required quantity", "Include your preferred delivery location", "Receive availability and next-step guidance"] },
      { title: "Offer transparency", description: "The product page and checkout remain the source of truth for the final payable amount.", items: ["Offers can be product or time specific", "Taxes and shipping may be calculated separately", "Availability can change until an order is confirmed"] },
      { title: "Need a custom quote?", description: "Use the bulk-order desk when the listed options do not fit your requirement.", items: ["Useful for repeat purchasing", "Useful for multi-item requirements", "Useful when delivery planning is required"] },
    ]}
    notice="This page explains how storefront offers work. Only prices and promotions displayed against a product or during checkout are active."
    primaryAction={{ label: "Browse catalogue", href: "/category" }}
    secondaryAction={{ label: "Plan a bulk order", href: "/bulk-orders" }}
  />;
}
