import { OrbPlay } from "./play";
import { loadConfig } from "./store";

// đọc cấu hình admin mỗi lần mở trang, admin vừa lưu là người chơi F5 thấy ngay
export const dynamic = "force-dynamic";

export default async function Page() {
  return <OrbPlay config={await loadConfig()} />;
}
