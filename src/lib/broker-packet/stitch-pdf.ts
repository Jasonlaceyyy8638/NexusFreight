import { PDFDocument } from "pdf-lib";
import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import { BROKER_DOC_CATEGORIES } from "@/lib/broker-packet/categories";

export type StitchInput = {
  category: BrokerDocCategory;
  bytes: Buffer;
  filename: string;
};

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString() === "%PDF-";
}

function extLower(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * Merge documents in canonical broker-packet order into one PDF.
 * Typical packet: operating authority (MC letter), W-9, COI, then optional
 * safety SMS, carrier profile, voided check, notice of assignment.
 */
export async function stitchBrokerPacketPdf(
  items: StitchInput[]
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const byCat = new Map(items.map((i) => [i.category, i]));

  for (const cat of BROKER_DOC_CATEGORIES) {
    const item = byCat.get(cat);
    if (!item) continue;
    const { bytes, filename } = item;
    if (isPdfBuffer(bytes)) {
      const src = await PDFDocument.load(bytes);
      const idx = src.getPageIndices();
      const copied = await out.copyPages(src, idx);
      copied.forEach((p) => out.addPage(p));
      continue;
    }
    const ext = extLower(filename);
    if (ext === "jpg" || ext === "jpeg") {
      const img = await out.embedJpg(bytes);
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
      continue;
    }
    if (ext === "png") {
      const img = await out.embedPng(bytes);
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
      continue;
    }
    // Unsupported type: skip (or add blank page with note — skip for MVP)
  }

  const pages = out.getPageCount();
  if (pages === 0) {
    const p = out.addPage([612, 792]);
    p.drawText("No documents could be merged. Upload PDF or JPG/PNG files.", {
      x: 50,
      y: 750,
      size: 12,
    });
  }

  return out.save();
}
