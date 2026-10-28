import { createClient } from "@/lib/supabase/server";
import { STATUSES, statusClass } from "@/lib/constants";
import { updateStatus } from "../../actions";
import { ViewEdit } from "@/components/view-edit";
import { RecordForm, type Item, type RecordValues } from "./record-form";
import { saveRecord } from "./actions";
import { btnPrimary, inputCls } from "@/components/styles";

type RecordRow = {
  record_type: string;
  intern_impression: string | null; intern_reflection: string | null; interview_reflection: string | null;
  gd_reflection: string | null; memo: string | null;
  record_items: { kind: string; question: string; answer: string; sort_order: number }[] | null;
};

const Text = ({ label, value }: { label: string; value: string }) => (
  <div>
    <h3 className="font-medium text-slate-700">{label}</h3>
    <p className="mt-1 whitespace-pre-wrap text-slate-700">{value}</p>
  </div>
);

const QA = ({ label, items, prefix }: { label: string; items: { question: string; answer: string }[]; prefix?: [string, string] }) => (
  <div className="space-y-2">
    <h3 className="font-medium text-slate-700">{label}</h3>
    {items.map((i, n) => (
      <div key={n} className="rounded-lg bg-slate-50 p-3">
        <p className="font-medium">{prefix?.[0]}{i.question || "(設問なし)"}</p>
        <p className="mt-1 whitespace-pre-wrap text-slate-700">{prefix?.[1]}{i.answer}</p>
      </div>
    ))}
  </div>
);

const scopeOf = (type: string) => (type.startsWith("インターンシップ") ? "インターンシップ" : "本選考");

/**
 * 企業の就活記録は1つにまとめて扱う。
 * 以前の仕様で複数の記録（履歴）がある場合も、項目ごとに内容をつなげて1つとして見せる。
 */
function mergeRecords(rows: RecordRow[]) {
  const join = (pick: (r: RecordRow) => string | null) => rows.map(pick).filter(Boolean).join("\n\n") || null;
  const items: Item[] = rows.flatMap((r) =>
    [...(r.record_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ kind: i.kind as Item["kind"], question: i.question, answer: i.answer })));
  const values: RecordValues = {
    intern_impression: join((r) => r.intern_impression),
    intern_reflection: join((r) => r.intern_reflection),
    interview_reflection: join((r) => r.interview_reflection),
    gd_reflection: join((r) => r.gd_reflection),
    memo: join((r) => r.memo),
  };
  // 区分は、その項目を含む記録のうち最新（先頭）のものから決める
  const typeOf = (has: (r: RecordRow) => boolean) => rows.find(has)?.record_type ?? "";
  const esScope = scopeOf(typeOf((r) => (r.record_items ?? []).some((i) => i.kind === "es")));
  const ivScope = scopeOf(typeOf((r) => (r.record_items ?? []).some((i) => i.kind === "interview") || Boolean(r.interview_reflection)));
  return { values, items, esScope, ivScope };
}

function RecordsView({ values, items, esScope, ivScope }: ReturnType<typeof mergeRecords>) {
  const es = items.filter((i) => i.kind === "es");
  const iv = items.filter((i) => i.kind === "interview");
  return (
    <div className="space-y-6 rounded-xl bg-white p-5 text-sm ring-1 ring-slate-200 [&>section]:space-y-3 [&>section+section]:border-t [&>section+section]:border-slate-200 [&>section+section]:pt-6">
      {es.length > 0 && (
        <section>
          <h2 className="font-bold text-blue-900">{esScope}ES</h2>
          <QA label="ESで書いた内容" items={es} />
        </section>
      )}
      {(iv.length > 0 || values.interview_reflection) && (
        <section>
          <h2 className="font-bold text-blue-900">{ivScope}面接</h2>
          {iv.length > 0 && <QA label="面接の質問と回答" items={iv} prefix={["Q. ", "A. "]} />}
          {values.interview_reflection && <Text label="面接後の反省" value={values.interview_reflection} />}
        </section>
      )}
      {(values.intern_impression || values.intern_reflection) && (
        <section>
          <h2 className="font-bold text-blue-900">インターンシップ</h2>
          {values.intern_impression && <Text label="インターン参加の感想" value={values.intern_impression} />}
          {values.intern_reflection && <Text label="インターンでの反省" value={values.intern_reflection} />}
        </section>
      )}
      {values.gd_reflection && (
        <section>
          <h2 className="font-bold text-blue-900">グループディスカッション</h2>
          <Text label="グループディスカッションの反省" value={values.gd_reflection} />
        </section>
      )}
      {values.memo && (
        <section>
          <h2 className="font-bold text-blue-900">その他メモ</h2>
          <Text label="その他メモ" value={values.memo} />
        </section>
      )}
    </div>
  );
}

export async function RecordsTab({ companyId, status }: { companyId: string; status: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records").select("*, record_items(kind,question,answer,sort_order)")
    .eq("company_id", companyId).order("created_at", { ascending: false });
  const rows = (data ?? []) as RecordRow[];
  const merged = mergeRecords(rows);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-sm font-bold text-blue-900">現在の選考ステータス</h2>
        <form key={status} action={updateStatus.bind(null, companyId)} className="mt-2 flex flex-wrap items-center gap-2">
          <select name="status" defaultValue={status} className={`${inputCls} w-auto`} aria-label="現在の選考ステータス">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className={btnPrimary}>更新</button>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(status)}`}>現在: {status}</span>
        </form>
        <p className="mt-2 text-xs text-slate-500">企業の現在の状態です。いつでも変更できます。</p>
      </section>

      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">読み込みに失敗しました: {error.message}</p>}

      <ViewEdit startEditing={rows.length === 0} view={<RecordsView {...merged} />}>
        <RecordForm
          action={saveRecord.bind(null, companyId)}
          values={merged.values}
          initialItems={merged.items}
          esScope={merged.esScope}
          ivScope={merged.ivScope}
          submitLabel="保存する"
        />
      </ViewEdit>
    </div>
  );
}
