"use client";
import Link from "next/link";
import { Roboto_Mono } from "next/font/google";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import s from "./typing.module.css";
import { randomWords } from "./words";
import { textWords } from "./passage";
import { computeStats, sameBase } from "./stats.mjs";
import { applyInput } from "./input";

const mono = Roboto_Mono({ subsets: ["latin", "vietnamese"], weight: ["400"] });
const MODES = { time: [15, 30, 60, 120], words: [10, 25, 50, 100] };
const LANGS = { vi: "Vn", en: "En" };
const SOURCES = { random: "ngẫu nhiên", text: "đoạn văn" };
const NOTES = {
  loading: "Đang nhờ Gemini viết đoạn văn…",
  fallback: "Không gọi được Gemini, tạm dùng đoạn văn có sẵn.",
  limited: "Đổi đoạn văn nhanh quá, đợi 1 phút nhé. Tạm dùng đoạn văn có sẵn.",
};

// shortcut: mode time ngẫu nhiên sinh sẵn 300 từ (đủ cho 150 wpm × 120s), cần thì sinh thêm khi gần hết
const newGame = (mode, amount, words) => ({
  mode, amount, words,
  typed: [""], cur: 0, keys: { correct: 0, total: 0 }, start: 0, result: null,
});

// gọi route sinh đoạn văn; lỗi thì trả [] kèm lý do để UI báo (429 = bị rate limit)
const fetchPassage = (lang, n, signal) =>
  fetch(`/orbtype/passage?lang=${lang}&n=${n}`, { signal: AbortSignal.any?.([signal, AbortSignal.timeout(45_000)]) ?? signal }) // server thử tối đa 4 model × 10s; Safari < 17.4 không có any() thì bỏ timeout, server tự cắt ở maxDuration
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => ({ words: d.words, note: "" }), (e) => ({ words: [], note: e === 429 ? "limited" : "fallback" }));

// time: chỉ xin đủ ~150 wpm để Gemini trả nhanh (300 từ mất ~15s), gõ gần hết thì xin thêm
const askCount = (mode, amount) => (mode === "time" ? Math.ceil(amount * 2.5) : amount);

// chèn đoạn Gemini mới ngay sau phần đã có, đè lên hàng bù hardcode; lỗi thì thôi, giữ hàng bù
function loadMore(game, signal, done) {
  game.more = true;
  fetchPassage(game.lang, askCount(game.mode, game.amount), signal).then(({ words }) => {
    if (!words.length) return; // để game.more = true: không xin lại liên tục mỗi lần bấm space
    const at = Math.max(game.real, game.cur + 1);
    game.words.splice(at, words.length, ...words);
    game.real = at + words.length;
    game.more = false;
    done();
  });
}

const timeUp = (game) => game.mode === "time" && game.start && !game.result && Date.now() - game.start >= game.amount * 1000;

function finish(game) {
  // mode time có thể gõ hết từ trước khi hết giờ, nên lấy thời gian thật nhưng không quá amount
  const ms = Math.min(Date.now() - game.start, game.mode === "time" ? game.amount * 1000 : Infinity);
  game.result = computeStats(game.words, game.typed, game.cur, game.keys, ms);
}

