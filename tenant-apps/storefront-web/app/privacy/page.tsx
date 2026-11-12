import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Privacy Policy", description: "How storefront information is used and protected." };

export default function PrivacyPage() {
  return <StorefrontInformationPage
    pageVariant="privacy"
    eyebrow="Privacy policy"
    title="How information supports your storefront experience."
    introduction="This overview explains the common categories of information used to operate accounts, enquiries and orders. Store-specific notices and applicable law govern the final privacy terms."
    sections={[
      { title: "Information you provide", description: "Information is collected when you create an account, place an order or contact support.", items: ["Name and business contact details", "Billing and delivery information", "Enquiry, account and order information"] },
      { title: "How information is used", description: "Information supports the services you request and the safe operation of the storefront.", items: ["Process and communicate about orders", "Provide customer and buyer support", "Maintain security and prevent misuse"] },
      { title: "Service providers", description: "Necessary information may be handled by providers that support fulfilment, payments, hosting or communications.", items: ["Access should be limited to the relevant service", "Providers may have their own legal obligations", "Information may be retained where required by law"] },
      { title: "Your choices", description: "You can contact support regarding account information or a privacy question.", items: ["Request correction of inaccurate details", "Ask about available account controls", "Manage cookies using browser or available consent tools"] },
    ]}
    notice="This page is a storefront summary and is not a substitute for merchant-specific legal advice or a jurisdiction-specific privacy notice."
    primaryAction={{ label: "My account", href: "/account" }}
    secondaryAction={{ label: "Privacy question", href: "/contact" }}
  />;
}
