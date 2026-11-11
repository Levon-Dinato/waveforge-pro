// src/pages/radio/RadioProgramPage.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';

export const RadioProgramPage: React.FC = () => {
  const { schedules, visualizerColor, colors } = useOutletContext<any>();

  const DAYS = [
    { id: '1', label: 'Lundi' },
    { id: '2', label: 'Mardi' },
    { id: '3', label: 'Mercredi' },
    { id: '4', label: 'Jeudi' },
    { id: '5', label: 'Vendredi' },
    { id: '6', label: 'Samedi' },
    { id: '7', label: 'Dimanche' }
  ];

  const isCurrentlyPlaying = (startTime: string, endTime: string, days: string[]) => {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const currentDay = now.getDay() === 0 ? '7' : now.getDay().toString();
    const isRightDay = days?.length === 0 || days?.includes(currentDay);
    const isRightTime = currentTime >= startTime && currentTime <= endTime;
    return isRightDay && isRightTime;
  };

  const IconCalendar = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );

  const IconEmptyBox = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 50, textAlign: 'center' }}>
        <div style={{ color: visualizerColor, marginBottom: 12 }}>{IconCalendar}</div>
        <h2 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>Grille des Programmes</h2>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: 0 }}>Retrouvez tous vos rendez-vous musicaux de la semaine.</p>
      </div>

      {schedules.length === 0 ? (
        <div className="rp-glass" style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: colors.textMuted }}>
          <div style={{ color: colors.border, marginBottom: 16 }}>{IconEmptyBox}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.textMain, marginBottom: 8 }}>Aucun programme pour le moment</div>
          <p style={{ margin: 0 }}>Le DJ n'a pas encore publié sa grille des programmes.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {DAYS.map((day) => {
            const daySchedules = schedules
              .filter((s: any) => !s.days || s.days.length === 0 || s.days.includes(day.id))
              .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

            if (daySchedules.length === 0) return null;

            return (
              <motion.div 
                key={day.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rp-glass" 
                style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: `1px solid ${colors.border}`, paddingBottom: 12, margin: 0, color: visualizerColor }}>
                  {day.label}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {daySchedules.map((schedule: any) => {
                    const isLive = isCurrentlyPlaying(schedule.start_time, schedule.end_time, schedule.days);
                    
                    return (
                      <div key={schedule.id} style={{ 
                        display: 'flex', gap: 16, alignItems: 'flex-start', padding: 16, borderRadius: 12, 
                        background: isLive ? `${visualizerColor}15` : colors.card, 
                        border: `1px solid ${isLive ? visualizerColor : colors.border}`,
                        boxShadow: isLive ? `0 0 20px ${visualizerColor}30` : 'none',
                        position: 'relative', overflow: 'hidden'
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: isLive ? '#fff' : visualizerColor, background: isLive ? visualizerColor : `${visualizerColor}15`, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 1 }}>
                          {schedule.start_time.slice(0, 5)}
                        </div>
                        
                        <div style={{ flex: 1, zIndex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: isLive ? visualizerColor : colors.textMain, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {schedule.title}
                            {isLive && <span style={{ fontSize: 9, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 4, animation: 'pulseLive 1.5s infinite' }}>EN DIRECT</span>}
                          </div>
                          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                            Fin à {schedule.end_time.slice(0, 5)} • {schedule.playlists?.name || 'Mix'}
                          </div>
                        </div>

                        {isLive && (
                          <div style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, background: visualizerColor, filter: 'blur(40px)', opacity: 0.5 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};