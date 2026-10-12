// 日本国内での利用を前提に、入力・表示とも Asia/Tokyo (+09:00) で扱う。
export const nowMs = () => Date.now();

const TZ = "Asia/Tokyo";

function parts(iso: string) {
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(iso)); // "2026-10-12 21:00"
  return { date: f.slice(0, 10), time: f.slice(11, 16) };
}

/** ISO → <input type="date"> 用 "YYYY-MM-DD"（JST） */
export const toDateInput = (iso: string) => parts(iso).date;
/** ISO → <input type="datetime-local"> 用 "YYYY-MM-DDTHH:mm"（JST） */
export const toDateTimeInput = (iso: string) => { const p = parts(iso); return `${p.date}T${p.time}`; };

/** フォーム値 → ISO(UTC)。all_day のときは日付のみ。 */
export function fromInput(value: string, allDay: boolean, endOfDay = false): string | null {
  if (allDay) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}+09:00`).toISOString();
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return new Date(`${value}:00+09:00`).toISOString();
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ja-JP", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short" });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
export const fmtEvent = (e: { starts_at: string; all_day: boolean }) => (e.all_day ? fmtDate(e.starts_at) : fmtDateTime(e.starts_at));
