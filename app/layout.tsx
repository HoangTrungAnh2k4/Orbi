import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Font mặc định cho mọi tool, Tailwind đọc qua --font-sans (font-sans)
const font = Bricolage_Grotesque({ subsets: ["latin", "latin-ext", "vietnamese"], axes: ["wdth"], variable: "--font-sans" });

export const metadata: Metadata = { title: "Orbi", description: "Tất cả tool trong một chỗ" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
