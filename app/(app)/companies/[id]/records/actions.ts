"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { FormState } from "../../actions";

type Item = { kind: "es" | "interview"; question: string; answer: string; sort_order: number };

const scopeOf = (v: FormDataEntryValue | null) => (String(v ?? "") === "インターンシップ" ? "インターンシップ" : "本選考");

/**
 * 就活記録の保存。企業ごとに記録は1つで、保存すると内容がその1件に上書きされる（履歴は作らない）。
 * - ESと面接は、それぞれ「インターンシップ / 本選考」を選んだ区分で種類が決まる（es_scope / interview_scope）。
 * - 以前の仕様で複数の記録がある場合は、表示時に1つにまとめている。保存すると最初の1件に集約し、残りは削除する。
 * - 内容がすべて空なら記録を削除する。
 */
export async function saveRecord(companyId: string, _: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const given = (k: string) => String(f.get(k) ?? "").trim();
  const text = (k: string) => given(k) || null;

  // ES・面接の質問/回答（独立した複数行）。両方空の行は無視
  const kinds = f.getAll("item_kind").map(String);
  const qs = f.getAll("item_q").map((v) => String(v).trim());
  const as = f.getAll("item_a").map((v) => String(v).trim());
  const all = kinds
    .map((kind, i) => ({ kind, question: qs[i] ?? "", answer: as[i] ?? "" }))
    .filter((it) => (it.kind === "es" || it.kind === "interview") && (it.question || it.answer));
  const withOrder = (kind: "es" | "interview"): Item[] =>
    all.filter((it) => it.kind === kind).map((it, i) => ({ kind, question: it.question, answer: it.answer, sort_order: i }));
  const esItems = withOrder("es");
  const ivItems = withOrder("interview");

  const fields = {
    intern_impression: text("intern_impression"),
    intern_reflection: text("intern_reflection"),
    interview_reflection: text("interview_reflection"),
    gd_reflection: text("gd_reflection"),
    memo: text("memo"),
  };
  const hasContent = esItems.length > 0 || ivItems.length > 0 || Object.values(fields).some(Boolean);

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("records").select("id").eq("company_id", companyId).order("created_at");
  if (readErr) return { error: `保存に失敗しました: ${readErr.message}` };
  const ids = (existing ?? []).map((r) => r.id);

  if (!hasContent) {
    if (!ids.length) return { error: "記録内容を入力してください" };
    const { error } = await supabase.from("records").delete().eq("company_id", companyId);
    if (error) return { error: `保存に失敗しました: ${error.message}` };
    revalidatePath(`/companies/${companyId}`);
    return { success: "保存しました" };
  }

  // 記録の種類（一覧や絞り込みの名札）は、入力された内容のうち代表的なものから決める
  const type = esItems.length ? `${scopeOf(f.get("es_scope"))}ES`
    : ivItems.length || fields.interview_reflection ? `${scopeOf(f.get("interview_scope"))}面接`
    : fields.intern_impression || fields.intern_reflection ? "インターンシップ"
    : fields.gd_reflection ? "グループディスカッション"
    : "その他";
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const row = { title: `${date} ${type}`, record_type: type, record_date: date, stage: null, ...fields };

  let recordId = ids[0];
  if (recordId) {
    const { error } = await supabase.from("records").update(row).eq("id", recordId).eq("company_id", companyId);
    if (error) return { error: `保存に失敗しました: ${error.message}` };
    const { error: delErr } = await supabase.from("record_items").delete().eq("record_id", recordId);
    if (delErr) return { error: `質問・回答の保存に失敗しました: ${delErr.message}` };
    if (ids.length > 1) {
      const { error: restErr } = await supabase.from("records").delete().in("id", ids.slice(1));
      if (restErr) return { error: `保存に失敗しました: ${restErr.message}` };
    }
  } else {
    const { data, error } = await supabase
      .from("records").insert({ ...row, company_id: companyId, user_id: user.id }).select("id").single();
    if (error) return { error: `保存に失敗しました: ${error.message}` };
    recordId = data.id;
  }

  const items = [...esItems, ...ivItems].map((it, i) => ({ ...it, sort_order: i, record_id: recordId, user_id: user.id }));
  if (items.length) {
    const { error } = await supabase.from("record_items").insert(items);
    if (error) return { error: `質問・回答の保存に失敗しました: ${error.message}` };
  }
  revalidatePath(`/companies/${companyId}`);
  return { success: "保存しました" };
}
