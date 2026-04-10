"use client";

import { useEffect, useRef } from "react";

type Props = { slug: string };

export function ResourceViewBeacon({ slug }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/public/resources/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event: "view" }),
    }).catch(() => {});
  }, [slug]);

  return null;
}
