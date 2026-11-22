"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { tools } from "./tools";
import { layout } from "./orbit";

const rings = layout(tools);

export default function Home() {
  // tool đang sáng: cell đang trỏ/focus và hành tinh tương ứng trên bản đồ
  const [active, setActive] = useState(tools[0]?.slug);

  return (
    <main data-dark className="galaxy min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pt-6 pb-12 md:px-6 md:pb-10">
        {/* dấu chấm của chữ i là ngôi sao, cùng ngôi sao ở lõi bản đồ */}
        <h1 className="text-wordmark font-extrabold tracking-tighter">
          <span className="sr-only">Orbi</span>
          <span aria-hidden="true">Orb<span className="relative">ı<span className="sun-dot" /></span></span>
        </h1>

        <div className="mt-10 grid flex-1 grid-cols-1 content-start gap-12 md:mt-0 md:grid-cols-2 md:content-normal md:items-center">
          <section className="flex flex-col">
            {/* lưới cell ghép sát nhau: nền border lộ qua gap-px thành đường kẻ */}
            {/* viền bằng ring (nằm ngoài vùng clip) để cell góc bo đúng rounded-xl, ring active không bị cắt */}
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-2">
              {tools.map((t) => (
                <li key={t.slug} className="first:rounded-t-xl last:rounded-b-xl sm:last:odd:col-span-2 sm:first:not-last:rounded-tr-none sm:nth-2:rounded-tr-xl sm:last:even:rounded-bl-none sm:nth-last-2:odd:rounded-bl-xl">
                  <Link
                    href={`/${t.slug}`}
                    data-active={t.slug === active || undefined}
                    onMouseEnter={() => setActive(t.slug)}
                    onFocus={() => setActive(t.slug)}
                    className="group flex h-full min-h-36 rounded-[inherit] flex-col bg-background p-4 transition-colors outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset data-active:bg-card data-active:ring-2 data-active:ring-primary data-active:ring-inset"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <t.icon aria-hidden="true" className="size-6 text-muted-foreground group-data-active:text-primary" />
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                    </span>
                    <span className="mt-auto pt-6 text-2xl font-bold tracking-tight">{t.name}</span>
                    <span className="mt-1 text-sm text-muted-foreground">{t.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Bản đồ quỹ đạo chỉ để nhìn và bấm chuột; bàn phím đã có list bên trái */}
          <svg
            viewBox="-270 -205 540 410"
            aria-hidden="true"
            className={`orrery w-full max-w-2xl self-start justify-self-center overflow-visible max-md:hidden ${tools.length > 6 ? "crowded" : ""}`}
          >
            <defs>
              <radialGradient id="star"><stop offset="0" className="star-0" /><stop offset=".6" className="star-1" /><stop offset="1" className="star-2" /></radialGradient>
              <radialGradient id="halo"><stop offset=".3" className="halo-0" /><stop offset="1" className="halo-1" /></radialGradient>
            </defs>
            <circle className="halo" r="80" />
            <circle className="core" r="34" />
            <text className="core-label" dy="0.35em">Orbi</text>
            {rings.map((g) => (
              <g key={g.category} className={`orbit${g.planets.some((p) => p.slug === active) ? " on" : ""}`}>
                <circle className="ring" r={g.r} />
                <g className="spin" style={{ "--a": `${g.start}deg`, "--dur": `${g.dur}s` } as CSSProperties}>
                  {g.planets.map((p) => (
                    // xoay ra vị trí trên vòng rồi xoay ngược lại để chữ luôn đứng thẳng
                    <g key={p.slug} transform={`rotate(${p.angle}) translate(${g.r} 0) rotate(${-p.angle})`}
                      className={`body${p.slug === active ? " on" : ""}`}>
                      <g className="spin counter">
                        <Link href={`/${p.slug}`} tabIndex={-1} onMouseEnter={() => setActive(p.slug)}>
                          <circle className="hit" r="16" />
                          <circle className="planet" r="8" />
                          <text className="planet-label" x="16" dy="0.35em">{p.name}</text>
                        </Link>
                      </g>
                    </g>
                  ))}
                </g>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </main>
  );
}
