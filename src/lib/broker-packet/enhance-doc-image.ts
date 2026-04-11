/**
 * Auto-enhance scanned uploads for broker readability: grayscale + contrast + sharpen.
 * Returns PNG bytes for embedding with pdf-lib `embedPng`.
 */
export async function enhanceBrokerDocRasterToPng(buf: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buf)
      .rotate()
      .grayscale()
      .normalize()
      .linear(1.18, -18)
      .sharpen({ sigma: 0.65, m1: 0.8, m2: 3.0, x1: 3, y2: 15, y3: 15 })
      .png({ compressionLevel: 7, effort: 4 })
      .toBuffer();
  } catch {
    return buf;
  }
}
