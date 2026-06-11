-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists subscribers_email_key on public.subscribers (email);

alter table public.subscribers enable row level security;

-- 서버(service role)에서만 insert 하므로 클라이언트 직접 접근은 차단합니다.
-- API Route는 SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회합니다.
