-- Table des vidéos de la Web TV ELEKTRAQ (gérées manuellement via des liens).
create table if not exists public.tv_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Clip',
  video_url text not null,
  created_at timestamptz not null default now()
);

alter table public.tv_videos enable row level security;

drop policy if exists "tv_videos_select" on public.tv_videos;
create policy "tv_videos_select" on public.tv_videos for select using (true);
drop policy if exists "tv_videos_insert" on public.tv_videos;
create policy "tv_videos_insert" on public.tv_videos for insert with check (auth.uid() is not null);
drop policy if exists "tv_videos_delete" on public.tv_videos;
create policy "tv_videos_delete" on public.tv_videos for delete using (auth.uid() is not null);
