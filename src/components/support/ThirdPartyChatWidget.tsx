"use client";

import { useEffect } from "react";

/**
 * Optional Intercom (Crisp is loaded globally from `CrispChatScript` in root layout).
 * https://developers.intercom.com/installing-intercom/docs/basic-javascript
 *   NEXT_PUBLIC_INTERCOM_APP_ID=your_app_id
 *
 * Avoid running Crisp + Intercom together unless intentional.
 */
export function ThirdPartyChatWidget() {
  useEffect(() => {
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
  }, []);

  return null;
}
