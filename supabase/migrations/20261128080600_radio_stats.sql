-- Radio stats : likes + vues (compteurs réels, sans fake)
create table if not exists public.radio_likes (
  id uuid primary key default gen_random_uuid(),
  radio_owner_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (radio_owner_id, user_id)
);

create table if not exists public.radio_views (
  id uuid primary key default gen_random_uuid(),
  radio_owner_id uuid not null references public.profiles(id) on delete cascade,
  viewer_key text not null,
  created_at timestamptz not null default now(),
  unique (radio_owner_id, viewer_key)
);

alter table public.radio_likes enable row level security;
alter table public.radio_views enable row level security;

-- radio_likes : tout le monde lit ; seul l'auteur du like peut le créer/supprimer
drop policy if exists "radio_likes_select" on public.radio_likes;
create policy "radio_likes_select" on public.radio_likes for select using (true);
drop policy if exists "radio_likes_insert" on public.radio_likes;
create policy "radio_likes_insert" on public.radio_likes for insert with check (auth.uid() = user_id);
drop policy if exists "radio_likes_delete" on public.radio_likes;
create policy "radio_likes_delete" on public.radio_likes for delete using (auth.uid() = user_id);

-- radio_views : comptage de visites uniques par session, ouvert en lecture et en écriture
drop policy if exists "radio_views_select" on public.radio_views;
create policy "radio_views_select" on public.radio_views for select using (true);
drop policy if exists "radio_views_insert" on public.radio_views;
create policy "radio_views_insert" on public.radio_views for insert with check (true);
