import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Cancellation Policy", description: "Understand how to request an order cancellation." };

export default function CancellationsPage() {
  return <StorefrontInformationPage
    pageVariant="cancellations"
    eyebrow="Cancellation policy"
    title="Request order changes before fulfilment moves too far."
    introduction="If you need to cancel an order, contact support quickly with the order reference. Whether a request can be accepted depends on its current processing status."
    sections={[
      { title: "Before confirmation", description: "Review products, quantities and addresses carefully before completing checkout.", items: ["Use the cart to adjust quantities", "Remove unwanted products before payment", "Confirm delivery details"] },
      { title: "After placing an order", description: "Open Orders and contact support as soon as you identify a problem.", items: ["Share the order reference", "Identify the products involved", "Explain whether the whole order or one line is affected"] },
      { title: "When cancellation is limited", description: "A request may not be possible after preparation, customisation or dispatch has started.", items: ["Made-to-order items may have special conditions", "Dispatched products may need the returns process", "Seller-specific conditions can apply"] },
      { title: "Payment adjustments", description: "If cancellation is approved, any eligible payment adjustment follows the applicable payment process.", items: ["Processing times depend on payment method", "Some completed services or charges may be excluded", "Support will communicate the available outcome"] },
    ]}
    notice="A cancellation request is not confirmed until the seller or support team accepts it."
    primaryAction={{ label: "View orders", href: "/orders" }}
    secondaryAction={{ label: "Contact support", href: "/contact" }}
  />;
}
