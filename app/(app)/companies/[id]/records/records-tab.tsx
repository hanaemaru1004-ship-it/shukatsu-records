import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RECORD_STAGES, RECORD_TYPES, STATUSES, statusClass } from "@/lib/constants";
import { updateStatus } from "../../actions";
import { RecordForm } from "./record-form";
import { saveRecord } from "./actions";
import { btnPrimary, btnSecondary, inputCls } from "@/components/styles";

export type RecordFilters = { rtype?: string; rstage?: string; rsort?: string };


type RecordRow = {
  id: string; title: string; record_type: string; record_date: string; stage: string | null;
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

/**
 * 履歴は項目ごとに別々に表示する。
 * 新規保存では項目ごとに別の記録になるが、以前にまとめて保存した記録（複数項目を含む）も、ここで項目ごとに分けて見せる。
 */
function splitRecord(r: RecordRow) {
  const items = [...(r.record_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const es = items.filter((i) => i.kind === "es");
  const iv = items.filter((i) => i.kind === "interview");
  const scope = r.record_type.startsWith("インターンシップ") ? "インターンシップ" : "本選考";
  const out: { key: string; label: string; title: string; body: React.ReactNode }[] = [];
  const add = (key: string, label: string, body: React.ReactNode) => out.push({ key, label, title: "", body });

  if (es.length) add("es", `${scope}ES`, <QA label="ESで書いた内容" items={es} />);
  if (iv.length || r.interview_reflection) {
    add("iv", `${scope}面接`, (
      <>
        {iv.length > 0 && <QA label="面接の質問と回答" items={iv} prefix={["Q. ", "A. "]} />}
        {r.interview_reflection && <Text label="面接後の反省" value={r.interview_reflection} />}
      </>
    ));
  }
  if (r.intern_impression || r.intern_reflection) {
    add("intern", "インターンシップ", (
      <>
        {r.intern_impression && <Text label="インターン参加の感想" value={r.intern_impression} />}
        {r.intern_reflection && <Text label="インターンでの反省" value={r.intern_reflection} />}
      </>
    ));
  }
  if (r.gd_reflection) add("gd", "グループディスカッション", <Text label="グループディスカッションの反省" value={r.gd_reflection} />);
  if (r.memo) add("memo", out.length ? "その他メモ" : r.record_type, <Text label="その他メモ" value={r.memo} />);
  if (!out.length) add("empty", r.record_type, null);

  // 1項目だけの記録は保存されたタイトルをそのまま、複数項目の記録は項目ごとのタイトルにする
  return out.map((e) => ({ ...e, title: out.length === 1 ? r.title : `${r.record_date} ${e.label}` }));
}

export async function RecordsTab({ companyId, status, filters }: { companyId: string; status: string; filters: RecordFilters }) {
  const { rtype = "", rstage = "", rsort = "new" } = filters;
  const supabase = await createClient();
  let q = supabase.from("records").select("*, record_items(kind,question,answer,sort_order)").eq("company_id", companyId);
  if (rtype) q = q.eq("record_type", rtype);
  if (rstage) q = q.eq("stage", rstage);
  q = q.order("record_date", { ascending: rsort === "old" }).order("created_at", { ascending: rsort === "old" });
  const { data: records, error } = await q;
  const filtered = Boolean(rtype || rstage);
  const { data: all } = await supabase.from("records").select("id").eq("company_id", companyId);
  const allIds = (all ?? []).map((r) => r.id).sort().join(",");

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
        <p className="mt-2 text-xs text-slate-500">企業の現在の状態です。いつでも変更できます。下の記録は上書きされず残ります。</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-blue-900">新しい記録を追加</h2>
        {/* 保存後に入力欄を初期化するため、記録の増減で key を変える */}
        <RecordForm key={allIds} action={saveRecord.bind(null, companyId, null)} submitLabel="記録を追加する" />
      </section>

      <h2 className="pt-2 text-sm font-bold text-blue-900">過去の記録</h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="tab" value="records" />
          <select name="rtype" defaultValue={rtype} className={`${inputCls} w-auto`} aria-label="記録の種類">
            <option value="">種類: すべて</option>
            {RECORD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select name="rstage" defaultValue={rstage} className={`${inputCls} w-auto`} aria-label="選考段階">
            <option value="">段階: すべて</option>
            {RECORD_STAGES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select name="rsort" defaultValue={rsort} className={`${inputCls} w-auto`} aria-label="並べ替え">
            <option value="new">記録日が新しい順</option>
            <option value="old">記録日が古い順</option>
          </select>
          <button className={btnSecondary}>適用</button>
        </form>
      </div>

      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">読み込みに失敗しました: {error.message}</p>}

      {!records?.length ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {filtered ? "条件に一致する記録がありません" : "まだ記録がありません。上のフォームから追加できます。"}
        </div>
      ) : (
        <ul className="space-y-3">
          {(records as RecordRow[]).flatMap((r) => splitRecord(r).map((e) => (
            <li key={`${r.id}-${e.key}`} className="rounded-xl bg-white ring-1 ring-slate-200">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="font-medium text-blue-900">{e.title}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">{e.label}</span>
                  {r.stage && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{r.stage}</span>}
                  <span className="text-xs text-slate-500">{r.record_date}</span>
                </summary>
                <div className="space-y-4 border-t border-slate-100 px-4 py-4 text-sm">
                  {e.body}
                  <Link href={`/companies/${companyId}/records/${r.id}`} className="inline-block text-blue-800 underline">編集・削除</Link>
                </div>
              </details>
            </li>
          )))}
        </ul>
      )}
    </div>
  );
}
