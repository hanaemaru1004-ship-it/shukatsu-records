"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { RECORD_STAGES, RECORD_TYPES } from "@/lib/constants";
import type { FormState } from "../../actions";

type Item = { kind: "es" | "interview"; question: string; answer: string; sort_order: number };
type Draft = {
  record_type: string;
  items: Item[];
  fields: Partial<Record<"intern_impression" | "intern_reflection" | "interview_reflection" | "gd_reflection" | "memo", string | null>>;
};

const scopeOf = (v: FormDataEntryValue | null) => (String(v ?? "") === "インターンシップ" ? "インターンシップ" : "本選考");

/**
 * 就活記録の保存。
 * - ESと面接は、それぞれ「インターンシップ / 本選考」を選んだ区分で種類が決まる（es_scope / interview_scope）。
 * - 新規: ES・面接・インターン・GD・メモは項目ごとに別の記録として保存する（履歴で項目ごとに分かれる）。
 * - 編集: 1件の記録のまま、ES/面接の区分に合わせて種類を更新する。
 */
export async function saveRecord(companyId: string, recordId: string | null, _: FormState, f: FormData): Promise<FormState> {
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
  if (!esItems.length && !ivItems.length && !Object.values(fields).some(Boolean)) return { error: "記録内容を入力してください" };

  const esType = `${scopeOf(f.get("es_scope"))}ES`;
  const ivType = `${scopeOf(f.get("interview_scope"))}面接`;
  const date = given("record_date") || new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "記録日が正しくありません" };
  const stage = given("stage") || null;
  if (stage && !(RECORD_STAGES as readonly string[]).includes(stage)) return { error: "選考段階が正しくありません" };

  const supabase = await createClient();

  async function insertItems(id: string, items: Item[]) {
    if (!items.length) return null;
    const { error } = await supabase.from("record_items").insert(items.map((it) => ({ ...it, record_id: id, user_id: user.id })));
    return error ? `質問・回答の保存に失敗しました: ${error.message}` : null;
  }

  if (recordId) {
    // 編集: ES/面接の区分に合わせて種類を更新（どちらも無ければ既存の種類を保持）
    const type = esItems.length ? esType
      : ivItems.length || fields.interview_reflection ? ivType
      : given("record_type") || "その他";
    if (!(RECORD_TYPES as readonly string[]).includes(type)) return { error: "記録の種類が正しくありません" };
    // タイトルが自動生成のもの（「日付 種類」）なら、変更後の種類に合わせて更新。手で付けたタイトルは保持
    const oldTitle = given("title");
    const isAutoTitle = !oldTitle || oldTitle === `${date} ${given("record_type")}`;
    const title = isAutoTitle ? `${date} ${type}` : oldTitle;
    const { error } = await supabase
      .from("records").update({ title, record_type: type, record_date: date, stage, ...fields }).eq("id", recordId).eq("company_id", companyId);
    if (error) return { error: `保存に失敗しました: ${error.message}` };
    const { error: delErr } = await supabase.from("record_items").delete().eq("record_id", recordId);
    if (delErr) return { error: `質問・回答の保存に失敗しました: ${delErr.message}` };
    const itemErr = await insertItems(recordId, [...esItems, ...ivItems].map((it, i) => ({ ...it, sort_order: i })));
    if (itemErr) return { error: itemErr };
  } else {
    // 新規: 項目（ES・面接・インターン・GD・メモ）ごとに別の記録にする
    const drafts: Draft[] = [];
    if (esItems.length) drafts.push({ record_type: esType, items: esItems, fields: {} });
    if (ivItems.length || fields.interview_reflection) drafts.push({ record_type: ivType, items: ivItems, fields: { interview_reflection: fields.interview_reflection } });
    if (fields.intern_impression || fields.intern_reflection) drafts.push({ record_type: "インターンシップ", items: [], fields: { intern_impression: fields.intern_impression, intern_reflection: fields.intern_reflection } });
    if (fields.gd_reflection) drafts.push({ record_type: "グループディスカッション", items: [], fields: { gd_reflection: fields.gd_reflection } });
    if (fields.memo) drafts.push({ record_type: "その他", items: [], fields: { memo: fields.memo } });
    for (const d of drafts) {
      const { data, error } = await supabase
        .from("records")
        .insert({ title: `${date} ${d.record_type}`, record_type: d.record_type, record_date: date, stage, ...d.fields, company_id: companyId, user_id: user.id })
        .select("id").single();
      if (error) return { error: `保存に失敗しました: ${error.message}` };
      const itemErr = await insertItems(data.id, d.items);
      if (itemErr) return { error: itemErr };
    }
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
