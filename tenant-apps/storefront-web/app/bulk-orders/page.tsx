import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Bulk Orders", description: "Plan a larger product requirement with buyer support." };

export default function BulkOrdersPage() {
  return <StorefrontInformationPage
    pageVariant="bulk-orders"
    eyebrow="Business buying desk"
    title="Plan larger orders with the right product and delivery details."
    introduction="For volume purchases, repeat requirements or multi-product enquiries, our buyer support flow helps collect the information needed to review availability and fulfilment."
    highlights={[
      { label: "Products", value: "Names, links or SKUs" },
      { label: "Quantities", value: "Required volume per item" },
      { label: "Delivery", value: "Location and preferred timing" },
      { label: "Review", value: "Availability and next steps" },
    ]}
    sections={[
      { title: "Prepare your requirement", description: "A clear request helps the team respond with relevant information.", items: ["Product names, links or SKUs", "Required quantity for each item", "Delivery city, postcode and preferred timeline"] },
      { title: "Commercial review", description: "The team can review catalogue fit, availability and any applicable quantity-based pricing.", items: ["Pack and minimum order requirements", "Indicative fulfilment schedule", "Pricing and payment considerations"] },
      { title: "Delivery planning", description: "Larger orders may need additional dispatch or receiving coordination.", items: ["Single or multiple delivery locations", "Access or unloading requirements", "Any time-sensitive receiving window"] },
      { title: "Order confirmation", description: "An order is confirmed only after final product, quantity, price and delivery details are accepted.", items: ["Review the final summary", "Confirm billing and shipping details", "Keep the order reference for tracking"] },
    ]}
    notice="Submitting an enquiry does not reserve stock or create a confirmed order. Availability and commercial terms are confirmed by the seller."
    primaryAction={{ label: "Find products", href: "/category" }}
    secondaryAction={{ label: "Contact buying desk", href: "/contact" }}
  />;
}
