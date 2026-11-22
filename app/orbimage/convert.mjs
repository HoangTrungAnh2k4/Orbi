export const FORMATS = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
// shortcut: upscale cả ảnh 1 lần, ảnh to hơn thì tràn RAM/treo tab, cần ảnh lớn thì làm chia tile
export const MAX_SIDE = {
  upscale: 512, // Swin2SR trên iGPU: 256×192 mất ~26s, 1024px sẽ ~9 phút
  removebg: 4096, // worker giữ vài bản RGBA full size, ảnh 48MP điện thoại là ~600MB+
};

export const outName = (name, suffix, ext) => `${name.replace(/\.[^.]+$/, "") || "image"}${suffix}.${ext}`;

export const tooBig = (w, h, max) => Math.max(w, h) > max;

// pixel trong suốt hẳn có RGB = 0 (đen); loang màu từ pixel kế bên vào để model không kéo viền đen vào mép vật.
// BFS: mỗi pixel trong suốt lấy trung bình các pixel kế bên đã có màu, theo thứ tự gần mép trước.
export function bleed({ data: d, width: w, height: h }) {
  const n = w * h;
  const filled = new Uint8Array(n);
  const queued = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  const neighbors = (i, f) => {
    const x = i % w;
    if (x > 0) f(i - 1);
    if (x < w - 1) f(i + 1);
    if (i >= w) f(i - w);
    if (i < n - w) f(i + w);
  };
  for (let i = 0; i < n; i++) if (d[i * 4 + 3]) filled[i] = 1;
  for (let i = 0; i < n; i++) {
    if (!filled[i]) continue;
    neighbors(i, (j) => { if (!filled[j] && !queued[j]) { queued[j] = 1; queue[tail++] = j; } });
  }
  while (head < tail) {
    const i = queue[head++];
    let r = 0, g = 0, b = 0, c = 0;
    neighbors(i, (j) => { if (filled[j]) { r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; c++; } });
    d[i * 4] = r / c; d[i * 4 + 1] = g / c; d[i * 4 + 2] = b / c;
    filled[i] = 1;
    neighbors(i, (j) => { if (!filled[j] && !queued[j]) { queued[j] = 1; queue[tail++] = j; } });
  }
}

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
