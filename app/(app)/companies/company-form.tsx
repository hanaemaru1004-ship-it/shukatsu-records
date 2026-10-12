"use client";
import { useState } from "react";
import type { FormState } from "./actions";
import { Field, Message, SubmitButton, useKeepForm } from "@/components/ui";
import { inputCls } from "@/components/styles";
import { EXTRA_INDUSTRY_VALUE } from "@/lib/constants";

export type CompanyValues = {
  entry_date?: string; name?: string; industry?: string | null; employee_count?: string | null;
  headquarters?: string | null; capital?: string | null; business_description?: string | null;
  website_url?: string | null; memo?: string | null;
};

export function CompanyForm({ action, industries, values = {}, submitLabel }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  industries: string[]; values?: CompanyValues; submitLabel: string;
}) {
  const { state, onSubmit, pending } = useKeepForm(action, {} as FormState);
  const options = values.industry && !industries.includes(values.industry) ? [...industries, values.industry] : industries;
  const [industry, setIndustry] = useState(values.industry ?? "");
  const today = new Date().toLocaleDateString("sv-SE");
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="企業名" required>
          <input name="name" defaultValue={values.name ?? ""} required maxLength={100} className={inputCls} />
        </Field>
        <Field label="記入日">
          <input name="entry_date" type="date" defaultValue={values.entry_date ?? today} className={inputCls} />
        </Field>
        <Field label="業種">
          <select name="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
            <option value="">未選択</option>
            {options.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value={EXTRA_INDUSTRY_VALUE}>＋ 業種を追加(自由入力)</option>
          </select>
        </Field>
        {industry === EXTRA_INDUSTRY_VALUE && (
          <Field label="新しい業種名" required hint="登録すると、次回から選択肢に追加されます">
            <input name="new_industry" required maxLength={30} autoFocus placeholder="例: ゲーム・エンタメ" className={inputCls} />
          </Field>
        )}
        <Field label="従業員数"><input name="employee_count" defaultValue={values.employee_count ?? ""} className={inputCls} placeholder="例: 約5,000名" /></Field>
        <Field label="本店所在地"><input name="headquarters" defaultValue={values.headquarters ?? ""} className={inputCls} /></Field>
        <Field label="資本金"><input name="capital" defaultValue={values.capital ?? ""} className={inputCls} /></Field>
        <Field label="企業公式サイトURL"><input name="website_url" type="url" defaultValue={values.website_url ?? ""} className={inputCls} placeholder="https://" /></Field>
      </div>
      <Field label="事業内容"><textarea name="business_description" rows={4} defaultValue={values.business_description ?? ""} className={inputCls} /></Field>
      <Field label="その他メモ"><textarea name="memo" rows={3} defaultValue={values.memo ?? ""} className={inputCls} /></Field>
      <Message error={state.error} success={state.success} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}
