import pdfParse from "pdf-parse";

export type CoiScanResult = {
  expiryDate: string | null;
  rawSnippet: string | null;
};

/**
 * Extract text from PDF bytes and scan for insurance-style expiration dates.
 */
export async function scanCoiPdfForExpiry(
  pdfBytes: Buffer
): Promise<CoiScanResult> {
  let text = "";
  try {
    const data = await pdfParse(pdfBytes);
    text = typeof data?.text === "string" ? data.text : "";
  } catch {
    return { expiryDate: null, rawSnippet: null };
  }
  return scanCoiTextForExpiry(text);
}

export function scanCoiTextForExpiry(text: string): CoiScanResult {
  const normalized = text.replace(/\r\n/g, "\n");
  const patterns: RegExp[] = [
    /(?:expiration|expiry)\s*date\s*[:#\-]?\s*([0-1]?\d[\/\-][0-3]?\d[\/\-](?:\d{2}|\d{4}))/gi,
    /(?:effective)\s*date\s*[:#\-]?\s*([0-1]?\d[\/\-][0-3]?\d[\/\-](?:\d{2}|\d{4}))/gi,
    /expires?\s*[:#\-]?\s*([0-1]?\d[\/\-][0-3]?\d[\/\-](?:\d{2}|\d{4}))/gi,
  ];

  let best: string | null = null;
  let snippet: string | null = null;
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalized)) !== null) {
      const iso = parseLooseUsDateToIso(m[1]?.trim());
      if (iso) {
        best = iso;
        snippet = m[0].slice(0, 120);
        break;
      }
    }
    if (best) break;
  }
  return { expiryDate: best, rawSnippet: snippet };
}

function parseLooseUsDateToIso(raw: string): string | null {
  if (!raw) return null;
  const parts = raw.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length < 3) return null;
  let month = Number.parseInt(parts[0] ?? "", 10);
  let day = Number.parseInt(parts[1] ?? "", 10);
  let year = Number.parseInt(parts[2] ?? "", 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year))
    return null;
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

