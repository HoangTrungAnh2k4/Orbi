"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "./image.module.css";
import { FORMATS, MAX_SIDE, convert, outName, tooBig } from "./convert.mjs";

const TABS = { removebg: "Xóa nền", upscale: "Upscale", convert: "Đổi định dạng" };
const CANCELLED = "Đã hủy.";

export default function OrbImage() {
  const [tab, setTab] = useState("removebg");
  const [scale, setScale] = useState("x2");
  const [format, setFormat] = useState("webp");
  const [quality, setQuality] = useState(0.9);
  const [file, setFile] = useState(null); // { blob, name, url, w, h }
  const [result, setResult] = useState(null); // { url, name, w, h, size }
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // trạng thái của job đang chạy
  const [notice, setNotice] = useState(""); // lỗi chọn file, để riêng cho job không đè mất
  const [drag, setDrag] = useState(false);
  const worker = useRef(null);
  const cancel = useRef(null);
  const pickId = useRef(0); // tăng mỗi lần chọn được ảnh hợp lệ; kết quả nào thuộc ảnh cũ thì bỏ
  const pickToken = useRef(0); // chọn liền 2 ảnh thì chỉ lần chọn sau cùng được áp dụng, dù ảnh trước decode xong muộn hơn

  const pick = async (blob, name = "image.png") => {
    setNotice("");
    const t = ++pickToken.current; // tăng cả khi file hỏng, để ảnh chọn trước đang decode không được áp dụng
    // type rỗng (vd HEIC/AVIF trên Windows) thì cứ thử decode, để createImageBitmap quyết
    if (blob.type && !blob.type.startsWith("image/")) return setNotice("File này không phải ảnh.");
    const img = await createImageBitmap(blob).catch(() => null);
    const { width: w, height: h } = img ?? {};
    img?.close();
    if (t !== pickToken.current) return;
    if (!img) return setNotice("Không đọc được ảnh này.");
    pickId.current++;
    setFile((old) => { old && URL.revokeObjectURL(old.url); return { blob, name, url: URL.createObjectURL(blob), w, h }; });
    setOut(null);
    setStatus("");
  };

  // mọi chỗ đổi result đều đi qua đây để giải phóng blob URL cũ
  const setOut = (r) => setResult((old) => { old && URL.revokeObjectURL(old.url); return r; });
  const show = (blob, suffix, ext, w, h) =>
    setOut({ url: URL.createObjectURL(blob), name: outName(file.name, suffix, ext), w, h, size: blob.size });

  const live = useRef({});
  live.current = { file, result }; // để cleanup lúc rời trang thấy URL mới nhất

  useEffect(() => {
    const onPaste = (e) => { const f = [...e.clipboardData.files].find((f) => !f.type || f.type.startsWith("image/")); f && pick(f, f.name); };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
      worker.current?.terminate();
      [live.current.file, live.current.result].forEach((x) => x && URL.revokeObjectURL(x.url));
    };
  }, []);

  // gửi job sang worker; mỗi lúc chỉ chạy 1 job (nút bị khóa khi busy)
  const runModel = (task, blob, isCurrent) => new Promise((resolve, reject) => {
    if (!worker.current) worker.current = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    // lỗi bất kỳ (vd hết RAM) hoặc bấm hủy thì bỏ worker luôn, lần sau tạo mới và load lại model từ cache trình duyệt
    const die = (msg) => { worker.current?.terminate(); worker.current = null; cancel.current = null; reject(new Error(msg)); };
    cancel.current = () => die(CANCELLED);
    worker.current.onmessage = ({ data }) => {
      // progress tải model là của worker chung nên luôn hiện; status của job cũ thì thôi
      if (data.type === "progress") setStatus(`Đang tải model… ${Math.round(data.progress)}% (chỉ lần đầu)`);
      else if (data.type === "status") isCurrent() && setStatus(data.text);
      else if (data.type === "done") { cancel.current = null; resolve(data); }
      else if (data.type === "error") die(data.text);
    };
    worker.current.onerror = (e) => die(e.message || "Worker bị sập, có thể do hết RAM.");
    worker.current.onmessageerror = () => die("Không nhận được kết quả từ worker.");
    worker.current.postMessage({ task, blob });
  });

  const run = async () => {
    const n = pickId.current;
    const isCurrent = () => n === pickId.current;
    setBusy(true);
    setNotice("");
    setStatus("Đang xử lý…");
    try {
      if (tab !== "convert" && tooBig(file.w, file.h, MAX_SIDE[tab])) {
        throw new Error(`Ảnh to quá, cạnh dài tối đa ${MAX_SIDE[tab]}px.`);
      }
      let out;
      if (tab === "convert") {
        const blob = await convert(file.blob, format, quality);
        out = [blob, "", format === "jpeg" ? "jpg" : format, file.w, file.h];
      } else if (tab === "upscale") {
        const d = await runModel(scale, file.blob, isCurrent);
        out = [d.blob, `-${scale}`, "png", d.w, d.h];
      } else {
        const d = await runModel("removebg", file.blob, isCurrent);
        out = [d.blob, "-nobg", "png", d.w, d.h];
      }
      if (isCurrent()) show(...out); // đang chạy mà đổi ảnh thì bỏ kết quả cũ
      setStatus("");
      setNotice("");
    } catch (e) {
      setNotice(""); // để lỗi/hủy của job không bị thông báo chọn file cũ che mất
      setStatus(!isCurrent() ? "" : e.message === CANCELLED ? CANCELLED : `Lỗi: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; f && pick(f, f.name); };
  const size = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n} B`);

  return (
    <main className="page" data-tool="orbimage">
      <header className={s.header}>
        <Link href="/orbimage" className={s.logo}>Orb<span>Image</span></Link>
        <Link href="/" className={s.back}>← Orbi</Link>
      </header>

      <div className={s.tabs} role="tablist">
        {Object.entries(TABS).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={k === tab} className={k === tab ? s.on : ""}
            onClick={() => { setTab(k); setOut(null); setStatus(""); }} disabled={busy}>{v}</button>
        ))}
      </div>

      <div className={s.options}>
        {tab === "upscale" && ["x2", "x4"].map((k) => (
          <button key={k} className={k === scale ? s.on : ""} onClick={() => setScale(k)} disabled={busy}>{k}</button>
        ))}
        {tab === "convert" && (
          <>
            {Object.keys(FORMATS).map((k) => (
              <button key={k} className={k === format ? s.on : ""} onClick={() => setFormat(k)} disabled={busy}>{k.toUpperCase()}</button>
            ))}
            {format !== "png" && (
              <label className={s.quality}>
                Chất lượng {Math.round(quality * 100)}
                <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(+e.target.value)} />
              </label>
            )}
          </>
        )}
        {tab === "removebg" && <span className={s.hint}>Model RMBG-1.4, ra PNG nền trong suốt</span>}
      </div>

      <label className={`${s.drop} ${drag ? s.dragging : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDrag(false)} onDrop={onDrop}>
        <input type="file" accept="image/*" className={s.file}
          onChange={(e) => { const f = e.target.files[0]; f && pick(f, f.name); e.target.value = ""; }} />
        {file ? <img src={file.url} alt="Ảnh gốc" /> : <span>Kéo thả, bấm để chọn, hoặc Ctrl V để dán ảnh</span>}
      </label>
      {file && <p className={s.meta}>{file.name} · {file.w}×{file.h} · {size(file.blob.size)}</p>}

      <div className={s.actions}>
        <button className={s.primary} onClick={run} disabled={!file || busy}>{busy ? "Đang chạy…" : TABS[tab]}</button>
        {busy && tab !== "convert" && <button className={s.cancel} onClick={() => cancel.current?.()}>Hủy</button>}
        <span className={s.status} aria-live="polite">{notice || status}</span>
      </div>

      {result && (
        <section>
          <div className={s.checker}><img src={result.url} alt="Kết quả" /></div>
          <p className={s.meta}>
            {result.w}×{result.h} · {size(result.size)}
            <a className={s.primary} href={result.url} download={result.name}>Tải về</a>
          </p>
        </section>
      )}
    </main>
  );
}
