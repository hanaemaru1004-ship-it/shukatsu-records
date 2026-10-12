"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center ring-1 ring-slate-200">
      <p className="font-medium text-slate-800">問題が発生しました</p>
      <p className="mt-1 text-sm text-slate-500">時間をおいて、もう一度お試しください。</p>
      <button onClick={reset} className="mt-4 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">再読み込み</button>
    </div>
  );
}
