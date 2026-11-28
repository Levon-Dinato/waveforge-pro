-- Nettoie la Web TV et garde uniquement la vidéo demandée.
delete from public.tv_videos;

insert into public.tv_videos (title, video_url)
values ('Sound Of Legend - I''m Still Standing', 'https://www.youtube.com/watch?v=vxA10lXlqeQ');
