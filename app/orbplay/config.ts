// Cấu hình OrbPlay do admin đặt, lưu trên server và dùng chung cho mọi máy.

export const GAMES = [
  { id: "wheel", label: "Vòng quay" },
  { id: "draw", label: "Bốc thăm" },
  { id: "lixi", label: "Lì xì" },
  { id: "memory", label: "Lật thẻ" },
  { id: "word", label: "Giải mã" },
  { id: "odd", label: "Khác biệt" },
  { id: "emoji", label: "Đoán emoji" },
] as const;
export type GameId = (typeof GAMES)[number]["id"];

export type OrbPlayConfig = {
  enabled: Record<GameId, boolean>;
  locked: boolean; // người chơi không sửa được danh sách, chỉ admin sửa
  people: string;
  prizes: string;
  words: string;
  emojis: string;
  draw: { countFrom: number };
  memory: { pairs: number };
  word: { rounds: number; seconds: number };
  odd: { seconds: number; penalty: number };
  emoji: { rounds: number; seconds: number };
};

export const MEMORY_LEVELS = [{ label: "Dễ", pairs: 6 }, { label: "Vừa", pairs: 8 }, { label: "Khó", pairs: 12 }];
const MAX_TEXT = 20_000; // ~ vài nghìn dòng, đủ cho 300+ người mà không để ai nhét cả MB vào KV

export const DEFAULT_CONFIG: OrbPlayConfig = {
  enabled: { wheel: true, draw: true, lixi: true, memory: true, word: true, odd: true, emoji: true },
  locked: false,
  people: "An\nBình\nChi\nDũng\nGiang\nHà",
  prizes: "500.000đ\n200.000đ x2\n100.000đ x3\n50.000đ x4\nChúc may mắn lần sau x2",
  words: `TEAMWORK - Cả nhóm cùng chung sức làm một việc
DEADLINE - Hạn chót mà ai cũng sợ
MEETING - Cuộc họp, có khi kéo dài cả buổi chiều
BONUS - Khoản thưởng ai cũng mong cuối năm
CUSTOMER - Người mua hàng, luôn là thượng đế
STRATEGY - Kế hoạch dài hạn để đi tới mục tiêu
INNOVATION - Nghĩ ra cách làm mới
TARGET - Chỉ tiêu cần đạt trong kỳ
FIREWORKS - Thứ bừng sáng trên trời lúc nửa đêm 31/12
COUNTDOWN - Mười, chín, tám… cả phố cùng hô
RESOLUTION - Lời hứa với bản thân cho năm mới
CELEBRATE - Ăn mừng, liên hoan`,
  emojis: `🎓📚💡🚀 - Đào tạo nâng cao kỹ năng chuyên môn
🏢📦🔑✨ - Bàn giao văn phòng mới
🎟️🎁🎉🍀 - Bốc thăm trúng thưởng
🌕🥮🏮🎁 - Tặng quà trung thu
🧧🌸🎆🐍 - Lì xì đầu năm
🤝📝💼✅ - Ký hợp đồng thành công
⏰💻🌙☕ - Làm thêm giờ đến khuya
🍻🥘🎤🎶 - Tiệc tất niên công ty
🏆⭐👏🎖️ - Nhân viên xuất sắc của năm
✈️🏖️🚌☀️ - Du lịch hè cùng công ty
📊📈🎯💵 - Vượt chỉ tiêu doanh số
🎂🎈🥳🍰 - Sinh nhật đồng nghiệp`,
  draw: { countFrom: 5 },
  memory: { pairs: 8 },
  word: { rounds: 5, seconds: 30 },
  odd: { seconds: 45, penalty: 3 },
  emoji: { rounds: 8, seconds: 15 },
};

// giới hạn từng thông số, admin nhập ngoài khoảng thì kẹp lại
export const LIMITS = {
  countFrom: [1, 10],
  rounds: [1, 20],
  wordSeconds: [10, 120],
  oddSeconds: [15, 180],
  penalty: [0, 10],
  emojiSeconds: [5, 60],
} as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, d: string) => (typeof v === "string" ? v.slice(0, MAX_TEXT) : d);
const int = (v: unknown, [lo, hi]: readonly [number, number], d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;
const sub = (v: unknown, k: string) => (isObj(v) && isObj(v[k]) ? v[k] : {});

// dữ liệu từ admin (PUT) hoặc từ KV đều đi qua đây: thiếu field thì lấy mặc định, sai kiểu thì bỏ
export function sanitizeConfig(input: unknown): OrbPlayConfig {
  const c = isObj(input) ? input : {};
  const d = DEFAULT_CONFIG;
  const en = isObj(c.enabled) ? c.enabled : {};
  const draw = sub(c, "draw"), memory = sub(c, "memory"), word = sub(c, "word"), odd = sub(c, "odd"), emoji = sub(c, "emoji");
  return {
    enabled: Object.fromEntries(GAMES.map(({ id }) => [id, typeof en[id] === "boolean" ? en[id] : d.enabled[id]])) as Record<GameId, boolean>,
    locked: typeof c.locked === "boolean" ? c.locked : d.locked,
    people: text(c.people, d.people),
    prizes: text(c.prizes, d.prizes),
    words: text(c.words, d.words),
    emojis: text(c.emojis, d.emojis),
    draw: { countFrom: int(draw.countFrom, LIMITS.countFrom, d.draw.countFrom) },
    memory: { pairs: MEMORY_LEVELS.some((l) => l.pairs === memory.pairs) ? (memory.pairs as number) : d.memory.pairs },
    word: { rounds: int(word.rounds, LIMITS.rounds, d.word.rounds), seconds: int(word.seconds, LIMITS.wordSeconds, d.word.seconds) },
    odd: { seconds: int(odd.seconds, LIMITS.oddSeconds, d.odd.seconds), penalty: int(odd.penalty, LIMITS.penalty, d.odd.penalty) },
    emoji: { rounds: int(emoji.rounds, LIMITS.rounds, d.emoji.rounds), seconds: int(emoji.seconds, LIMITS.emojiSeconds, d.emoji.seconds) },
  };
}
