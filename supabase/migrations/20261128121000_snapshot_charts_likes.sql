-- Met à jour le snapshot du Top 50 : classement par likes_count (au lieu de plays).
create or replace function public.snapshot_charts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
  r record;
  rank integer := 0;
begin
  for r in
    select id from tracks
    where (is_jingle is null or is_jingle = false)
    order by likes_count desc
    limit 50
  loop
    rank := rank + 1;
    update tracks set previous_rank = rank where id = r.id;
    updated_count := updated_count + 1;
  end loop;
  return updated_count;
end;
$$;
