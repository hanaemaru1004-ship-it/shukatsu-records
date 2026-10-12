"use client";
import { useMemo, useState } from "react";
import { EditContext } from "@/components/ui";
import { btnSecondary } from "@/components/styles";

/**
 * 保存済みの内容は「閲覧」で表示し、「編集」ボタンで入力フォームに切り替える。
 * フォームで保存に成功すると閲覧表示に戻り、最新の内容が表示される。
 */
export function ViewEdit({ view, children, startEditing = false, editLabel = "編集" }: {
  view: React.ReactNode; children: React.ReactNode; startEditing?: boolean; editLabel?: string;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [saved, setSaved] = useState(false);
  // 初めて保存する前（閲覧する内容が無い）は、キャンセルしても戻る先が無い
  const ctx = useMemo(
    () => ({ done: () => { setEditing(false); setSaved(true); }, cancel: () => setEditing(false) }),
    [],
  );

  if (editing) return <EditContext.Provider value={startEditing ? { done: ctx.done } : ctx}>{children}</EditContext.Provider>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {saved ? <p role="status" className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">保存しました</p> : <span />}
        <button type="button" className={btnSecondary} onClick={() => { setSaved(false); setEditing(true); }}>✏️ {editLabel}</button>
      </div>
      {view}
    </div>
  );
}
