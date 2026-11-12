import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Returns and Refunds", description: "Review the storefront return and refund support process." };

export default function ReturnsPage() {
  return <StorefrontInformationPage
    pageVariant="returns"
    eyebrow="Returns & refunds"
    title="A straightforward support path when an order is not right."
    introduction="Return eligibility can depend on the product, condition, seller and reason for the request. Start from your order details and contact support as soon as possible."
    sections={[
      { title: "Check eligibility", description: "Review the product and order-specific conditions before requesting a return.", items: ["Some made-to-order or customised items may be excluded", "Items should remain unused unless the issue requires inspection", "Original labels, accessories and packaging may be required"] },
      { title: "Raise a request", description: "Provide enough information for the seller or support team to review the issue.", items: ["Order reference and affected product", "Reason for the request", "Clear photos where damage or mismatch is involved"] },
      { title: "Review and collection", description: "Approved requests may include collection or return-shipping instructions.", items: ["Do not send an item without instructions", "Pack the product securely", "Keep collection or shipping evidence"] },
      { title: "Refund processing", description: "Approved refunds are processed after the required checks are completed.", items: ["Processing time can depend on the payment method", "Delivery charges may be treated separately", "The final outcome is shared against the request"] },
    ]}
    notice="This is a general support guide. The conditions displayed for the product, seller and confirmed order take priority."
    primaryAction={{ label: "View orders", href: "/orders" }}
    secondaryAction={{ label: "Request support", href: "/contact" }}
  />;
}
