create table public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  ai_report_id uuid references public.ai_reports(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  title text not null,
  created_by text not null default 'Gabriel',
  expires_at timestamptz,
  view_count integer default 0,
  created_at timestamptz default now()
);

alter table public.shared_reports enable row level security;

create policy "Leitura pública por token"
  on public.shared_reports for select
  using (true);

create policy "Insert autenticado"
  on public.shared_reports for insert
  with check (auth.role() = 'authenticated');

create policy "Update autenticado"
  on public.shared_reports for update
  using (auth.role() = 'authenticated');

create index idx_shared_reports_token on public.shared_reports(token);
create index idx_shared_reports_ai_report_id on public.shared_reports(ai_report_id);