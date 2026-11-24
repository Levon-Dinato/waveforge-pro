// src/pages/ContactPage.tsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export const ContactPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Question générale');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const colors = {
    bg: isDark ? '#0a0a0a' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? '#0a0a0a' : '#f9fafb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    accent: '#ffffff',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(`Nom : ${name}\nEmail : ${email}\n\n${message}`);
    window.location.href = `mailto:contact@elektraq.com?subject=${encodeURIComponent(subject)}&body=${body}`;
    setSent(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: colors.inputBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    color: colors.textMain,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: colors.textMain,
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      <Helmet>
        <title>Contact — ELEKTRAQ</title>
        <meta name="description" content="Contactez l'équipe ELEKTRAQ : support technique, questions sur Premium, partenariats." />
      </Helmet>

      <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '40px 36px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.03em', color: colors.textMain }}>
          {t('contact.title')}
        </h1>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: '0 0 32px 0', lineHeight: 1.6 }}>
          {t('contact.subtitle')}
        </p>

        {sent ? (
          <div style={{ padding: 20, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 8, color: colors.textMain, fontSize: 14, lineHeight: 1.6 }}>
            {t('contact.sent')} <a href="mailto:contact@elektraq.com" style={{ color: colors.accent }}>contact@elektraq.com</a>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle} htmlFor="contact-name">{t('contact.name')}</label>
              <input id="contact-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('contact.name_placeholder')} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle} htmlFor="contact-email">{t('contact.email')}</label>
              <input id="contact-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle} htmlFor="contact-subject">{t('contact.subject')}</label>
              <select id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option>{t('contact.subject_general')}</option>
                <option>{t('contact.subject_support')}</option>
                <option>{t('contact.subject_premium')}</option>
                <option>{t('contact.subject_partnership')}</option>
                <option>{t('contact.subject_report')}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle} htmlFor="contact-message">{t('contact.message')}</label>
              <textarea id="contact-message" required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder={t('contact.message_placeholder')} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <button
              type="submit"
              style={{
                padding: '14px 28px',
                background: colors.accent,
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                alignSelf: 'flex-start',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {t('contact.submit')}
            </button>
          </form>
        )}

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${colors.border}`, fontSize: 13, color: colors.textMuted }}>
          {t('contact.direct')} <a href="mailto:contact@elektraq.com" style={{ color: colors.accent }}>contact@elektraq.com</a>
        </div>
      </div>
    </div>
  );
};
