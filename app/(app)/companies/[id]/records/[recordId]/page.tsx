import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/delete-button";
import { deleteRecord, saveRecord } from "../actions";
import { RecordForm, type Item } from "../record-form";

// ログイン後の画面はすべてリクエスト時に描画するため、instant 検証の対象外にする
export const instant = false;

export default async function EditRecordPage({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(recordId)) notFound();
  const supabase = await createClient();
  const [{ data: record }, { data: items }] = await Promise.all([
    supabase.from("records").select("*").eq("id", recordId).eq("company_id", id).maybeSingle(),
    supabase.from("record_items").select("kind,question,answer").eq("record_id", recordId).order("sort_order"),
  ]);
  if (!record) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/companies/${id}?tab=records`} className="text-sm text-blue-800 hover:underline">← 就活記録</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">記録を編集</h1>
        <DeleteButton action={deleteRecord.bind(null, id, recordId)} confirmText={`「${record.title}」を削除しますか？`} />
      </div>
      <RecordForm
        action={saveRecord.bind(null, id, recordId)}
        values={record}
        initialItems={(items ?? []) as Item[]}
        submitLabel="保存する"
      />
    </div>
  );
}
