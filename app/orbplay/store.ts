// Lưu cấu hình OrbPlay (chỉ chạy trên server). Có Upstash Redis / Vercel KV thì lưu ở đó,
// không thì ghi file .data/orbplay.json: chạy local hay server có ổ ghi được thì ổn, Vercel thì phải có KV.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG, sanitizeConfig, type OrbPlayConfig } from "./config";

const KEY = "orbplay:config";
const FILE = path.join(process.cwd(), ".data", "orbplay.json");

const redis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), headers: { Authorization: `Bearer ${token}` } } : null;
};

// strict: đọc lỗi thì ném ra thay vì trả mặc định, để trang admin không lưu đè dữ liệu thật bằng mặc định
export async function loadConfig(strict = false): Promise<OrbPlayConfig> {
  try {
    const r = redis();
    if (r) {
      const res = await fetch(`${r.url}/get/${KEY}`, { headers: r.headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`KV get ${res.status}`);
      const { result } = (await res.json()) as { result: string | null };
      return sanitizeConfig(result ? JSON.parse(result) : null);
    }
    return sanitizeConfig(JSON.parse(await readFile(FILE, "utf8")));
  } catch (e) {
    // chưa từng lưu thì dùng mặc định; lỗi khác thì log nhưng trang chơi vẫn chạy bằng mặc định
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_CONFIG;
    console.error("OrbPlay loadConfig", e);
    if (strict) throw e;
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(c: OrbPlayConfig) {
  const r = redis();
  if (r) {
    const res = await fetch(`${r.url}/set/${KEY}`, { method: "POST", headers: r.headers, body: JSON.stringify(c), signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`KV set ${res.status}`);
    return;
  }
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(c, null, 2));
}
