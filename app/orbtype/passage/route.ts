import { gemini } from "@/lib/gemini";
import { clientIp, rateLimit, refund } from "@/lib/rateLimit";
import { cleanPassage, passagePrompt } from "../passage";

export const maxDuration = 60; // tệ nhất 4 model × 10s, host serverless mặc định có thể cắt sớm hơn

// GET /orbtype/passage?lang=vi&n=300 → { words: string[] }
export async function GET(req: Request) {
  // route public: chặn spam đốt quota Gemini. Theo IP trước (spammer không ăn vào phần chung),
  // rồi trần chung cho cả route vì quota tính theo key (Flash-Lite free 15 request/phút)
  const ip = clientIp(req);
  const limited = () => Response.json({ error: "Gọi quá nhanh, thử lại sau 1 phút" }, { status: 429 });
  if (!rateLimit(ip, 6, 60_000)) return limited();
  // trần chung đầy thì trả lượt cho IP, người dùng thật không bị phạt thêm vì người khác spam
  if (!rateLimit("global", 12, 60_000)) { refund(ip); return limited(); }
  const q = new URL(req.url).searchParams;
  const lang = q.get("lang") === "en" ? "en" : "vi";
  const n = Math.min(300, Math.max(10, Number(q.get("n")) || 50));
  try {
    return Response.json({ words: cleanPassage(await gemini(passagePrompt(lang, n), { signal: req.signal })) });
  } catch (e) {
    if (!req.signal.aborted) console.error(e);
    return Response.json({ error: "Không tạo được đoạn văn" }, { status: 502 });
  }
}
