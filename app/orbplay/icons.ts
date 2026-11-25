import { LuBrain, LuGavel, LuGift, LuRotateCw, LuScanSearch, LuSmilePlus, LuSpellCheck, LuTicket } from "react-icons/lu";
import type { GameId } from "./config";

// icon từng trò, dùng chung cho tab trang chơi và danh sách trò ở trang admin
export const GAME_ICON: Record<GameId, typeof LuBrain> = { wheel: LuRotateCw, draw: LuTicket, lixi: LuGift, memory: LuBrain, word: LuSpellCheck, odd: LuScanSearch, emoji: LuSmilePlus, auction: LuGavel };
