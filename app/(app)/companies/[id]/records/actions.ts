"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { RECORD_STAGES, RECORD_TYPES } from "@/lib/constants";
import type { FormState } from "../../actions";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

export async function saveRecord(companyId: string, recordId: string | null, _: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  // ES・面接の質問/回答（独立した複数行）。両方空の行は無視
  const kinds = f.getAll("item_kind").map(String);
  const qs = f.getAll("item_q").map((v) => String(v).trim());
  const as = f.getAll("item_a").map((v) => String(v).trim());
  const items = kinds
    .map((kind, i) => ({ kind, question: qs[i] ?? "", answer: as[i] ?? "" }))
    .filter((it) => (it.kind === "es" || it.kind === "interview") && (it.question || it.answer))
    .map((it, i) => ({ ...it, sort_order: i }));

  const content = [
    f.get("intern_impression"), f.get("intern_reflection"), f.get("interview_reflection"), f.get("gd_reflection"), f.get("memo"),
  ].some((v) => String(v ?? "").trim());
  if (!items.length && !content) return { error: "記録内容を入力してください" };

  // 入力欄のないタイトル・日付・種類は、既存の値（編集時）か記録内容からの自動設定（新規）を使う
  const given = (k: string) => String(f.get(k) ?? "").trim();
  const has = (k: string) => Boolean(given(k));
  const inferredType = items.some((i) => i.kind === "es") ? "本選考ES"
    : items.some((i) => i.kind === "interview") || has("interview_reflection") ? "本選考面接"
    : has("intern_impression") || has("intern_reflection") ? "インターンシップ"
    : has("gd_reflection") ? "グループディスカッション" : "その他";
  const type = given("record_type") || inferredType;
  const date = given("record_date") || new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const title = given("title") || `${date} ${type}`;
  const stage = given("stage") || null;
  if (!(RECORD_TYPES as readonly string[]).includes(type)) return { error: "記録の種類が正しくありません" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "記録日が正しくありません" };
  if (stage && !(RECORD_STAGES as readonly string[]).includes(stage)) return { error: "選考段階が正しくありません" };

  const values = {
    title, record_type: type, record_date: date, stage,
    intern_impression: text(f, "intern_impression"),
    intern_reflection: text(f, "intern_reflection"),
    interview_reflection: text(f, "interview_reflection"),
    gd_reflection: text(f, "gd_reflection"),
    memo: text(f, "memo"),
  };

  const supabase = await createClient();
  let id = recordId;
  if (id) {
    const { error } = await supabase.from("records").update(values).eq("id", id).eq("company_id", companyId);
    if (error) return { error: `保存に失敗しました: ${error.message}` };
    const { error: delErr } = await supabase.from("record_items").delete().eq("record_id", id);
    if (delErr) return { error: `質問・回答の保存に失敗しました: ${delErr.message}` };
  } else {
    const { data, error } = await supabase
      .from("records").insert({ ...values, company_id: companyId, user_id: user.id }).select("id").single();
    if (error) return { error: `保存に失敗しました: ${error.message}` };
    id = data.id;
  }
  if (items.length) {
    const { error } = await supabase
      .from("record_items").insert(items.map((it) => ({ ...it, record_id: id, user_id: user.id })));
    if (error) return { error: `質問・回答の保存に失敗しました: ${error.message}` };
  }
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?tab=records`);
}

export async function deleteRecord(companyId: string, recordId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("records").delete().eq("id", recordId).eq("company_id", companyId);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?tab=records`);
}
