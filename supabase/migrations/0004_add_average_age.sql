-- 企業研究に「平均年齢」の列を追加
-- Supabase の SQL Editor で実行する。既存データはそのまま残る。
alter table public.company_research add column if not exists average_age text;
