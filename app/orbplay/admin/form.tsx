"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LuEye, LuRotateCcw, LuSave, LuSlidersHorizontal, LuUndo2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_CONFIG, GAMES, LIMITS, MEMORY_LEVELS, type GameId, type OrbPlayConfig } from "../config";
import { expandPrizes, parseEntries } from "../random";
import { parseWords } from "../scramble";
import { parseEmoji } from "../emoji";
import { parseBids } from "../auction";
import { GAME_ICON } from "../icons";
import { display } from "../fonts";

const PASS_KEY = "orbplay-admin-pass";
const field = "w-full rounded-lg border bg-background p-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Status = { kind: "idle" | "saving" | "ok" | "error"; msg: string };
type Props = { initial: OrbPlayConfig; loadError?: boolean; canSave: boolean };

// loadError: server đọc cấu hình lỗi, form đang là mặc định nên khóa lưu kẻo đè mất dữ liệu thật
// canSave: server đã đặt ORBPLAY_ADMIN_PASSWORD, chưa đặt thì báo ngay thay vì để gõ xong mới lỗi
export function AdminForm({ initial, loadError = false, canSave }: Props) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", msg: "" });
  const [tab, setTab] = useState("general");
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  // nhớ mật khẩu trong tab này cho đỡ gõ lại, đóng tab là quên
  useEffect(() => {
    try { setPass(sessionStorage.getItem(PASS_KEY) ?? ""); } catch { /* trình duyệt chặn storage thì gõ lại */ }
  }, []);

  // đang có thay đổi chưa lưu mà đóng/tải lại trang thì trình duyệt hỏi lại
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

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
      setStatus({ kind: "ok", msg: `Đã lưu lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, người chơi tải lại trang là thấy` });
    } catch {
      setStatus({ kind: "error", msg: "Không gọi được server, kiểm tra mạng rồi thử lại" });
    }
  };

  const people = parseEntries(form.people).length;
  const prizes = expandPrizes(form.prizes).length;
  const words = parseWords(form.words).length;
  const emojis = parseEmoji(form.emojis).length;
  const bids = parseBids(form.bids).bids.length;
  // dòng tóm tắt dưới tên trò ở cột trái, nhìn là biết trò nào đã có nội dung
  const summary: Record<GameId, string> = {
    wheel: `${people} người`,
    draw: `${people} người, đếm ${form.draw.countFrom}s`,
    lixi: `${prizes} bao`,
    memory: MEMORY_LEVELS.find((l) => l.pairs === form.memory.pairs)?.label ?? "",
    word: `${words} từ, ${form.word.rounds} vòng`,
    odd: `${form.odd.seconds} giây`,
    emoji: `${emojis} câu, ${form.emoji.rounds} vòng`,
    auction: `${bids} phiếu`,
  };

  const peopleArea = (
    <Area id="people" label="Danh sách người, mỗi dòng một tên" note="Dùng chung cho Vòng quay và Bốc thăm" count={`${people} người`} value={form.people} onChange={(v) => set("people", v)} />
  );
  const panels: Record<GameId, { desc: string; body: React.ReactNode }> = {
    wheel: { desc: "Quay một vòng, kim dừng ở ai người đó trúng.", body: peopleArea },
    draw: {
      desc: "Đếm ngược rồi bốc một hoặc nhiều người trúng cùng lúc.",
      body: (
        <>
          {peopleArea}
          <Num label="Đếm ngược trước khi bốc (giây)" range={LIMITS.countFrom} value={form.draw.countFrom} onChange={(v) => set("draw", { countFrom: num(v) })} />
        </>
      ),
    },
    lixi: {
      desc: "Xáo quà vào bao lì xì, mỗi người chọn một bao để mở.",
      body: <Area id="prizes" label="Quà trong bao, mỗi dòng một phần quà" note="Thêm “x3” ở cuối dòng để nhét 3 bao giống nhau" count={`${prizes} bao`} value={form.prizes} onChange={(v) => set("prizes", v)} />,
    },
    memory: {
      desc: "Lật thẻ tìm cặp giống nhau, người chơi vẫn đổi được độ khó.",
      body: (
        <div>
          <p className="text-sm text-muted-foreground">Độ khó mở sẵn</p>
          <div role="group" aria-label="Độ khó mở sẵn" className="mt-1 grid max-w-sm grid-cols-3 gap-2">
            {MEMORY_LEVELS.map((l) => (
              <Button key={l.pairs} type="button" variant={form.memory.pairs === l.pairs ? "default" : "outline"} aria-pressed={form.memory.pairs === l.pairs} onClick={() => set("memory", { pairs: l.pairs })} className="h-auto flex-col py-2">
                <span className="font-display text-lg font-bold">{l.label}</span>
                <span className="text-xs opacity-80">{l.pairs} cặp</span>
              </Button>
            ))}
          </div>
        </div>
      ),
    },
    word: {
      desc: "Xáo chữ của từ khóa, đoán đúng trước khi hết giờ.",
      body: (
        <>
          <Area id="words" label="Bộ từ khóa, mỗi dòng “TỪ KHÓA - gợi ý”" note="Có dấu tiếng Việt cũng được, lúc chấm sẽ bỏ dấu" count={`${words} từ`} value={form.words} onChange={(v) => set("words", v)} />
          <Pair>
            <Num label="Số vòng" range={LIMITS.rounds} value={form.word.rounds} onChange={(v) => set("word", { ...form.word, rounds: num(v) })} />
            <Num label="Giây mỗi vòng" range={LIMITS.wordSeconds} value={form.word.seconds} onChange={(v) => set("word", { ...form.word, seconds: num(v) })} />
          </Pair>
        </>
      ),
    },
    odd: {
      desc: "Lưới icon giống nhau có đúng một ô khác, tìm càng nhiều càng tốt.",
      body: (
        <Pair>
          <Num label="Tổng thời gian (giây)" range={LIMITS.oddSeconds} value={form.odd.seconds} onChange={(v) => set("odd", { ...form.odd, seconds: num(v) })} />
          <Num label="Bấm sai bị trừ (giây)" range={LIMITS.penalty} value={form.odd.penalty} onChange={(v) => set("odd", { ...form.odd, penalty: num(v) })} />
        </Pair>
      ),
    },
    emoji: {
      desc: "Nhìn chuỗi emoji, chọn đúng cụm từ trong 4 đáp án.",
      body: (
        <>
          <Area id="emojis" label="Câu đố, mỗi dòng “🎓📚💡 - đáp án”" note="Đáp án sai lấy từ các câu khác nên cần ít nhất 4 câu" count={`${emojis} câu`} value={form.emojis} onChange={(v) => set("emojis", v)} />
          <Pair>
            <Num label="Số câu mỗi ván" range={LIMITS.rounds} value={form.emoji.rounds} onChange={(v) => set("emoji", { ...form.emoji, rounds: num(v) })} />
            <Num label="Giây mỗi câu" range={LIMITS.emojiSeconds} value={form.emoji.seconds} onChange={(v) => set("emoji", { ...form.emoji, seconds: num(v) })} />
          </Pair>
        </>
      ),
    },
    auction: {
      desc: "Ai chọn số nhỏ nhất mà không trùng ai thì thắng.",
      body: (
        <>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            Gói quà
            <input maxLength={200} value={form.auction.prize} onChange={(e) => set("auction", { prize: e.target.value })} className={`h-11 ${field}`} />
          </label>
          <Area id="bids" label="Phiếu, mỗi dòng “Tên - số”" note="Dán thẳng từ sheet kết quả form được, lấy 2 cột cuối là tên và số" count={`${bids} phiếu`} value={form.bids} onChange={(v) => set("bids", v)} />
        </>
      ),
    },
  };

  const on = GAMES.filter((g) => form.enabled[g.id]).length;
  const blocked = loadError || !canSave;

  return (
    <main data-tool="orbplay" data-dark className={`${display.variable} mx-auto min-h-dvh max-w-5xl px-4 pt-8 pb-32`}>
      <header className="flex items-center gap-4">
        <Link href="/orbplay" className="font-display text-3xl font-extrabold tracking-tight">
          Orb<span className="text-primary">Play</span>
        </Link>
        <Link href="/orbplay" className="ml-auto inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
          <LuEye aria-hidden /> Xem trang chơi
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground">← Orbi</Link>
      </header>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Cài đặt cho ban tổ chức</h1>
          <p className="mt-1 text-muted-foreground">Chọn trò bên trái để sửa. Lưu xong, mọi máy tải lại trang là thấy.</p>
        </div>
        <label className="flex w-full flex-col gap-1 text-sm text-muted-foreground sm:w-64">
          Mật khẩu admin
          <input type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} form="admin-form" className={`h-11 ${field}`} />
        </label>
      </div>

      {loadError && (
        <p role="alert" className="mt-4 rounded-xl border border-destructive bg-card p-4 text-destructive">
          Không đọc được cấu hình đang lưu trên server, form dưới đây chỉ là mặc định. Đã khóa nút lưu để khỏi đè mất dữ liệu cũ, tải lại trang sau ít phút.
        </p>
      )}
      {!canSave && (
        <p role="alert" className="mt-4 rounded-xl border border-destructive bg-card p-4 text-destructive">
          Server chưa đặt mật khẩu admin nên chưa lưu được. Thêm biến ORBPLAY_ADMIN_PASSWORD vào .env.local (hoặc Environment Variables trên Vercel) rồi chạy lại server.
        </p>
      )}

      <form id="admin-form" onSubmit={save} className="mt-6">
        <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="flex-col items-stretch gap-4 md:flex-row md:items-start md:gap-6">
          <TabsList aria-label="Trò chơi" className="grid h-auto! w-full grid-cols-3 gap-1 rounded-xl border bg-card p-1.5 md:sticky md:top-6 md:flex md:w-60 md:shrink-0 md:flex-col">
            <Rail value="general" icon={LuSlidersHorizontal} label="Chung" sub={form.locked ? "Đang khóa" : `${on}/${GAMES.length} trò bật`} />
            {GAMES.map(({ id, label }) => (
              <Rail key={id} value={id} icon={GAME_ICON[id]} label={label} sub={form.enabled[id] ? summary[id] : "Đang tắt"} lit={form.enabled[id]} />
            ))}
          </TabsList>

          <TabsContent value="general" className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-base sm:p-6">
            <h2 className="font-display text-3xl font-bold">Chung</h2>
            <Toggle id="locked" checked={form.locked} onChange={(v) => set("locked", v)} label="Khóa danh sách">
              Người chơi chỉ xem danh sách người và quà, không sửa được. Bộ từ khóa, câu đố emoji và phiếu đấu giá bị ẩn để khỏi lộ đáp án.
            </Toggle>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Xóa nội dung đang sửa và điền lại toàn bộ mặc định. Chưa bấm Lưu thì vẫn bấm Bỏ thay đổi được.</p>
              <Button type="button" variant="outline" className="mt-2" onClick={() => setForm(DEFAULT_CONFIG)}>
                <LuRotateCcw aria-hidden /> Điền lại mặc định
              </Button>
            </div>
          </TabsContent>

          {GAMES.map(({ id, label }) => (
            <TabsContent key={id} value={id} className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-base sm:p-6">
              <div>
                <h2 className="font-display text-3xl font-bold">{label}</h2>
                <p className="text-muted-foreground">{panels[id].desc}</p>
              </div>
              <Toggle id={`on-${id}`} checked={form.enabled[id]} onChange={(v) => set("enabled", { ...form.enabled, [id]: v })} label="Hiện trên trang chơi">
                {form.enabled[id] ? "Người chơi thấy tab này." : "Đang ẩn, người chơi không thấy tab này. Nội dung vẫn được giữ."}
              </Toggle>
              {panels[id].body}
            </TabsContent>
          ))}
        </Tabs>

        {/* thanh lưu dính đáy: sửa ở tab nào cũng thấy trạng thái và nút lưu */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
            <p role="status" className={`min-w-0 flex-1 text-sm ${status.kind === "error" ? "text-destructive" : dirty ? "text-foreground" : "text-muted-foreground"}`}>
              {status.kind === "saving" || status.kind === "error" ? status.msg : dirty ? "Có thay đổi chưa lưu" : status.msg || "Chưa có thay đổi"}
            </p>
            <Button type="button" variant="ghost" className="h-11" disabled={!dirty || status.kind === "saving"} onClick={() => { setForm(saved); setStatus({ kind: "idle", msg: "" }); }}>
              <LuUndo2 aria-hidden /> <span className="max-sm:sr-only">Bỏ thay đổi</span>
            </Button>
            <Button type="submit" size="lg" className="h-11 px-6 font-display text-lg font-bold" disabled={blocked || status.kind === "saving" || !dirty}>
              <LuSave aria-hidden /> {status.kind === "saving" ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}

// một dòng trong cột trò chơi: đèn sáng là trò đang bật (kèm chữ "Đang tắt" khi tắt, không chỉ dựa vào màu)
function Rail({ value, icon: Icon, label, sub, lit }: { value: string; icon: React.ComponentType<{ "aria-hidden"?: boolean }>; label: string; sub: string; lit?: boolean }) {
  return (
    <TabsTrigger value={value} className="h-auto! min-w-0 justify-start gap-2 px-2.5 py-2 text-left text-sm whitespace-normal max-md:[&_svg]:hidden md:text-base">
      <Icon aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="leading-tight md:truncate">{label}</span>
        <span className="truncate text-xs font-normal text-muted-foreground max-md:hidden">{sub}</span>
      </span>
      {lit !== undefined && <span aria-hidden className="cue-bulb" data-on={lit || undefined} />}
    </TabsTrigger>
  );
}

function Toggle({ id, checked, onChange, label, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-background p-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-desc`} className="mt-1" />
      <div>
        <label htmlFor={id} className="font-medium">{label}</label>
        <p id={`${id}-desc`} className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

const Pair = ({ children }: { children: React.ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;

function Area({ id, label, note, count, value, onChange }: { id: string; label: string; note?: string; count: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{count}</span>
      </div>
      <textarea id={id} rows={10} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={note && `${id}-note`} className={`mt-1 resize-y ${field}`} />
      {note && <p id={`${id}-note`} className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Num({ label, range: [min, max], value, onChange }: { label: string; range: readonly [number, number]; value: number; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      {label}
      <input type="number" required min={min} max={max} value={value} onChange={(e) => onChange(e.target.value)} className={`h-11 ${field}`} />
      <span className="text-xs">Từ {min} đến {max}</span>
    </label>
  );
}
