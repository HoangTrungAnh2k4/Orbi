import { Big_Shoulders, Big_Shoulders_Inline } from "next/font/google";

// font bảng đếm ngược của OrbPlay, dùng chung cho trang chơi và trang admin
export const display = Big_Shoulders({ subsets: ["latin", "vietnamese"], variable: "--font-display" });
export const marquee = Big_Shoulders_Inline({ subsets: ["latin"], weight: ["800"], variable: "--font-marquee" });
