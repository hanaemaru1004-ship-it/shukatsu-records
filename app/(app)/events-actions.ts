"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/constants";
import { fromInput } from "@/lib/time";

export type EventFormState = { error?: string; success?: string; at?: number };

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

// 予定は events テーブル1つだけ。企業詳細・カレンダー・ダッシュボードが同じデータを参照する。
export async function saveEvent(eventId: string | null, _: EventFormState, f: FormData): Promise<EventFormState> {
  const user = await requireUser();
  const title = text(f, "title");
  if (!title) return { error: "予定タイトルは必須です" };
  const type = String(f.get("event_type") ?? "");
  if (!EVENT_TYPES.some((t) => t.name === type)) return { error: "予定の種類を選択してください" };
  const allDay = f.get("all_day") === "on";
  const startsAt = fromInput(String(f.get("starts_at") ?? ""), allDay);
  if (!startsAt) return { error: "開始日時を入力してください" };
  const endRaw = String(f.get("ends_at") ?? "").trim();
  const endsAt = endRaw ? fromInput(endRaw, allDay, true) : null; // 終了は任意（締切など）
  if (endRaw && !endsAt) return { error: "終了日時の形式が正しくありません" };
  if (endsAt && endsAt < startsAt) return { error: "終了日時は開始日時以降にしてください" };
  const url = text(f, "meeting_url");
  if (url && !/^https?:\/\/.+/i.test(url)) return { error: "参加URLは http:// または https:// で始めてください" };
  const companyId = text(f, "company_id");
  if (companyId && !/^[0-9a-f-]{36}$/i.test(companyId)) return { error: "企業が正しくありません" };

  const values = {
    title, event_type: type, starts_at: startsAt, ends_at: endsAt, all_day: allDay,
    company_id: companyId, location: text(f, "location"), meeting_url: url, memo: text(f, "memo"),
  };
  const supabase = await createClient();
  const { error } = eventId
    ? await supabase.from("events").update(values).eq("id", eventId)
    : await supabase.from("events").insert({ ...values, user_id: user.id });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidateEvents(companyId);
  return { success: "保存しました", at: Date.now() };
}

export async function deleteEvent(eventId: string, companyId: string | null): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { error: `削除に失敗しました: ${error.message}` };
  revalidateEvents(companyId);
  return {};
}

function revalidateEvents(companyId: string | null) {
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/companies");
  if (companyId) revalidatePath(`/companies/${companyId}`);
}
