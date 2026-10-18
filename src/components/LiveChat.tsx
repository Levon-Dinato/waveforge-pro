// src/components/LiveChat.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export const LiveChat = ({ roomId = 'djcontrolradio' }: { roomId?: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les 50 derniers messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [roomId]);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Auto-scroll en bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !nameSet) return;
    const content = input.trim();
    setInput('');
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      author_name: authorName,
      content,
    });
    inputRef.current?.focus();
  };

  // Écran de choix du pseudo
  if (!nameSet) {
    return (
      <div style={{
        background: 'rgba(20, 22, 30, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 24,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>💬</div>
        <h3 style={{ fontFamily: 'Space Grotesk', color: '#fff', margin: 0, fontSize: 18 }}>
          Rejoindre le chat
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', margin: 0 }}>
          Choisis un pseudo pour discuter avec les autres auditeurs.
        </p>
        <input
          type="text"
          placeholder="Ton pseudo..."
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && authorName.trim() && setNameSet(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#0a0c14',
            border: '1px solid #333',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => authorName.trim() && setNameSet(true)}
          disabled={!authorName.trim()}
          style={{
            width: '100%',
            padding: '12px',
            background: authorName.trim()
              ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
              : 'rgba(255, 255, 255, 0.1)',
            color: authorName.trim() ? '#000' : 'rgba(255, 255, 255, 0.3)',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: authorName.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Entrer dans le chat
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(20, 22, 30, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 16,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00ff88',
            boxShadow: '0 0 8px #00ff88',
          }} />
          Chat en direct
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
          {authorName}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
            Aucun message. Sois le premier !
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.author_name === authorName;
          return (
            <div key={msg.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
              <span style={{
                fontWeight: 700,
                color: isMe ? '#00d9ff' : '#7c5cff',
                marginRight: 6,
              }}>
                {msg.author_name}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.85)', wordBreak: 'break-word' }}>
                {msg.content}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{
        padding: 12,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Écrire un message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: '#0a0c14',
            border: '1px solid #333',
            borderRadius: 10,
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            padding: '10px 16px',
            background: input.trim()
              ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
              : 'rgba(255, 255, 255, 0.1)',
            color: input.trim() ? '#000' : 'rgba(255, 255, 255, 0.3)',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};