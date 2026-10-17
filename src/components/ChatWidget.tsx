import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatWidgetProps {
  receiverId: string;
  receiverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ receiverId, receiverName, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !receiverId || !isOpen) return;

    // 1. Charger l'historique de la conversation
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchMessages();

    // 2. Écouter les nouveaux messages (sans filtre restrictif)
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        // On vérifie manuellement si le message concerne cette conversation
        if (
          (newMsg.sender_id === user.id && newMsg.receiver_id === receiverId) ||
          (newMsg.sender_id === receiverId && newMsg.receiver_id === user.id)
        ) {
          // On évite les doublons si le message a déjà été ajouté localement
          setMessages(prev => {
            if (prev.find(m => m.content === newMsg.content && m.sender_id === newMsg.sender_id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, receiverId, isOpen]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // On vide le champ tout de suite

    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: messageContent
    }).select().single();

    if (!error && data) {
      // On ajoute le message reçu de la DB pour avoir le bon ID
      setMessages(prev => [...prev, data as Message]);
    } else {
      alert("Erreur d'envoi : " + (error?.message || "Impossible d'envoyer"));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 320, height: 400,
      background: '#111', border: '1px solid #333', borderRadius: 8,
      display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      zIndex: 1000, overflow: 'hidden', fontFamily: 'sans-serif'
    }}>
      {/* Header */}
      <div style={{ background: '#e50000', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Chat avec {receiverName}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: 15, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#0a0c14' }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: 20 }}>Commencez la conversation !</div>}
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} style={{
              alignSelf: isMine ? 'flex-end' : 'flex-start',
              background: isMine ? '#e50000' : '#222',
              color: '#fff', padding: '8px 12px', borderRadius: 12,
              maxWidth: '80%', fontSize: '0.85rem', 
              borderBottomRightRadius: isMine ? 0 : 12, 
              borderBottomLeftRadius: isMine ? 12 : 0
            }}>
              {msg.content}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: 10, borderTop: '1px solid #333', display: 'flex', gap: 8, background: '#111' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrire un message..."
          style={{ flex: 1, background: '#222', border: 'none', borderRadius: 20, padding: '8px 15px', color: '#fff', outline: 'none' }}
        />
        <button type="submit" style={{ background: '#e50000', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
      </form>
    </div>
  );
};