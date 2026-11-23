"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuEye, LuRotateCcw, LuSave } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { DEFAULT_CONFIG, GAMES, LIMITS, MEMORY_LEVELS, type OrbPlayConfig } from "../config";
import { expandPrizes, parseEntries } from "../random";
import { parseWords } from "../scramble";
import { parseEmoji } from "../emoji";
import { display } from "../fonts";

const PASS_KEY = "orbplay-admin-pass";
const field = "w-full rounded-lg border bg-background p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Status = { kind: "idle" | "saving" | "ok" | "error"; msg: string };

// loadError: server đọc cấu hình lỗi, form đang là mặc định nên khóa lưu kẻo đè mất dữ liệu thật
export function AdminForm({ initial, loadError = false }: { initial: OrbPlayConfig; loadError?: boolean }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", msg: "" });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  // nhớ mật khẩu trong tab này cho đỡ gõ lại, đóng tab là quên
  useEffect(() => {
    try { setPass(sessionStorage.getItem(PASS_KEY) ?? ""); } catch { /* trình duyệt chặn storage thì gõ lại */ }
  }, []);

  const set = <K extends keyof OrbPlayConfig>(k: K, v: OrbPlayConfig[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => Number(v); // server kẹp lại theo LIMITS, ở đây chỉ đổi kiểu

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "saving", msg: "Đang lưu…" });
    try {
      const res = await fetch("/orbplay/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-password": pass },
        body: JSON.stringify(form),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data && typeof data === "object" && "error" in data ? String(data.error) : `Lỗi ${res.status}`;
        return setStatus({ kind: "error", msg });
      }
      const next = data as OrbPlayConfig;
      setForm(next);
      setSaved(next);
      try { sessionStorage.setItem(PASS_KEY, pass); } catch { /* bỏ qua */ }
      setStatus({ kind: "ok", msg: `Đã lưu lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Người chơi tải lại trang là thấy.` });
    } catch {
      setStatus({ kind: "error", msg: "Không gọi được server, kiểm tra mạng rồi thử lại." });
    }
  };

  const people = parseEntries(form.people).length;
  const prizes = expandPrizes(form.prizes).length;
  const words = parseWords(form.words).length;
  const emojis = parseEmoji(form.emojis).length;

  return (
    <main data-tool="orbplay" data-dark className={`${display.variable} mx-auto min-h-dvh max-w-3xl px-4 pt-8 pb-32`}>
      <header className="flex items-center gap-4">
        <Link href="/orbplay" className="font-display text-3xl font-extrabold tracking-tight">
          Orb<span className="text-primary">Play</span>
        </Link>
        <Link href="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground">← Orbi</Link>
      </header>

      <h1 className="mt-8 font-display text-4xl font-bold">Cài đặt cho ban tổ chức</h1>
      <p className="mt-1 text-muted-foreground">Lưu xong là áp dụng cho mọi máy mở OrbPlay.</p>
      {loadError && (
        <p role="alert" className="mt-4 rounded-xl border border-destructive bg-card p-4 text-destructive">
          Không đọc được cấu hình đang lưu trên server, form dưới đây chỉ là mặc định. Đã khóa nút lưu để khỏi đè mất dữ liệu cũ, tải lại trang sau ít phút.
        </p>
      )}

      <form onSubmit={save} className="mt-8 flex flex-col gap-6">
        <Section title="Trò chơi" desc="Tắt trò nào thì tab đó biến khỏi trang chơi.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GAMES.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <input type="checkbox" className="size-4 accent-primary" checked={form.enabled[id]} onChange={(e) => set("enabled", { ...form.enabled, [id]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-2 rounded-lg bg-background px-3 py-2">
            <input type="checkbox" className="mt-1 size-4 accent-primary" checked={form.locked} onChange={(e) => set("locked", e.target.checked)} />
            <span>
              Khóa danh sách
              <span className="block text-sm text-muted-foreground">Người chơi chỉ xem được danh sách người và quà, không sửa được. Bộ từ khóa và câu đố emoji bị ẩn để khỏi lộ đáp án.</span>
            </span>
          </label>
        </Section>

        <Section title="Nội dung" desc="Mỗi dòng một mục.">
          <Area id="people" label="Danh sách người (vòng quay, bốc thăm)" count={`${people} người`} value={form.people} onChange={(v) => set("people", v)} />
          <Area id="prizes" label="Quà lì xì, thêm “x3” ở cuối để nhét 3 bao giống nhau" count={`${prizes} bao`} value={form.prizes} onChange={(v) => set("prizes", v)} />
          <Area id="words" label="Bộ từ khóa Giải mã, dạng “TỪ KHÓA - gợi ý”" count={`${words} từ`} value={form.words} onChange={(v) => set("words", v)} />
          <Area id="emojis" label="Câu đố Đoán emoji, dạng “🎓📚💡 - đáp án”" count={`${emojis} câu`} value={form.emojis} onChange={(v) => set("emojis", v)} />
        </Section>

        <Section title="Thông số chơi">
          <div className="grid gap-4 sm:grid-cols-2">
            <Num label="Bốc thăm: đếm ngược (giây)" range={LIMITS.countFrom} value={form.draw.countFrom} onChange={(v) => set("draw", { countFrom: num(v) })} />
            <div>
              <p className="text-sm text-muted-foreground">Lật thẻ: độ khó mặc định</p>
              <div role="group" aria-label="Độ khó mặc định" className="mt-1 grid grid-cols-3 gap-2">
                {MEMORY_LEVELS.map((l) => (
                  <Button key={l.pairs} type="button" variant={form.memory.pairs === l.pairs ? "default" : "outline"} aria-pressed={form.memory.pairs === l.pairs} onClick={() => set("memory", { pairs: l.pairs })} className="h-11">
                    {l.label}
                  </Button>
                ))}
              </div>
            </div>
            <Num label="Giải mã: số vòng" range={LIMITS.rounds} value={form.word.rounds} onChange={(v) => set("word", { ...form.word, rounds: num(v) })} />
            <Num label="Giải mã: giây mỗi vòng" range={LIMITS.wordSeconds} value={form.word.seconds} onChange={(v) => set("word", { ...form.word, seconds: num(v) })} />
            <Num label="Khác biệt: tổng thời gian (giây)" range={LIMITS.oddSeconds} value={form.odd.seconds} onChange={(v) => set("odd", { ...form.odd, seconds: num(v) })} />
            <Num label="Khác biệt: bấm sai trừ (giây)" range={LIMITS.penalty} value={form.odd.penalty} onChange={(v) => set("odd", { ...form.odd, penalty: num(v) })} />
            <Num label="Đoán emoji: số câu" range={LIMITS.rounds} value={form.emoji.rounds} onChange={(v) => set("emoji", { ...form.emoji, rounds: num(v) })} />
            <Num label="Đoán emoji: giây mỗi câu" range={LIMITS.emojiSeconds} value={form.emoji.seconds} onChange={(v) => set("emoji", { ...form.emoji, seconds: num(v) })} />
          </div>
        </Section>

        {/* màn rộng thì thanh lưu dính đáy cho khỏi cuộn; điện thoại thấp quá, dính sẽ che form */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-lg sm:sticky sm:bottom-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
            Mật khẩu admin
            <input type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} className={`h-11 ${field}`} />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="lg" className="h-11" onClick={() => setForm(DEFAULT_CONFIG)}>
              <LuRotateCcw aria-hidden /> Về mặc định
            </Button>
            <Button type="submit" size="lg" className="h-11 flex-1 px-6 font-display text-lg font-bold" disabled={loadError || status.kind === "saving" || !dirty}>
              <LuSave aria-hidden /> {status.kind === "saving" ? "Đang lưu…" : "Lưu cấu hình"}
            </Button>
          </div>
        </div>
        <p role="status" className={`-mt-3 text-sm ${status.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {status.msg || (dirty ? "Có thay đổi chưa lưu." : "Chưa có thay đổi.")}
        </p>
        <Link href="/orbplay" className="inline-flex items-center gap-2 self-start text-primary underline-offset-4 hover:underline">
          <LuEye aria-hidden /> Xem trang chơi
        </Link>
      </form>
    </main>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-card p-4">
      <legend className="px-1 font-display text-2xl font-bold">{title}</legend>
      {desc && <p className="mb-3 text-sm text-muted-foreground">{desc}</p>}
      {children}
    </fieldset>
  );
}

function Area({ id, label, count, value, onChange }: { id: string; label: string; count: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
        <span className="shrink-0 text-sm text-muted-foreground">{count}</span>
      </div>
      <textarea id={id} rows={8} value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 resize-y ${field}`} />
    </div>
  );
}

function Num({ label, range: [min, max], value, onChange }: { label: string; range: readonly [number, number]; value: number; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      {label}
      <input type="number" required min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className={`h-11 ${field} text-foreground`} />
      <span className="text-xs">Từ {min} đến {max}</span>
    </label>
  );
}
