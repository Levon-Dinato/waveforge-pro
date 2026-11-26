// src/pages/premium/PremiumAgendaPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const PremiumAgendaPage: React.FC = () => {
  const { events, colors, isDark, isMobile, themeColor, handleAddToCalendar, formatEventDate } = useOutletContext<any>();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '40px 16px 80px' : '80px 24px 100px', width: '100%', boxSizing: 'border-box' }}>
      <div className="section-subtitle">Agenda</div>
      <h2 className="section-title">Prochaines dates</h2>
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMuted, padding: 60, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>Aucune date annoncée pour le moment.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, marginTop: isMobile ? 20 : 40 }}>
          {events.map((event: any) => {
            const dateInfo = formatEventDate(event.event_date);
            return (
              <div key={event.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, background: colors.cardBg, backdropFilter: 'blur(10px)', border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: isMobile ? 20 : 24, transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = `${themeColor}50`} onMouseLeave={e => e.currentTarget.style.borderColor = colors.cardBorder}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${themeColor}15`, border: `1px solid ${themeColor}40`, borderRadius: 12, padding: '12px 20px', minWidth: isMobile ? 'auto' : 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: themeColor }}>{dateInfo.day}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: themeColor, textTransform: 'uppercase', marginTop: 4 }}>{dateInfo.month}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: colors.textMain, margin: 0 }}>{event.title}</h3>
                    {event.city && <span style={{ fontSize: 10, fontWeight: 700, color: themeColor, background: `${themeColor}15`, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>{event.city}</span>}
                  </div>
                  {event.location && <div style={{ fontSize: 13, color: colors.textMuted }}>{event.location}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                  {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: themeColor, color: '#000', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none', textTransform: 'uppercase' }}>Billets</a>}
                  <button onClick={() => handleAddToCalendar(event)} style={{ padding: '10px 16px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Calendrier</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
