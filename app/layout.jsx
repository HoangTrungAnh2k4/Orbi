import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500"] });

export const metadata = { title: "Orbi", description: "Tất cả tool trong một chỗ" };

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={font.className}>{children}</body>
    </html>
  );
}
