-- Sessions Garmin Connect liées à chaque utilisateur Supabase Auth.
-- session_data contient le payload chiffré (tokens OAuth Garmin).

create table if not exists public.garmin_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_data jsonb not null,
  garmin_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.garmin_sessions is
  'Jetons de session Garmin Connect, un enregistrement par utilisateur Supabase.';

comment on column public.garmin_sessions.session_data is
  'JSON contenant le blob chiffré des tokens/cookies Garmin.';

comment on column public.garmin_sessions.garmin_username is
  'Identifiant Garmin affiché (e-mail de connexion).';

create index if not exists garmin_sessions_updated_at_idx
  on public.garmin_sessions (updated_at desc);

alter table public.garmin_sessions enable row level security;

create policy "Users can select own garmin session"
  on public.garmin_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own garmin session"
  on public.garmin_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own garmin session"
  on public.garmin_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own garmin session"
  on public.garmin_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_garmin_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists garmin_sessions_set_updated_at on public.garmin_sessions;

create trigger garmin_sessions_set_updated_at
  before update on public.garmin_sessions
  for each row
  execute function public.set_garmin_sessions_updated_at();
