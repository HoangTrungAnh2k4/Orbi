// Giới hạn số request trong một khung thời gian cố định, theo key (thường là IP).
// shortcut: lưu trong RAM, mỗi instance serverless đếm riêng và restart là reset; cần chặt hơn thì chuyển sang Redis/KV
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k); // dọn để map không phình mãi
  const h = hits.get(key);
  if (!h || h.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  return ++h.count <= max;
}

// IP thật nằm ở phần tử đầu x-forwarded-for khi chạy sau proxy ghi đè header (Vercel, Nginx...).
// Không có proxy thì client giả được header này, nên route nào tốn tiền cũng phải có thêm trần chung (key "global").
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
