-- Variable income (ganhos variáveis) — one-off income entries outside fixed monthly salary
create table variable_income (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  categoria   text not null default 'outros',
  valor       numeric(12,2) not null check (valor > 0),
  data        date not null,
  descricao   text,
  created_at  timestamptz not null default now()
);

alter table variable_income enable row level security;

create policy "Users can manage their own variable income"
  on variable_income for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index variable_income_user_data_idx on variable_income(user_id, data);
