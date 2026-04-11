import type { PDFEmbeddedPage, PDFImage } from "pdf-lib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import { BROKER_DOC_CATEGORIES } from "@/lib/broker-packet/categories";

export type StitchInput = {
  category: BrokerDocCategory;
  bytes: Buffer;
  filename: string;
  /** Set when bytes are PNG from the auto-enhance pipeline (pdf-lib cannot embed WebP). */
  embedAsPng?: boolean;
};

export type BrokerPacketCoverMeta = {
  carrierName: string;
  mcNumber: string | null;
  dotNumber: string | null;
  dispatcherName: string;
  dispatcherPhone: string;
  dispatcherEmail: string;
};

/** US Letter (8.5" × 11") in PDF points. */
export const LETTER_WIDTH = 612;
export const LETTER_HEIGHT = 792;

const MARGIN_X = 42;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 46;

export function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString() === "%PDF-";
}

function extLower(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isPngBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

async function drawCoverPage(
  doc: PDFDocument,
  cover: BrokerPacketCoverMeta
): Promise<void> {
  const page = doc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  const { width, height } = page.getSize();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: height - 56,
    width,
    height: 56,
    color: rgb(0.02, 0.35, 0.72),
  });
  page.drawText("NexusFreight", {
    x: 48,
    y: height - 38,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Broker setup packet", {
    x: 48,
    y: height - 52,
    size: 9,
    font,
    color: rgb(0.85, 0.9, 0.96),
  });

  const mcLine = cover.mcNumber?.trim()
    ? `MC ${cover.mcNumber.trim()}`
    : "MC —";
  const dotLine = cover.dotNumber?.trim()
    ? `DOT ${cover.dotNumber.trim()}`
    : "DOT —";

  page.drawText(cover.carrierName, {
    x: 48,
    y: height - 118,
    size: 22,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.12),
    maxWidth: width - 96,
    lineHeight: 26,
  });

  page.drawText(mcLine, {
    x: 48,
    y: height - 150,
    size: 13,
    font,
    color: rgb(0.22, 0.27, 0.32),
  });
  page.drawText(dotLine, {
    x: 48,
    y: height - 172,
    size: 13,
    font,
    color: rgb(0.22, 0.27, 0.32),
  });

  const badgeW = 248;
  const badgeH = 46;
  const bx = (width - badgeW) / 2;
  const by = height / 2 - badgeH / 2;
  page.drawRectangle({
    x: bx,
    y: by,
    width: badgeW,
    height: badgeH,
    color: rgb(0.05, 0.52, 0.36),
    borderColor: rgb(0.02, 0.38, 0.26),
    borderWidth: 1,
  });
  page.drawText("Ready for Dispatch", {
    x: bx + 28,
    y: by + 15,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Submitted by", {
    x: 48,
    y: 168,
    size: 10,
    font,
    color: rgb(0.4, 0.44, 0.48),
  });
  page.drawText(cover.dispatcherName, {
    x: 48,
    y: 138,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.15),
    maxWidth: width - 96,
  });
  page.drawText(`Phone: ${cover.dispatcherPhone}`, {
    x: 48,
    y: 112,
    size: 11,
    font,
    color: rgb(0.22, 0.26, 0.3),
    maxWidth: width - 96,
  });
  page.drawText(`Email: ${cover.dispatcherEmail}`, {
    x: 48,
    y: 88,
    size: 11,
    font,
    color: rgb(0.22, 0.26, 0.3),
    maxWidth: width - 96,
  });

  page.drawLine({
    start: { x: 48, y: height - 198 },
    end: { x: width - 48, y: height - 198 },
    thickness: 0.75,
    color: rgb(0.85, 0.87, 0.9),
  });
}

async function addImagePageLetter(
  doc: PDFDocument,
  bytes: Buffer,
  opts: { preferPng: boolean; filename: string }
): Promise<boolean> {
  const availW = LETTER_WIDTH - 2 * MARGIN_X;
  const availH = LETTER_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  let img: PDFImage | null = null;
  if (opts.preferPng || isPngBuffer(bytes)) {
    try {
      img = await doc.embedPng(bytes);
    } catch {
      img = null;
    }
  }
  if (!img) {
    const ext = extLower(opts.filename);
    if (ext === "jpg" || ext === "jpeg") {
      try {
        img = await doc.embedJpg(bytes);
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }

  let w = img.width;
  let h = img.height;
  const scale = Math.min(1, availW / w, availH / h);
  w *= scale;
  h *= scale;
  const page = doc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  const x = MARGIN_X + (availW - w) / 2;
  const y = MARGIN_BOTTOM + (availH - h) / 2;
  page.drawImage(img, { x, y, width: w, height: h });
  return true;
}

/**
 * Append each page of a donor PDF onto US Letter pages, scaled to fit
 * (preserves aspect ratio, nothing clipped).
 */
async function appendPdfBytesScaledToLetter(
  doc: PDFDocument,
  bytes: Buffer
): Promise<void> {
  const embedded: PDFEmbeddedPage[] = await doc.embedPdf(bytes);
  const availW = LETTER_WIDTH - 2 * MARGIN_X;
  const availH = LETTER_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  for (const ep of embedded) {
    const scale = Math.min(
      1,
      availW / ep.width,
      availH / ep.height
    );
    const dims = ep.scale(scale);
    const page = doc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
    const x = MARGIN_X + (availW - dims.width) / 2;
    const y = MARGIN_BOTTOM + (availH - dims.height) / 2;
    page.drawPage(ep, {
      ...dims,
      x,
      y,
    });
  }
}

async function drawPageNumbers(doc: PDFDocument): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  if (total === 0) return;
  const labelColor = rgb(0.38, 0.41, 0.45);
  for (let i = 0; i < total; i++) {
    const p = pages[i];
    const label = `Page ${i + 1} of ${total}`;
    const size = 9;
    const w = font.widthOfTextAtSize(label, size);
    const pw = p.getWidth();
    p.drawText(label, {
      x: (pw - w) / 2,
      y: 20,
      size,
      font,
      color: labelColor,
    });
  }
}

/**
 * Merge vault documents (PDF and raster) in canonical order into one Letter PDF.
 * Optional cover: NexusFreight branding, carrier MC/DOT/name, dispatcher contact.
 * All body pages are US Letter; images and multi-page PDFs are scaled to fit with margins.
 * Page numbers are drawn on every page after merge.
 */
export async function stitchBrokerPacketPdf(
  items: StitchInput[],
  cover?: BrokerPacketCoverMeta | null
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  if (cover) {
    await drawCoverPage(out, cover);
  }

  const byCat = new Map(items.map((i) => [i.category, i]));

  for (const cat of BROKER_DOC_CATEGORIES) {
    const item = byCat.get(cat);
    if (!item) continue;
    const { bytes, filename, embedAsPng } = item;
    if (isPdfBuffer(bytes)) {
      await appendPdfBytesScaledToLetter(out, bytes);
      continue;
    }
    const ok = await addImagePageLetter(out, bytes, {
      preferPng: Boolean(embedAsPng),
      filename,
    });
    if (!ok) {
      /* unsupported raster — skip */
    }
  }

  const pages = out.getPageCount();
  if (pages === 0) {
    const p = out.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
    p.drawText("No documents could be merged. Upload PDF or JPG/PNG files.", {
      x: 50,
      y: 750,
      size: 12,
    });
  }

  await drawPageNumbers(out);

  return out.save();
}
