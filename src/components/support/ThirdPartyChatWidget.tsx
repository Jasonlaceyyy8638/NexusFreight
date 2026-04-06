"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

/**
 * Client-only third-party chat. Set one env var — never both at once unless you intend to.
 *
 * Crisp: https://help.crisp.chat/en/article/how-to-install-crisp-on-your-website-1ylqx1s/
 *   NEXT_PUBLIC_CRISP_WEBSITE_ID=your-website-uuid
 *
 * Intercom: https://developers.intercom.com/installing-intercom/docs/basic-javascript
 *   NEXT_PUBLIC_INTERCOM_APP_ID=your_app_id
 */
export function ThirdPartyChatWidget() {
  useEffect(() => {
    const crispId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (crispId) {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = crispId;
      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      document.head.appendChild(script);
      return () => {
        script.remove();
        delete window.$crisp;
        delete window.CRISP_WEBSITE_ID;
      };
    }

    const intercomAppId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;
    if (intercomAppId) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://widget.intercom.io/widget/${intercomAppId}`;
      document.head.appendChild(script);
      return () => {
        script.remove();
      };
    }

    /*
     * Manual fallback (no env): paste vendor snippet inside this effect, e.g.
     * window.$crisp = []; window.CRISP_WEBSITE_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
     * then append https://client.crisp.chat/l.js as above.
     */
  }, []);

  return null;
}
