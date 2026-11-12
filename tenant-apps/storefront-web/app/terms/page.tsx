import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Terms and Conditions", description: "General conditions for using the storefront and placing orders." };

export default function TermsPage() {
  return <StorefrontInformationPage
    pageVariant="terms"
    eyebrow="Terms & conditions"
    title="The general conditions behind browsing and ordering."
    introduction="These principles describe how storefront access, product information and orders are generally handled. Product, seller and checkout terms form part of the final purchase conditions."
    sections={[
      { title: "Using the storefront", description: "Use the storefront lawfully and provide accurate information when creating an account or order.", items: ["Keep account access secure", "Do not misuse content or technical services", "Update important contact information when it changes"] },
      { title: "Product information", description: "Reasonable care is taken with product descriptions, imagery and pricing, but details can change.", items: ["Images may be illustrative", "Availability is not guaranteed until confirmation", "Obvious errors may be corrected"] },
      { title: "Orders and payment", description: "Submitting an order does not always mean it has been accepted.", items: ["Final price is reviewed at checkout", "Payment may require verification", "An order can be declined where fulfilment is not possible"] },
      { title: "Responsibility and support", description: "Contact support promptly when you believe storefront or order information is incorrect.", items: ["Keep relevant records and references", "Follow return and cancellation instructions", "Applicable law may provide additional rights"] },
    ]}
    notice="Merchant-specific terms, invoices and checkout disclosures take priority where they provide more precise conditions."
    primaryAction={{ label: "Browse catalogue", href: "/category" }}
    secondaryAction={{ label: "Ask a question", href: "/contact" }}
  />;
}
