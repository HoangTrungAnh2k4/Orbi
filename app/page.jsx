"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { tools } from "./tools";

// Bỏ dấu để gõ "tinh toan" vẫn ra "Tính toán"
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export default function Home() {
  const [q, setQ] = useState("");
  const input = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = tools.filter((t) => norm(`${t.name} ${t.desc} ${t.category}`).includes(norm(q.trim())));
  const categories = [...new Set(shown.map((t) => t.category))];

  return (
    <main className="page">
      <header className="header">
        <span className="logo">Orbi</span>
        <div className="search">
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tool…" aria-label="Tìm tool" />
          <kbd>Ctrl K</kbd>
        </div>
      </header>

      {categories.map((c) => (
        <section className="section" key={c}>
          <h2>{c}</h2>
          <div className="grid">
            {shown.filter((t) => t.category === c).map((t) => (
              <Link href={`/${t.slug}`} className="cell" key={t.slug}>
                <div className="icon" aria-hidden="true">{t.icon}</div>
                <div className="name">{t.name}</div>
                <div className="desc">{t.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {shown.length === 0 && <p className="empty">Không có tool nào khớp “{q}”.</p>}
    </main>
  );
}
