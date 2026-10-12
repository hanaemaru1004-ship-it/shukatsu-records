"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { RATING_ITEMS } from "@/lib/rating";
import type { FormState } from "../actions";

export async function saveRating(companyId: string, _: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const row: Record<string, unknown> = { company_id: companyId, user_id: user.id };
  for (const i of RATING_ITEMS) {
    const raw = String(f.get(`${i.key}_rating`) ?? "");
    const n = raw === "" ? null : Number(raw);
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 5)) return { error: `${i.label}の評価が正しくありません` };
    row[`${i.key}_rating`] = n;
    row[`${i.key}_comment`] = String(f.get(`${i.key}_comment`) ?? "").trim() || null;
  }
  // overall_rating は送らない（DBトリガーが自動算出）
  const supabase = await createClient();
  const { error } = await supabase.from("company_ratings").upsert(row, { onConflict: "company_id" });
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { success: "保存しました" };
}
