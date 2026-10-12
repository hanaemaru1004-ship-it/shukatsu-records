export const STATUSES = [
  "未エントリー", "プレエントリー済み", "インターンシップES提出", "本選考ES提出", "インターンシップ選考",
  "一次選考", "二次選考", "三次選考", "最終選考", "内定", "内定承諾",
  "辞退", "不合格", "選考終了", "その他",
] as const;
export type Status = (typeof STATUSES)[number];

export const ACTIVE_STATUSES: Status[] = [
  "プレエントリー済み", "インターンシップES提出", "本選考ES提出", "インターンシップ選考",
  "一次選考", "二次選考", "三次選考", "最終選考",
];

export function statusClass(s: string) {
  if (s === "内定" || s === "内定承諾") return "bg-emerald-100 text-emerald-800";
  if (ACTIVE_STATUSES.includes(s as Status)) return "bg-blue-100 text-blue-800";
  if (s === "辞退" || s === "不合格") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export const EXTRA_INDUSTRY_VALUE = "__new__";

export const RECORD_TYPES = ["インターンシップES", "本選考ES", "WEBテスト", "インターンシップ面接", "本選考面接", "インターンシップ", "グループディスカッション", "説明会", "その他"] as const;
export const RECORD_STAGES = ["説明会・エントリー", "書類選考", "一次選考", "二次選考", "三次選考", "最終選考", "内定後", "その他"] as const;

// 予定の種類と色（締切・面接など重要なものを見分けやすくする）
export const EVENT_TYPES = [
  { name: "説明会", color: "#0ea5e9", deadline: false },
  { name: "インターンシップES締切", color: "#ec4899", deadline: true },
  { name: "本選考ES締切", color: "#b91c1c", deadline: true },
  { name: "WEBテスト締切", color: "#f97316", deadline: true },
  { name: "インターンシップ面接", color: "#14b8a6", deadline: false },
  { name: "本選考一次面接", color: "#2563eb", deadline: false },
  { name: "本選考二次面接", color: "#7c3aed", deadline: false },
  { name: "本選考最終面接", color: "#581c87", deadline: false },
  { name: "インターンシップ", color: "#16a34a", deadline: false },
  { name: "仕事体験", color: "#84cc16", deadline: false },
  { name: "グループディスカッション", color: "#eab308", deadline: false },
  { name: "内定承諾期限", color: "#92400e", deadline: true },
  { name: "その他", color: "#64748b", deadline: false },
] as const;

export const eventColor = (type: string) => EVENT_TYPES.find((t) => t.name === type)?.color ?? "#64748b";
export const isDeadline = (type: string) => EVENT_TYPES.some((t) => t.name === type && t.deadline);

/** 予定タイトルから予定の種類を推測する（該当なしは null） */
export function inferEventType(title: string): string | null {
  const t = title.normalize("NFKC");
  const exact = EVENT_TYPES.find((x) => x.name === t.trim());
  if (exact) return exact.name;
  const intern = t.includes("インターン");
  if (t.includes("内定承諾")) return "内定承諾期限";
  if (/グループディスカッション|GD|ＧＤ/i.test(t)) return "グループディスカッション";
  if (t.includes("仕事体験")) return "仕事体験";
  if (t.includes("説明会")) return "説明会";
  if (/WEBテスト|適性検査|SPI|玉手箱|TG-?WEB/i.test(t)) return "WEBテスト締切";
  if (/エントリーシート|\bES\b|ES(提出|締切|〆切)/i.test(t)) return intern ? "インターンシップES締切" : "本選考ES締切";
  if (t.includes("面接") || t.includes("面談")) {
    if (intern) return "インターンシップ面接";
    if (t.includes("最終")) return "本選考最終面接";
    if (t.includes("二次") || t.includes("2次")) return "本選考二次面接";
    return "本選考一次面接";
  }
  if (intern) return "インターンシップ";
  return null;
}
