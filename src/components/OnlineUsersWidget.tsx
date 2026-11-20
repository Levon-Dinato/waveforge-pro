import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface OnlineUser {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  online_at: string;
}

export const OnlineUsersWidget: React.FC = () => {
  const { user, username } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const c = {
    title: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    textDim: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)',
    textMain: isDark ? '#ffffff' : '#111111',
    dot: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
    accent: '#b0b0b0',
    chipBg: isDark ? 'rgba(176,176,176,0.1)' : 'rgba(0,0,0,0.06)',
    chipBorder: isDark ? 'rgba(176,176,176,0.3)' : 'rgba(0,0,0,0.2)',
    hoverBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    meBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    meBorder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            users.push({
              user_id: p.user_id,
              username: p.username,
              avatar_url: p.avatar_url || null,
              online_at: p.online_at,
            });
          });
        });

        const unique = Array.from(
          new Map(users.map((u) => [u.user_id, u])).values()
        );

        unique.sort((a, b) => a.username.localeCompare(b.username));
        setOnlineUsers(unique);
        setLoading(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: username || 'Anonyme',
            avatar_url: null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, username]);

  if (!user) {
    return (
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <h3
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '1px',
            padding: '0 0 10px',
            margin: 0,
            color: c.title,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: c.dot,
            }}
          />
          EN LIGNE
        </h3>
        <div
          style={{
            fontSize: '0.7rem',
            color: c.textDim,
            padding: '8px 0',
            lineHeight: 1.5,
          }}
        >
          <Link
            to="/auth"
            style={{
              color: c.textMain,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Connecte-toi
          </Link>{' '}
          pour voir qui est là.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <h3
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '1px',
          padding: '0 0 10px',
          margin: 0,
          color: c.title,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="online-pulse-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: c.accent,
              boxShadow: `0 0 8px ${c.accent}`,
              display: 'inline-block',
            }}
          />
          EN LIGNE
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: c.accent,
            background: c.chipBg,
            border: `1px solid ${c.chipBorder}`,
            padding: '1px 8px',
            borderRadius: 10,
            fontWeight: 800,
          }}
        >
          {loading ? '...' : onlineUsers.length}
        </span>
      </h3>

      {loading ? (
        <div style={{ fontSize: '0.72rem', color: c.textDim, padding: '6px 0' }}>
          Connexion...
        </div>
      ) : onlineUsers.length === 0 ? (
        <div style={{ fontSize: '0.72rem', color: c.textDim, padding: '6px 0', fontStyle: 'italic' }}>
          Tu es seul pour l'instant.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 220,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {onlineUsers.map((u) => {
            const isMe = u.user_id === user.id;
            return (
              <Link
                key={u.user_id}
                to={`/profil/${u.user_id}`}
                className="online-user-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: isMe ? c.textMain : c.textMain,
                  background: isMe ? c.meBg : 'transparent',
                  border: isMe ? `1px solid ${c.meBorder}` : '1px solid transparent',
                  fontSize: '0.72rem',
                  fontWeight: isMe ? 700 : 500,
                  opacity: isMe ? 1 : (isDark ? 0.75 : 0.85),
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${isDark ? '#ffffff' : '#111111'}, #b0b0b0)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    flexShrink: 0,
                    boxShadow: '0 0 8px rgba(176, 176, 176, 0.4)',
                  }}
                >
                  🎧
                </div>

                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {u.username}
                  {isMe && (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        color: c.textDim,
                        marginLeft: 4,
                      }}
                    >
                      (toi)
                    </span>
                  )}
                </span>

                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: c.accent,
                    boxShadow: `0 0 6px ${c.accent}`,
                    flexShrink: 0,
                  }}
                />
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes onlinePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .online-pulse-dot {
          animation: onlinePulse 2s ease-in-out infinite;
        }
        .online-user-item:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'} !important;
          border-color: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'} !important;
        }
      `}</style>
    </div>
  );
};
