import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "../actions";
import { CompanyForm } from "../company-form";

// ログイン後の画面はすべてリクエスト時に描画するため、instant 検証の対象外にする
export const instant = false;

export default async function NewCompanyPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("industries").select("name").order("sort_order");
  return (
    <div className="space-y-4">
      <Link href="/companies" className="text-sm text-blue-800 hover:underline">← 企業一覧</Link>
      <h1 className="text-xl font-bold">企業を登録</h1>
      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <CompanyForm action={createCompany} industries={(data ?? []).map((i) => i.name)} submitLabel="登録する" />
      </div>
    </div>
  );
}
