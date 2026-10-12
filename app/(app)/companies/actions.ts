"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { EXTRA_INDUSTRY_VALUE, STATUSES } from "@/lib/constants";

export type FormState = { error?: string; success?: string };

const text = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

async function resolveIndustry(f: FormData): Promise<string | null> {
  const sel = String(f.get("industry") ?? "");
  if (sel !== EXTRA_INDUSTRY_VALUE) return sel === "" ? null : sel;
  const name = text(f, "new_industry");
  if (!name) return null; // 空は parseCompany 側でエラーにする
  const user = await requireUser();
  const supabase = await createClient();
  const { data: exists } = await supabase.from("industries").select("id").eq("name", name).limit(1);
  if (!exists?.length) await supabase.from("industries").insert({ name, user_id: user.id, sort_order: 50 });
  return name;
}

function parseCompany(f: FormData) {
  const name = text(f, "name");
  if (!name) return { error: "企業名は必須です" } as const;
  if (name.length > 100) return { error: "企業名は100文字以内で入力してください" } as const;
  if (f.get("industry") === EXTRA_INDUSTRY_VALUE && !text(f, "new_industry")) return { error: "新しい業種名を入力してください" } as const;
  const website = text(f, "website_url");
  if (website && !/^https?:\/\/.+/i.test(website)) return { error: "公式サイトURLは http:// または https:// で始めてください" } as const;
  const entry = text(f, "entry_date");
  if (entry && !/^\d{4}-\d{2}-\d{2}$/.test(entry)) return { error: "記入日の形式が正しくありません" } as const;
  return {
    values: {
      name,
      entry_date: entry ?? undefined,
      employee_count: text(f, "employee_count"),
      headquarters: text(f, "headquarters"),
      capital: text(f, "capital"),
      business_description: text(f, "business_description"),
      website_url: website,
      memo: text(f, "memo"),
    },
  } as const;
}

export async function createCompany(_: FormState, f: FormData): Promise<FormState> {
  const p = parseCompany(f);
  if ("error" in p) return { error: p.error };
  const user = await requireUser();
  const supabase = await createClient();
  const industry = await resolveIndustry(f);
  const { data, error } = await supabase
    .from("companies").insert({ ...p.values, industry, user_id: user.id }).select("id").single();
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidatePath("/companies");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(id: string, _: FormState, f: FormData): Promise<FormState> {
  const p = parseCompany(f);
  if ("error" in p) return { error: p.error };
  await requireUser();
  const supabase = await createClient();
  const industry = await resolveIndustry(f);
  const { error } = await supabase.from("companies").update({ ...p.values, industry }).eq("id", id);
  if (error) return { error: `保存に失敗しました: ${error.message}` };
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  return { success: "保存しました" };
}

export async function updateStatus(id: string, formData: FormData) {
  const status = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) return;
  await requireUser();
  const supabase = await createClient();
  await supabase.from("companies").update({ status }).eq("id", id);
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
}

export async function deleteCompany(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);
  revalidatePath("/companies");
  redirect("/companies");
}
