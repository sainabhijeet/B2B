import type { Metadata } from "next";
import StorefrontInformationPage from "@/components/StorefrontInformationPage";

export const metadata: Metadata = { title: "Cookie Policy", description: "How cookies support storefront functionality and preferences." };

export default function CookiesPage() {
  return <StorefrontInformationPage
    pageVariant="cookies"
    eyebrow="Cookie policy"
    title="How browser storage helps the storefront work."
    introduction="Cookies and similar browser storage can support sign-in, cart continuity, security and preferences. Available controls depend on the services enabled for this storefront."
    sections={[
      { title: "Essential storage", description: "Some storage is needed for core storefront features and security.", items: ["Maintain sign-in and session state", "Keep cart or storefront context", "Protect requests and reduce misuse"] },
      { title: "Preference storage", description: "Preferences can help remember choices such as language or display settings.", items: ["Improve continuity between visits", "Avoid asking for the same choice repeatedly", "Can usually be removed through browser settings"] },
      { title: "Measurement", description: "Where enabled, limited measurement may help understand performance and improve journeys.", items: ["Identify technical problems", "Understand broad usage patterns", "Evaluate changes to storefront navigation"] },
      { title: "Managing cookies", description: "Your browser provides controls to inspect, block or remove stored information.", items: ["Blocking essential storage may affect features", "Removing storage can sign you out", "Review browser help for device-specific steps"] },
    ]}
    notice="If a consent control is displayed, use it for the choices offered by this storefront. Browser controls remain available separately."
    primaryAction={{ label: "Return home", href: "/" }}
    secondaryAction={{ label: "Ask about privacy", href: "/contact" }}
  />;
}
