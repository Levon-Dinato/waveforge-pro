// src/hooks/useRadioStats.ts
// Compteurs réels pour une radio : auditeurs en ligne (Supabase Realtime Presence),
// likes de la radio et vues cumulées. Aucune donnée simulée.
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface RadioStats {
  listeners: number;
  views: number;
  radioLikes: number;
  isRadioLiked: boolean;
  toggleRadioLike: () => void;
}

export function useRadioStats(profileId?: string): RadioStats {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [listeners, setListeners] = useState(1);
  const [views, setViews] = useState(0);
  const [radioLikes, setRadioLikes] = useState(0);
  const [isRadioLiked, setIsRadioLiked] = useState(false);

  // Clé de présence stable par session (évite de recréer une identité à chaque rendu)
  const presenceKeyRef = useRef<string | null>(null);
  if (presenceKeyRef.current === null) {
    presenceKeyRef.current = user?.id || `anon_${Math.random().toString(36).slice(2)}${Date.now()}`;
  }

  // 📡 Présence temps réel : canal à nom STABLE partagé par tous les auditeurs de la radio.
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase.channel(`radio_presence_${profileId}`, {
      config: { presence: { key: presenceKeyRef.current || user?.id || 'anon' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        Object.keys(state).forEach((k) => { count += state[k].length; });
        setListeners(Math.max(1, count));
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, user?.id]);

  // 👁️ Vues cumulées : 1 vue unique par session (clé persistée), puis lecture du total.
  useEffect(() => {
    if (!profileId) return;

    const storageKey = `radio_view_${profileId}`;
    let viewerKey = sessionStorage.getItem(storageKey);
    if (!viewerKey) {
      viewerKey = `view_${Math.random().toString(36).slice(2)}${Date.now()}`;
      sessionStorage.setItem(storageKey, viewerKey);
    }

    supabase
      .from('radio_views')
      .select('id')
      .eq('radio_owner_id', profileId)
      .eq('viewer_key', viewerKey)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          supabase.from('radio_views').insert({ radio_owner_id: profileId, viewer_key: viewerKey }).then();
        }
      });

    supabase
      .from('radio_views')
      .select('id', { count: 'exact', head: true })
      .eq('radio_owner_id', profileId)
      .then(({ count }) => setViews(count || 0));
  }, [profileId]);

  // ❤️ Likes de la radio
  useEffect(() => {
    if (!profileId) return;

    supabase
      .from('radio_likes')
      .select('id', { count: 'exact', head: true })
      .eq('radio_owner_id', profileId)
      .then(({ count }) => setRadioLikes(count || 0));

    if (user) {
      supabase
        .from('radio_likes')
        .select('id')
        .eq('radio_owner_id', profileId)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setIsRadioLiked(!!data));
    } else {
      setIsRadioLiked(false);
    }
  }, [profileId, user]);

  const toggleRadioLike = useCallback(() => {
    if (!profileId) return;
    if (!user) {
      alert(t('radio.login_to_like_radio'));
      return;
    }

    const next = !isRadioLiked;
    setIsRadioLiked(next);
    setRadioLikes((prev) => Math.max(0, prev + (next ? 1 : -1)));

    (async () => {
      try {
        if (next) {
          await supabase.from('radio_likes').insert({ radio_owner_id: profileId, user_id: user.id });
        } else {
          await supabase.from('radio_likes').delete().eq('radio_owner_id', profileId).eq('user_id', user.id);
        }
      } catch (e) {
        console.error(e);
        // rollback optimiste en cas d'erreur
        setIsRadioLiked(!next);
        setRadioLikes((prev) => Math.max(0, prev + (next ? -1 : 1)));
      }
    })();
  }, [profileId, user, isRadioLiked]);

  return { listeners, views, radioLikes, isRadioLiked, toggleRadioLike };
}
