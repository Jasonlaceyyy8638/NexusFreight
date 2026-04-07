import Script from "next/script";

/** Production Crisp website — override with NEXT_PUBLIC_CRISP_WEBSITE_ID if needed. */
export const CRISP_WEBSITE_ID = "9ab77cbf-76b3-46db-8506-385294ec79ef";

/**
 * Crisp chat (https://crisp.chat). Loaded with `afterInteractive` so it does not block FCP.
 */
export function CrispChatScript() {
  const websiteId =
    process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || CRISP_WEBSITE_ID;

  return (
    <Script
      id="crisp-chat"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
window.$crisp=[];
window.CRISP_WEBSITE_ID=${JSON.stringify(websiteId)};
(function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
`,
      }}
    />
  );
}
