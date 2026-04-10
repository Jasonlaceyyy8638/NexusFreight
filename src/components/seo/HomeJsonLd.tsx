import { getSiteUrl } from "@/lib/site-url";

/**
 * schema.org structured data for the homepage — helps Google understand the product.
 */
export function HomeJsonLd() {
  const url = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: "NexusFreight",
        url,
        description:
          "Dispatch and carrier fleet software: ELD integration, driver dispatch, and settlements for freight operators.",
        logo: `${url}/nexusfreight-logo-v2.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: "NexusFreight",
        publisher: { "@id": `${url}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#software`,
        name: "NexusFreight",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url,
        description:
          "Built for dispatchers and carrier fleets: ELD-aware dispatch, driver comms, settlements, and compliance workflows.",
        offers: {
          "@type": "Offer",
          price: "125",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
