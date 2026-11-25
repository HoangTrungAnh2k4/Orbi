import { OrbPlay } from "./play";
import { loadConfig } from "./store";
import { forPlayers } from "./config";
import { parseBids, resolveAuction } from "./auction";

// đọc cấu hình admin mỗi lần mở trang, admin vừa lưu là người chơi F5 thấy ngay
export const dynamic = "force-dynamic";

export default async function Page() {
  const config = await loadConfig();
  // khóa thì client không nhận phiếu thô, chỉ nhận kết quả đã cắt tới số thắng
  const auction = config.locked ? resolveAuction(parseBids(config.bids).bids) : undefined;
  return <OrbPlay config={forPlayers(config)} auction={auction} />;
}
