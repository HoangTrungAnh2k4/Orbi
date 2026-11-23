// Logic random dùng chung cho các mini game. rand trả số trong [0, 1), test truyền rand cố định.
export type Rand = () => number;

// crypto cho công bằng hơn Math.random; 2^32 khả năng là đủ cho danh sách vài nghìn tên
export const cryptoRand: Rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

// mỗi dòng một tên, bỏ dòng trống
export const parseEntries = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);

// "50.000đ x3" → 3 bao "50.000đ"; tối đa max bao cho khỏi treo trang
export function expandPrizes(text: string, max = 500) {
  const out: string[] = [];
  for (const line of parseEntries(text)) {
    const m = line.match(/^(.*\S)\s+[xX×]\s*(\d+)$/); // bắt buộc có cách trước x để "Max5" không thành 5 bao "Ma"
    const [label, n] = m ? [m[1], Number(m[2])] : [line, 1];
    for (let i = 0; i < n && out.length < max; i++) out.push(label);
  }
  return out;
}

// bốc k vị trí khác nhau (Fisher-Yates từng phần), trả index để tên trùng nhau vẫn tính riêng
export function drawIndices(n: number, k: number, rand: Rand = cryptoRand) {
  const idx = Array.from({ length: n }, (_, i) => i);
  const take = Math.min(k, n);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, take);
}

// Vòng quay: ô i chiếm góc [i·s, (i+1)·s] tính từ đỉnh theo chiều kim đồng hồ, kim chỉ ở đỉnh.
// Quay vòng một góc R thì kim chỉ vào góc -R trên vòng.
export const segmentAt = (rot: number, n: number) => Math.floor((((-rot % 360) + 360) % 360) / (360 / n));

// góc quay mới (luôn lớn hơn góc cũ, thêm `turns` vòng) để kim dừng trong ô i, lệch ngẫu nhiên trong ô cho tự nhiên
export function spinTo(current: number, i: number, n: number, turns = 6, rand: Rand = cryptoRand) {
  const s = 360 / n;
  const inSeg = (0.1 + rand() * 0.8) * s; // chừa 10% mép ô để khỏi dừng ngay trên vạch
  const target = (((360 - (i * s + inSeg)) % 360) + 360) % 360;
  const base = current - (((current % 360) + 360) % 360);
  return base + turns * 360 + target;
}
