import { requireUser, usernameOf } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { BottomNav, SideNav } from "@/components/nav";

// 全ページがログインセッション(cookie)に依存するため、静的シェル化せずリクエスト時に描画する
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white/80 p-4 backdrop-blur md:flex">
        <div className="mb-6 px-2 text-lg font-bold text-blue-900">🌸 就活管理</div>
        <SideNav />
        <form action={logout} className="mt-auto border-t border-slate-200 pt-4">
          <p className="mb-2 truncate text-xs text-slate-500">{usernameOf(user)}</p>
          <button className="text-sm text-slate-600 hover:underline">ログアウト</button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
          <span className="font-bold text-blue-900">🌸 就活管理</span>
          <form action={logout}><button className="text-sm text-slate-600">ログアウト</button></form>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
