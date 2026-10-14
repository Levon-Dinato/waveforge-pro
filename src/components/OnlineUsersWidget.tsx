import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnlineUser {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  online_at: string;
}

export const OnlineUsersWidget: React.FC = () => {
  const { user, username } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Déduplique par user_id
        const unique = Array.from(
          new Map(users.map((u) => [u.user_id, u])).values()
        );

        // Trie par pseudo alphabétique
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

  // Si pas connecté → widget discret avec appel à se connecter
  if (!user) {
    return (
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h3
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '1px',
            padding: '0 0 10px',
            margin: 0,
            color: 'rgba(255,255,255,0.7)',
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
              background: 'rgba(255,255,255,0.3)',
            }}
          />
          EN LIGNE
        </h3>
        <div
          style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.4)',
            padding: '8px 0',
            lineHeight: 1.5,
          }}
        >
          <Link
            to="/auth"
            style={{
              color: '#00d9ff',
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
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <h3
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '1px',
          padding: '0 0 10px',
          margin: 0,
          color: 'rgba(255,255,255,0.7)',
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
              background: '#00ff88',
              boxShadow: '0 0 8px #00ff88',
              display: 'inline-block',
            }}
          />
          EN LIGNE
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: '#00ff88',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            padding: '1px 8px',
            borderRadius: 10,
            fontWeight: 800,
          }}
        >
          {loading ? '...' : onlineUsers.length}
        </span>
      </h3>

      {/* Liste des users */}
      {loading ? (
        <div
          style={{
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.4)',
            padding: '6px 0',
          }}
        >
          Connexion...
        </div>
      ) : onlineUsers.length === 0 ? (
        <div
          style={{
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.4)',
            padding: '6px 0',
            fontStyle: 'italic',
          }}
        >
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
                  color: isMe ? '#00d9ff' : 'rgba(255,255,255,0.75)',
                  background: isMe ? 'rgba(0, 217, 255, 0.08)' : 'transparent',
                  border: isMe
                    ? '1px solid rgba(0, 217, 255, 0.3)'
                    : '1px solid transparent',
                  fontSize: '0.72rem',
                  fontWeight: isMe ? 700 : 500,
                  transition: 'all 0.15s',
                }}
              >
                {/* Petit avatar (point vert) */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: isMe
                      ? 'linear-gradient(135deg, #00d9ff, #7c5cff)'
                      : 'linear-gradient(135deg, #00ff88, #00d9ff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    flexShrink: 0,
                    boxShadow: '0 0 8px rgba(0, 255, 136, 0.4)',
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
                        color: 'rgba(0, 217, 255, 0.6)',
                        marginLeft: 4,
                      }}
                    >
                      (toi)
                    </span>
                  )}
                </span>

                {/* Point vert pulsant */}
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00ff88',
                    boxShadow: '0 0 6px #00ff88',
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
          background: rgba(0, 217, 255, 0.06) !important;
          border-color: rgba(0, 217, 255, 0.2) !important;
        }
      `}</style>
    </div>
  );
};