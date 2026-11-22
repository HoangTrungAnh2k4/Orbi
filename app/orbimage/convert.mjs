export const FORMATS = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
// shortcut: upscale cả ảnh 1 lần, ảnh to hơn thì tràn RAM/treo tab, cần ảnh lớn thì làm chia tile
export const MAX_UPSCALE_SIDE = 512; // Swin2SR trên iGPU: 256×192 mất ~26s, 1024px sẽ ~9 phút

export const outName = (name, suffix, ext) => `${name.replace(/\.[^.]+$/, "") || "image"}${suffix}.${ext}`;

export const tooBigToUpscale = (w, h) => Math.max(w, h) > MAX_UPSCALE_SIDE;

// vẽ ảnh lên canvas rồi encode lại; JPEG không có alpha nên đổ nền trắng
export async function convert(blob, format, quality) {
  const img = await createImageBitmap(blob);
  const c = new OffscreenCanvas(img.width, img.height);
  const ctx = c.getContext("2d");
  if (format === "jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0);
  img.close();
  const out = await c.convertToBlob({ type: FORMATS[format], quality });
  // trình duyệt không encode được định dạng đó (vd Safari với WebP) sẽ lặng lẽ trả PNG
  if (out.type !== FORMATS[format]) throw new Error(`Trình duyệt này không xuất được ${format.toUpperCase()}.`);
  return out;
}
