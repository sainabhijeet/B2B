import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Shipping Information", description: "Understand dispatch, delivery estimates and order tracking." };

export default function ShippingPage() {
  return <StorefrontInformationPage
    pageVariant="shipping"
    eyebrow="Shipping information"
    title="Clearer delivery expectations from checkout to arrival."
    introduction="Delivery timing depends on product availability, seller processing and the destination. The most relevant information is shown during checkout and against your confirmed order."
    highlights={[
      { label: "Before ordering", value: "Review availability" },
      { label: "At checkout", value: "Confirm destination" },
      { label: "After ordering", value: "Track in Orders" },
      { label: "Need help", value: "Contact support" },
    ]}
    sections={[
      { title: "Dispatch timing", description: "Products may have different preparation or dispatch windows.", items: ["An estimate is not a guaranteed delivery date", "Multi-item orders may dispatch separately", "Bulk orders may require additional planning"] },
      { title: "Delivery charges", description: "Applicable delivery costs are shown before order confirmation whenever they can be calculated.", items: ["Charges can depend on location and order size", "Taxes may be shown separately", "Special handling may require confirmation"] },
      { title: "Tracking an order", description: "Signed-in customers can review confirmed purchases from the Orders page.", items: ["Keep your order reference available", "Tracking appears when supplied by the fulfiller", "Contact support if an expected update is missing"] },
      { title: "Receiving your delivery", description: "Check the shipment and packaging when it arrives.", items: ["Confirm the number of packages", "Record visible transit damage promptly", "Keep labels and packaging if support is required"] },
    ]}
    notice="Exact charges and delivery estimates are order-specific and can change until checkout is completed."
    primaryAction={{ label: "Track orders", href: "/orders" }}
    secondaryAction={{ label: "Contact support", href: "/contact" }}
  />;
}
