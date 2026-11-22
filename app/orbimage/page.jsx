"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "./image.module.css";
import { FORMATS, MAX_UPSCALE_SIDE, convert, outName, tooBigToUpscale } from "./convert.mjs";

const TABS = { removebg: "Xóa nền", upscale: "Upscale", convert: "Đổi định dạng" };

export default function OrbImage() {
  const [tab, setTab] = useState("removebg");
  const [scale, setScale] = useState("x2");
  const [format, setFormat] = useState("webp");
  const [quality, setQuality] = useState(0.9);
  const [file, setFile] = useState(null); // { blob, name, url, w, h }
  const [result, setResult] = useState(null); // { url, name, w, h, size }
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [drag, setDrag] = useState(false);
  const worker = useRef(null);
  const jobId = useRef(0);
  const pickId = useRef(0); // tăng mỗi lần chọn ảnh; kết quả nào thuộc lần chọn cũ thì bỏ

  const pick = async (blob, name = "image.png") => {
    if (!blob?.type.startsWith("image/")) return setStatus("File này không phải ảnh.");
    const n = ++pickId.current;
    const img = await createImageBitmap(blob).catch(() => null);
    const { width: w, height: h } = img ?? {};
    img?.close();
    if (n !== pickId.current) return;
    if (!img) return setStatus("Không đọc được ảnh này.");
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
    const onPaste = (e) => { const f = [...e.clipboardData.files].find((f) => f.type.startsWith("image/")); f && pick(f, f.name); };
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
      worker.current?.terminate();
      [live.current.file, live.current.result].forEach((x) => x && URL.revokeObjectURL(x.url));
    };
  }, []);

  // gửi job sang worker, chỉ nhận kết quả của đúng job đó
  const runModel = (task, blob) => new Promise((resolve, reject) => {
    if (!worker.current) worker.current = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    const id = ++jobId.current;
    // lỗi bất kỳ (vd hết RAM) thì bỏ worker luôn, lần sau tạo mới và load lại model từ cache trình duyệt
    const die = (msg) => { worker.current?.terminate(); worker.current = null; reject(new Error(msg)); };
    worker.current.onmessage = ({ data }) => {
      if (data.type === "progress") setStatus(`Đang tải model… ${Math.round(data.progress)}% (chỉ lần đầu)`);
      else if (data.id !== id) return;
      else if (data.type === "status") setStatus(data.text);
      else if (data.type === "done") resolve(data);
      else if (data.type === "error") die(data.text);
    };
    worker.current.onerror = (e) => die(e.message || "Worker bị sập, có thể do hết RAM.");
    worker.current.onmessageerror = () => die("Không nhận được kết quả từ worker.");
    worker.current.postMessage({ id, task, blob });
  });

  const run = async () => {
    const n = pickId.current;
    setBusy(true);
    setStatus("Đang xử lý…");
    try {
      let out;
      if (tab === "convert") {
        const blob = await convert(file.blob, format, quality);
        out = [blob, "", format === "jpeg" ? "jpg" : format, file.w, file.h];
      } else if (tab === "upscale") {
        if (tooBigToUpscale(file.w, file.h)) throw new Error(`Ảnh to quá, cạnh dài tối đa ${MAX_UPSCALE_SIDE}px để upscale.`);
        const d = await runModel(scale, file.blob);
        out = [d.blob, `-${scale}`, "png", d.w, d.h];
      } else {
        const d = await runModel("removebg", file.blob);
        out = [d.blob, "-nobg", "png", d.w, d.h];
      }
      if (n === pickId.current) show(...out); // đang chạy mà đổi ảnh thì bỏ kết quả cũ
      setStatus("");
    } catch (e) {
      if (n === pickId.current) setStatus(`Lỗi: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; f && pick(f, f.name); };
  const size = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

  return (
    <main className="page">
      <header className={s.header}>
        <Link href="/orbimage" className={`logo ${s.logo}`}>Orb<span>Image</span></Link>
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
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
        <input type="file" accept="image/*" className={s.file}
          onChange={(e) => { const f = e.target.files[0]; f && pick(f, f.name); e.target.value = ""; }} />
        {file ? <img src={file.url} alt="Ảnh gốc" /> : <span>Kéo thả, bấm để chọn, hoặc Ctrl V để dán ảnh</span>}
      </label>
      {file && <p className={s.meta}>{file.name} · {file.w}×{file.h} · {size(file.blob.size)}</p>}

      <div className={s.actions}>
        <button className={s.primary} onClick={run} disabled={!file || busy}>{busy ? "Đang chạy…" : TABS[tab]}</button>
        <span className={s.status} aria-live="polite">{status}</span>
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
