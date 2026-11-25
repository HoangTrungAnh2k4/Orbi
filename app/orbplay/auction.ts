// Đấu giá ngược bí mật: mỗi người một số nguyên dương, ai chọn số NHỎ NHẤT mà không trùng ai thì thắng.
import { parseEntries } from "./random.ts";

export type Bid = { name: string; value: number };
export type BidGroup = { value: number; names: string[] };

// "Tên - 12", "Tên, 12", "Tên: 12", "Tên<Tab>12" (dán từ bảng tính), "Tên 12"; gạch phải có cách sau để "Tên -5" không thành 5
const LINE = /^(.+?)\s*(?:[,;:\t|]|\s[-–]\s|\s)\s*(\d{1,15})$/;

// cùng tên nộp nhiều lần (sửa form) thì lấy lần cuối, tên bị đè trả về replaced để BTC soát người trùng tên;
// dòng sai định dạng hoặc số 0 trả về invalid
export function parseBids(text: string) {
  const byName = new Map<string, Bid>();
  const invalid: string[] = [];
  const replaced: string[] = [];
  for (const line of parseEntries(text)) {
    // dán từ sheet kết quả form: "Dấu thời gian<Tab>Email<Tab>Tên<Tab>Số" → chỉ giữ 2 cột cuối
    const row = /[\t,;]/.test(line) ? line.split(/[\t,;]/).map((s) => s.trim()).filter(Boolean).slice(-2).join("\t") : line;
    const m = row.match(LINE);
    const value = m ? Number(m[2]) : 0;
    if (!m || value < 1) { invalid.push(line); continue; }
    const name = m[1].trim();
    const key = name.toLocaleLowerCase("vi");
    if (byName.has(key)) replaced.push(name);
    byName.delete(key); // xóa rồi thêm lại để thứ tự theo lần nộp cuối
    byName.set(key, { name, value });
  }
  return { bids: [...byName.values()], invalid, replaced };
}

export type AuctionResult = { groups: BidGroup[]; winner: number; count: number };

// nhóm theo số, xếp tăng dần, cắt ngay sau số thắng (số lớn hơn không cần lộ, kể cả trong payload gửi client);
// winner là nhóm đầu tiên chỉ có 1 người, -1 nếu số nào cũng trùng; count là tổng số phiếu
export function resolveAuction(bids: Bid[]): AuctionResult {
  const map = new Map<number, string[]>();
  for (const b of bids) map.set(b.value, [...(map.get(b.value) ?? []), b.name]);
  const groups: BidGroup[] = [...map].sort((a, b) => a[0] - b[0]).map(([value, names]) => ({ value, names }));
  const winner = groups.findIndex((g) => g.names.length === 1);
  return { groups: winner < 0 ? groups : groups.slice(0, winner + 1), winner, count: bids.length };
}
