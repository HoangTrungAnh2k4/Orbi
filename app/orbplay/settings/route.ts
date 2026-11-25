import { createHash, timingSafeEqual } from "node:crypto";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { forPlayers, sanitizeConfig } from "../config";
import { loadConfig, saveConfig } from "../store";

export const dynamic = "force-dynamic";

// so mật khẩu theo thời gian hằng, băm trước để độ dài khác nhau cũng không lộ qua thời gian
const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

// GET /orbplay/settings → cấu hình hiện tại (public; khóa thì bỏ phiếu đấu giá)
export async function GET() {
  return Response.json(forPlayers(await loadConfig()), { headers: { "Cache-Control": "no-store" } });
}

// PUT /orbplay/settings, header x-admin-password, body là OrbPlayConfig → lưu và trả lại bản đã làm sạch
export async function PUT(req: Request) {
  const pass = process.env.ORBPLAY_ADMIN_PASSWORD;
  if (!pass) return Response.json({ error: "Server chưa đặt ORBPLAY_ADMIN_PASSWORD" }, { status: 503 });
  // chặn dò mật khẩu: 10 lần/phút mỗi IP
  if (!rateLimit(`orbplay-admin:${clientIp(req)}`, 10, 60_000)) return Response.json({ error: "Thử quá nhiều lần, đợi 1 phút" }, { status: 429 });
  if (!same(req.headers.get("x-admin-password") ?? "", pass)) return Response.json({ error: "Sai mật khẩu admin" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Dữ liệu gửi lên không phải JSON" }, { status: 400 });
  }
  const config = sanitizeConfig(body);
  try {
    await saveConfig(config);
  } catch (e) {
    console.error("OrbPlay saveConfig", e);
    return Response.json({ error: "Không lưu được. Kiểm tra cấu hình Upstash/KV trên server" }, { status: 503 });
  }
  return Response.json(config);
}
