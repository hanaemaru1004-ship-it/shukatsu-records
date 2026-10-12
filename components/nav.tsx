"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "ダッシュボード", short: "ホーム", icon: "🏠" },
  { href: "/companies", label: "企業一覧", short: "企業", icon: "🏢" },
  { href: "/calendar", label: "カレンダー", short: "予定", icon: "📅" },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function SideNav() {
  const path = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${active(path, i.href) ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md shadow-blue-300/50" : "text-slate-700 hover:bg-blue-50"}`}>
          <span aria-hidden>{i.icon}</span>{i.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-2 bottom-2 z-20 flex rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg shadow-blue-300/40 backdrop-blur md:hidden">
      {items.map((i) => (
        <Link key={i.href} href={i.href}
          className={`flex flex-1 flex-col items-center rounded-full py-1.5 text-[11px] font-medium ${active(path, i.href) ? "bg-blue-100 text-blue-900" : "text-slate-500"}`}>
          <span aria-hidden className="text-base leading-none">{i.icon}</span>{i.short}
        </Link>
      ))}
    </nav>
  );
}
