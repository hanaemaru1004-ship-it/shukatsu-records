-- 就活管理アプリ 初期スキーマ
-- ユーザー情報は Supabase Auth の auth.users を使用する。
-- 全テーブルに user_id を持たせ、RLS で「自分の行のみ」操作可能にする。

create extension if not exists "pgcrypto";

-- updated_at 自動更新
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 選択肢マスタ（業種を追加可能にするため。user_id null = 共通初期値）
create table public.industries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 企業（基本情報 + 現在の選考ステータス）
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,       -- 記入日
  name text not null check (char_length(btrim(name)) > 0),
  industry text,
  employee_count text,
  headquarters text,
  capital text,
  business_description text,
  website_url text,
  memo text,
  status text not null default '未エントリー' check (status in (
    '未エントリー','エントリー済み','エントリーシート提出','インターンシップ選考',
    '一次選考','二次選考','三次選考','最終選考','内定','内定承諾','辞退','不合格','選考終了','その他')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.companies (user_id, updated_at desc);

-- 企業研究（1社1行）
create table public.company_research (
  company_id uuid primary key references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text,            -- 気になった理由
  attractions text,       -- 企業の魅力
  job_description text,   -- 仕事内容
  location text,          -- 勤務地
  starting_salary text,   -- 初任給
  average_salary text,    -- 平均年収
  salary_other text,      -- その他給与情報
  benefits text,          -- 福利厚生
  competitors text,       -- 競合企業
  strengths text,         -- 他社と比較したときの強み
  memo text,
  updated_at timestamptz not null default now()
);

-- 参考URL（1社複数）
create table public.reference_urls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null,
  title text,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.reference_urls (company_id);

-- 志望度評価（1社1行）。総合評価は保存せずアプリ側で自動計算する
create table public.company_ratings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_rating smallint check (job_rating between 1 and 5),
  job_comment text,
  location_rating smallint check (location_rating between 1 and 5),
  location_comment text,
  salary_rating smallint check (salary_rating between 1 and 5),
  salary_comment text,
  benefits_rating smallint check (benefits_rating between 1 and 5),
  benefits_comment text,
  wlb_rating smallint check (wlb_rating between 1 and 5),
  wlb_comment text,
  -- 一覧の並べ替え・絞り込み用。5項目すべて評価済みのときのみ値が入る（トリガーで算出、手動入力不可）
  overall_rating smallint check (overall_rating between 1 and 5),
  updated_at timestamptz not null default now()
);

create or replace function public.calc_overall_rating() returns trigger as $$
begin
  if new.job_rating is null or new.location_rating is null or new.salary_rating is null
     or new.benefits_rating is null or new.wlb_rating is null then
    new.overall_rating = null;
  else
    new.overall_rating = round((new.job_rating + new.location_rating + new.salary_rating
      + new.benefits_rating + new.wlb_rating) / 5.0)::smallint;
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_overall_rating before insert or update on public.company_ratings
  for each row execute function public.calc_overall_rating();

-- 就活記録（1社複数）
create table public.records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  record_date date not null default current_date,
  record_type text not null check (record_type in
    ('ES','WEBテスト','面接','インターンシップ','グループディスカッション','説明会','その他')),
  stage text,                         -- 選考段階
  intern_impression text,
  intern_reflection text,
  interview_reflection text,
  gd_reflection text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.records (company_id, record_date desc);

-- ES設問と回答 / 面接の質問と回答（記録に対し複数）
create table public.record_items (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('es','interview')),
  question text not null default '',  -- ES設問 / 面接の質問
  answer text not null default '',    -- ESで書いた内容 / 自分の回答
  sort_order int not null default 0
);
create index on public.record_items (record_id);

-- 日程（企業詳細とカレンダーで共通参照する唯一のテーブル）
create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  event_type text not null check (event_type in
    ('説明会','エントリーシート締切','WEBテスト締切','一次面接','二次面接','最終面接',
     'インターンシップ','仕事体験','グループディスカッション','内定承諾期限','その他')),
  starts_at timestamptz not null,
  ends_at timestamptz,                -- 締切系は null 可
  all_day boolean not null default false,
  location text,
  meeting_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index on public.events (user_id, starts_at);
create index on public.events (company_id);

-- updated_at トリガー
create trigger trg_companies_upd before update on public.companies for each row execute function public.set_updated_at();
create trigger trg_research_upd before update on public.company_research for each row execute function public.set_updated_at();
create trigger trg_ratings_upd before update on public.company_ratings for each row execute function public.set_updated_at();
create trigger trg_records_upd before update on public.records for each row execute function public.set_updated_at();
create trigger trg_events_upd before update on public.events for each row execute function public.set_updated_at();

-- 企業配下の更新時に companies.updated_at も更新（「最近更新した企業」用）
create or replace function public.touch_company() returns trigger as $$
begin
  -- TG_OP で分岐し、DELETE では NEW、INSERT では OLD を参照しない。
  -- company_id が null の予定（events）は where id = null で何にも一致せず無害。
  if tg_op in ('INSERT', 'UPDATE') then
    update public.companies set updated_at = now() where id = new.company_id;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    -- UPDATE で company_id が付け替わった場合は旧企業も更新する
    update public.companies set updated_at = now() where id = old.company_id;
  end if;
  return null;
end;
$$ language plpgsql;
create trigger trg_touch_research after insert or update on public.company_research for each row execute function public.touch_company();
create trigger trg_touch_ratings after insert or update on public.company_ratings for each row execute function public.touch_company();
create trigger trg_touch_records after insert or update or delete on public.records for each row execute function public.touch_company();
create trigger trg_touch_events after insert or update or delete on public.events for each row execute function public.touch_company();

-- Row Level Security
alter table public.industries enable row level security;
alter table public.companies enable row level security;
alter table public.company_research enable row level security;
alter table public.reference_urls enable row level security;
alter table public.company_ratings enable row level security;
alter table public.records enable row level security;
alter table public.record_items enable row level security;
alter table public.events enable row level security;

create policy "industries_select" on public.industries for select to authenticated
  using (user_id is null or user_id = auth.uid());
create policy "industries_write" on public.industries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['companies','company_research','reference_urls','company_ratings','records','record_items','events']
  loop
    execute format('create policy "%1$s_own" on public.%1$s for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- 共通の業種初期値
insert into public.industries (name, sort_order) values
  ('IT・通信',1),('金融',2),('メーカー',3),('商社',4),('コンサルティング',5),
  ('広告・マスコミ',6),('不動産・建設',7),('物流・運輸',8),('小売・サービス',9),
  ('インフラ',10),('官公庁・団体',11),('その他',99);