export default function Typing() {
  const [mode, setMode] = useState("time");
  const [amount, setAmount] = useState(30);
  const [lang, setLang] = useState("vi");
  const [src, setSrc] = useState("random");
  const g = useRef(null); // state game để mutable cho nhanh, đổi xong thì rerender
  const [, rerender] = useState(0);
  const [now, setNow] = useState(0);
  const [offset, setOffset] = useState(0);
  const active = useRef(null);
  const req = useRef(0); // id lần restart mới nhất, bỏ kết quả fetch cũ
  const ctrl = useRef(null); // AbortController của lần restart hiện tại
  const [note, setNote] = useState(""); // "" | "loading" | "fallback" | "limited"
  const mark = useRef(null); // vị trí caret trong chữ
  const caret = useRef(null); // caret thật, trượt tới vị trí mark
  const input = useRef(null); // ô gõ ẩn, bộ gõ tiếng Việt cần ô text mới ghép dấu được
  const bump = () => rerender((x) => x + 1);

  // sinh từ ở client (random lúc SSR sẽ lệch hydration)
  const restart = useCallback(() => {
    const n = mode === "time" ? 300 : amount;
    const id = ++req.current;
    // huỷ request của lần trước (Esc liên tục) để server ngừng gọi Gemini
    ctrl.current?.abort();
    const { signal } = (ctrl.current = new AbortController());
    if (src === "random") { g.current = newGame(mode, amount, randomWords(n, lang)); setNote(""); bump(); return; }
    g.current = null; setNote("loading"); bump();
    fetchPassage(lang, askCount(mode, amount), signal).then(({ words, note }) => {
      if (id !== req.current) return; // đã restart/đổi option trong lúc chờ
      // Gemini có thể viết thiếu từ, bù bằng đoạn văn có sẵn
      const game = newGame(mode, amount, [...words, ...textWords(n, lang)].slice(0, n));
      Object.assign(game, { lang, real: words.length, more: !words.length }); // lỗi rồi thì khỏi xin thêm
      g.current = game; setNote(note); bump();
    });
  }, [mode, amount, lang, src]);
  useEffect(restart, [restart]);

  const game = g.current;
  const running = !!(game?.start && !game.result);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const game = g.current;
      setNow(Date.now());
      if (timeUp(game)) { finish(game); bump(); }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  // có game mới (restart, đổi option) thì xoá ô gõ và focus lại; đang đứng trên nút (dùng bàn phím) thì giữ nguyên chỗ
  useEffect(() => {
    if (!input.current) return;
    input.current.value = "";
    if (!document.activeElement?.closest("button")) input.current.focus();
  }, [game]);

  // keydown chỉ lo phím điều khiển; chữ đi qua ô input ẩn để bộ gõ (Unikey, Telex của Windows) ghép dấu được
  useEffect(() => {
    const onKey = (e) => {
      const game = g.current;
      // đang chờ đoạn văn: Esc vẫn cho tải lại
      if (!game) { if (e.key === "Escape") restart(); return; }
      // interval 100ms có thể trễ, phím gõ sau khi hết giờ không được tính (check trước Tab để không lỡ tay restart mất kết quả)
      if (timeUp(game)) { e.preventDefault(); finish(game); bump(); return; }
      // Tab chỉ restart khi đang gõ, ngoài ra để Tab di chuyển focus bình thường cho người dùng bàn phím
      if (e.key === "Escape" || (e.key === "Tab" && game.start && !game.result)) { e.preventDefault(); restart(); return; }
      if (game.result || (e.ctrlKey && e.key !== "Backspace") || e.metaKey || e.altKey) return;
      const box = input.current;
      if (!box) return;
      if (e.target !== box) {
        // chưa gõ mà đang focus nút/link (đã Tab tới) thì để Space/Enter bấm nút như bình thường
        if (!game.start && (e.key === " " || e.key === "Enter") && e.target.closest?.(e.key === " " ? "button" : "button, a")) return; // link không ăn Space, để rơi xuống ô gõ cho khỏi cuộn trang
        // focus ngay trong keydown thì phím này rơi luôn vào ô gõ
        if (e.key.length === 1 || e.key === "Backspace") box.focus();
        return;
      }
      // Backspace ở đầu từ: chỉ được lùi về từ trước nếu từ đó gõ sai
      if (e.key === "Backspace" && !box.value && game.cur > 0 && game.typed[game.cur - 1] !== game.words[game.cur - 1]) {
        e.preventDefault();
        game.typed.pop();
        game.cur--;
        box.value = game.typed[game.cur];
        bump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart]);

  // ô gõ giữ đúng từ đang gõ, logic nằm ở input.ts
  const onInput = (e) => {
    const game = g.current;
    const box = e.currentTarget;
    if (!game || game.result) { box.value = ""; return; }
    if (timeUp(game)) { box.value = ""; finish(game); bump(); return; }
    const { value, done } = applyInput(game, box.value, Date.now());
    if (done) finish(game);
    // mode time + đoạn văn: còn ~15 từ Gemini thì xin đoạn tiếp, khỏi gõ sang hàng bù không liên quan
    else if (game.mode === "time" && game.real !== undefined && !game.more && game.cur >= game.real - 15) loadMore(game, ctrl.current.signal, bump);
    if (value !== null) box.value = value;
    bump();
  };

  // giữ dòng đang gõ ở hàng thứ 2, các dòng đã qua trượt lên
  useLayoutEffect(() => {
    const el = active.current;
    setOffset(el ? Math.max(0, el.offsetTop - el.offsetHeight) : 0);
    // gán CSS var thẳng vào DOM để không phải rerender mỗi lần đo
    if (mark.current && caret.current) {
      caret.current.style.setProperty("--x", `${mark.current.offsetLeft}px`);
      caret.current.style.setProperty("--y", `${mark.current.offsetTop}px`);
    }
  });

  // bấm chuột thì về ô gõ để phím cách không bấm lại nút; Enter/Space (detail = 0) thì giữ focus cho người dùng bàn phím
  const pick = (fn) => (e) => { fn(); if (e.detail) input.current?.focus(); };

  const elapsed = game?.start ? (now - game.start) / 1000 : 0;
  const counter = !running ? "" : mode === "time"
    ? Math.max(0, Math.min(amount, Math.ceil(amount - elapsed)))
    : `${game.cur}/${game.words.length}`;
  const r = game?.result;

  return (
    <div className={`${s.app} ${mono.className}`}>
      <header className={`${s.inner} ${s.header}`}>
        <Link href="/orbtype" className={s.logo} onClick={restart}>Orb<span>Type</span></Link>
        <Link href="/" className={s.back}>← Orbi</Link>
      </header>

      <main className={`${s.inner} ${s.main}`}>
        {!r && (
          <div className={s.config} style={{ visibility: running ? "hidden" : "visible" }}>
            {Object.entries(LANGS).map(([l, label]) => (
              <button key={l} className={l === lang ? s.on : ""} aria-pressed={l === lang} onClick={pick(() => setLang(l))}>{label}</button>
            ))}
            <span className={s.sep} />
            {Object.entries(SOURCES).map(([k, label]) => (
              <button key={k} className={k === src ? s.on : ""} aria-pressed={k === src} onClick={pick(() => setSrc(k))}>{label}</button>
            ))}
            <span className={s.sep} />
            {Object.keys(MODES).map((m) => (
              <button key={m} className={m === mode ? s.on : ""}
                onClick={pick(() => { setMode(m); setAmount(m === "time" ? 30 : 25); })}>{m}</button>
            ))}
            <span className={s.sep} />
            {MODES[mode].map((n) => (
              <button key={n} className={n === amount ? s.on : ""} onClick={pick(() => setAmount(n))}>{n}</button>
            ))}
          </div>
        )}

        {r ? (
          <div className={s.result}>
            <div className={s.big}>
              <div><div className={s.label}>wpm</div><div className={s.value}>{r.wpm}</div></div>
              <div><div className={s.label}>acc</div><div className={s.value}>{r.acc}%</div></div>
            </div>
            <div className={s.small}>
              <div><div className={s.label}>test type</div><div className={s.value}>{mode} {amount} {LANGS[lang]} {SOURCES[src]}</div></div>
              <div><div className={s.label}>raw</div><div className={s.value}>{r.raw}</div></div>
              <div title="correct / incorrect / extra / missed">
                <div className={s.label}>characters</div>
                <div className={s.value}>{r.chars.correct}/{r.chars.incorrect}/{r.chars.extra}/{r.chars.missed}</div>
              </div>
              <div><div className={s.label}>time</div><div className={s.value}>{r.seconds}s</div></div>
            </div>
          </div>
        ) : (
          <>
            <div className={s.counter} aria-live="off">{counter}</div>
            <p className={s.note} role="status">
              {NOTES[note]}
            </p>
            <div className={`${s.words} ${game?.start ? "" : s.idle}`} aria-label="Đoạn cần gõ" aria-busy={note === "loading"}
              onClick={() => input.current?.focus()}>
              <input ref={input} className={s.input} onInput={onInput} aria-label="Ô gõ" autoComplete="off"
                onPaste={(e) => e.preventDefault()} autoCorrect="off" autoCapitalize="off" spellCheck={false} />
              {note === "loading" && <div className={s.skeleton} aria-hidden="true"><span /><span /><span /></div>}
              <div className={s.track} style={{ transform: `translateY(-${offset}px)` }}>
                <span ref={caret} className={s.caret} aria-hidden="true" />
                {game?.words.map((w, i) => {
                  const t = game.typed[i] ?? "";
                  const isCur = i === game.cur;
                  const letters = [];
                  for (let j = 0; j < Math.max(w.length, t.length); j++) {
                    if (isCur && j === t.length) letters.push(<span key="c" ref={mark} className={s.mark} />);
                    // từ đang gõ dở: bộ gõ ghép dấu sau ("thê" → "thế") nên khớp chữ gốc là đúng, chốt từ (space) mới so chính xác
                    const ok = t[j] === w[j] || (isCur && sameBase(t[j] ?? "", w[j] ?? ""));
                    const cls = j >= w.length ? s.extra : j >= t.length ? "" : ok ? s.correct : s.incorrect;
                    letters.push(<span key={j} className={cls}>{j < w.length ? w[j] : t[j]}</span>);
                  }
                  if (isCur && t.length >= w.length) letters.push(<span key="c" ref={mark} className={s.mark} />);
                  return (
                    <div key={i} ref={isCur ? active : null} className={`${s.word} ${i < game.cur && t !== w ? s.bad : ""}`}>
                      {letters}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <button className={s.restart} onClick={pick(restart)} aria-label="Làm lại">↻</button>
      </main>

      <footer className={`${s.inner} ${s.footer}`}><kbd>esc</kbd> (hoặc <kbd>tab</kbd> khi đang gõ) - làm lại</footer>
    </div>
  );
}
