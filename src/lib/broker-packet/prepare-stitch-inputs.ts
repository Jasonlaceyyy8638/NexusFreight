import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import { BROKER_DOC_CATEGORIES } from "@/lib/broker-packet/categories";
import { enhanceBrokerDocRasterToPng } from "@/lib/broker-packet/enhance-doc-image";
import { isPdfBuffer, type StitchInput } from "@/lib/broker-packet/stitch-pdf";

function isPngBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

type Row = {
  doc_category: BrokerDocCategory;
  storage_path: string;
  original_filename: string | null;
};

/** Download vault files, auto-enhance rasters for broker readability, preserve PDFs. */
export async function prepareBrokerPacketStitchInputs(
  admin: SupabaseClient,
  rows: Row[]
): Promise<StitchInput[]> {
  const order = new Map(BROKER_DOC_CATEGORIES.map((c, i) => [c, i] as const));
  const sorted = [...rows].sort(
    (a, b) =>
      (order.get(a.doc_category) ?? 99) - (order.get(b.doc_category) ?? 99)
  );

  const inputs: StitchInput[] = [];

  for (const r of sorted) {
    const { data: file, error: dlErr } = await admin.storage
      .from("broker_packet_docs")
      .download(r.storage_path);
    if (dlErr || !file) continue;

    let buf = Buffer.from(await file.arrayBuffer());
    const original_filename = r.original_filename ?? "file.pdf";
    let embedAsPng = false;

    if (!isPdfBuffer(buf)) {
      try {
        const enhanced = await enhanceBrokerDocRasterToPng(buf);
        if (isPngBuffer(enhanced) && enhanced.length > 0) {
          buf = Buffer.from(enhanced);
          embedAsPng = true;
        }
      } catch {
        /* keep original */
      }
    }

    inputs.push({
      category: r.doc_category,
      bytes: buf,
      filename: original_filename,
      embedAsPng,
    });
  }

  return inputs;
}
