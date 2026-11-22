// Gọi Gemini dùng chung cho mọi tool. Chỉ gọi từ server (route handler):
// GEMINI_API_KEY không có tiền tố NEXT_PUBLIC_ nên không bao giờ lọt xuống client.
const API = "https://generativelanguage.googleapis.com/v1beta/models";

// Thử lần lượt; Flash-Lite trước vì free tier cho 500 request/ngày, Flash chỉ 20
export const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"];

// shortcut: nghỉ cố định 60s sau khi bị limit (không đọc retryDelay), nằm trong RAM nên restart server là quên
const COOLDOWN = 60_000;
const TIMEOUT = 10_000; // mỗi model; treo thì bỏ qua thử model kế
const blockedUntil = new Map<string, number>();

type GeminiRes = { candidates?: { content?: { parts?: { text?: string }[] } }[] };
type Opts = { models?: string[]; temperature?: number; fetcher?: typeof fetch };

export async function gemini(prompt: string, { models = GEMINI_MODELS, temperature = 1, fetcher = fetch }: Opts = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Thiếu GEMINI_API_KEY trong .env.local");
  // model đang nghỉ thì để cuối, vẫn thử nếu mọi model khác đều hỏng
  const order = [...models].sort((a, b) => Number((blockedUntil.get(a) ?? 0) > Date.now()) - Number((blockedUntil.get(b) ?? 0) > Date.now()));
  const errors: string[] = [];
  for (const model of order) {
    // lỗi gì cũng thử model kế: 4xx có thể chỉ riêng model đó (tier, bị gỡ), key sai thì cũng chỉ tốn vài request hỏng
    try {
      const res = await fetcher(`${API}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature } }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) {
        if (res.status === 429) blockedUntil.set(model, Date.now() + COOLDOWN);
        errors.push(`${model}: ${res.status} ${await res.text()}`);
        continue;
      }
      const data = (await res.json()) as GeminiRes;
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) return text;
      errors.push(`${model}: rỗng`);
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`Gemini lỗi:\n${errors.join("\n")}`);
}
