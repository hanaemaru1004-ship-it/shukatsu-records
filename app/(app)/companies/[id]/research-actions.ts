"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { FormState } from "../actions";

const text = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

const FIELDS = [
  "reason", "attractions", "job_description", "location", "starting_salary", "average_salary",
  "average_age", "benefits", "strengths", "memo",
] as const;

export async function saveResearch(companyId: string, _: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();

  // 参考URL: 空行は無視。URLがあるものだけ検証して保存する
  const urls = f.getAll("ref_url").map((v) => String(v).trim());
  const titles = f.getAll("ref_title").map((v) => String(v).trim());
  const notes = f.getAll("ref_note").map((v) => String(v).trim());
  const refs: { url: string; title: string | null; note: string | null; sort_order: number }[] = [];
  for (let i = 0; i < urls.length; i++) {
    if (!urls[i]) {
      if (titles[i] || notes[i]) return { error: `参考URL ${i + 1} 件目: URLを入力してください` };
      continue;
    }
    if (!/^https?:\/\/.+/i.test(urls[i])) return { error: `参考URL ${i + 1} 件目: http:// または https:// で始まるURLを入力してください` };
    refs.push({ url: urls[i], title: titles[i] || null, note: notes[i] || null, sort_order: refs.length });
  }

  const values = Object.fromEntries(FIELDS.map((k) => [k, text(f, k)]));
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_research")
    .upsert({ company_id: companyId, user_id: user.id, ...values }, { onConflict: "company_id" });
  if (error) return { error: `保存に失敗しました: ${error.message}` };

  const { error: delErr } = await supabase.from("reference_urls").delete().eq("company_id", companyId);
  if (delErr) return { error: `参考URLの保存に失敗しました: ${delErr.message}` };
  if (refs.length) {
    const { error: insErr } = await supabase
      .from("reference_urls")
      .insert(refs.map((r) => ({ ...r, company_id: companyId, user_id: user.id })));
    if (insErr) return { error: `参考URLの保存に失敗しました: ${insErr.message}` };
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { success: "保存しました" };
}
