import type { IconType } from "react-icons";
import { LuDices, LuImage, LuKeyboard } from "react-icons/lu";

export type Tool = { slug: string; name: string; desc: string; icon: IconType; category: string };

// Thêm tool mới = thêm 1 dòng ở đây, name đặt theo dạng "Orb" + tên app. category trùng nhau thì chung một vòng quỹ đạo.
export const tools: Tool[] = [
  { slug: "orbtype", name: "OrbType", desc: "Đo WPM, độ chính xác", icon: LuKeyboard, category: "Tiện ích" },
  { slug: "orbimage", name: "OrbImage", desc: "Xóa nền, upscale, đổi định dạng", icon: LuImage, category: "Ảnh" },
  { slug: "orbplay", name: "OrbPlay", desc: "Mini game cho tiệc tất niên", icon: LuDices, category: "Giải trí" },
];
