import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar-view";
import { toEventRow } from "@/lib/events";

// ログイン後の画面はすべてリクエスト時に描画するため、instant 検証の対象外にする
export const instant = false;

export default async function CalendarPage() {
  const supabase = await createClient();
  const [{ data: events, error }, { data: companies }] = await Promise.all([
    supabase.from("events").select("*, companies(name)").order("starts_at"),
    supabase.from("companies").select("id,name").order("name"),
  ]);
  return (
    <>
      {error && <p role="alert" className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">予定の読み込みに失敗しました: {error.message}</p>}
      <CalendarView events={(events ?? []).map(toEventRow)} companies={companies ?? []} />
    </>
  );
}
