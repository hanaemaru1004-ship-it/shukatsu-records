export type EventRow = {
  id: string; company_id: string | null; company_name: string | null; title: string; event_type: string;
  starts_at: string; ends_at: string | null; all_day: boolean;
  location: string | null; meeting_url: string | null; memo: string | null;
};
export type CompanyOption = { id: string; name: string };

// Supabase の埋め込み結果 → EventRow
export function toEventRow(e: Record<string, unknown> & { companies?: { name: string } | { name: string }[] | null }): EventRow {
  const c = Array.isArray(e.companies) ? e.companies[0] : e.companies;
  return { ...(e as unknown as EventRow), company_name: c?.name ?? null };
}
