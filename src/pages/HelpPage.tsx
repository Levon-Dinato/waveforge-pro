// src/pages/HelpPage.tsx
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SectionInfo {
  id: string;
  title: string;
}

const SECTIONS: SectionInfo[] = [
  { id: 'intro', title: 'C\'est quoi DropZone DJ ?' },
  { id: 'uploader', title: 'Uploader un son' },
  { id: 'ecouter', title: 'Écouter et liker' },
  { id: 'partager', title: 'Partager un son' },
  { id: 'profil', title: 'Ton profil artiste' },
  { id: 'premium', title: 'Les outils Premium' }, // ✅ NOUVEAU
  { id: 'regles', title: 'Les règles d\'or' },
  { id: 'aide', title: 'Besoin d\'aide ?' },
];

interface ThemeColors {
  bg: string;
  panelBg: string;
  calloutBg: string;
  border: string;
  borderHover: string;
  textMain: string;
  textMuted: string;
  textLight: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  accent: string;
}

export const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors: ThemeColors = {
    bg: isDark ? '#050505' : '#f5f5f7',
    panelBg: isDark ? '#121212' : '#ffffff',
    calloutBg: isDark ? '#0a0a0a' : '#f9fafb',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    borderHover: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    textLight: isDark ? '#d4d4d8' : '#444444',
    activeBg: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(0, 217, 255, 0.05)',
    activeBorder: isDark ? 'rgba(0, 217, 255, 0.4)' : 'rgba(0, 217, 255, 0.5)',
    activeText: '#00d9ff',
    accent: '#00d9ff',
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ 
      padding: '40px 20px', 
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 40, 
      background: colors.bg,
      minHeight: '100vh', 
      fontFamily: 'Inter, sans-serif', 
      color: colors.textMain,
      maxWidth: 1200,
      margin: '0 auto',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      
      {/* === SIDEBAR SOMMAIRE (Sticky sur Desktop) === */}
      <div style={{ 
        flex: '0 0 280px', 
        position: 'sticky', 
        top: 40, 
        height: 'fit-content',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>
          Sommaire du guide
        </div>
        {SECTIONS.map((section, i) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: isActive ? colors.activeBg : 'transparent',
                border: `1px solid ${isActive ? colors.activeBorder : 'transparent'}`,
                borderRadius: 8,
                color: isActive ? colors.activeText : colors.textMuted,
                cursor: 'pointer',
                fontSize: 14,
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? 700 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = colors.calloutBg;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 800 }}>0{i + 1}</span>
              <span style={{ flex: 1 }}>{section.title}</span>
            </button>
          );
        })}
      </div>

      {/* === CONTENU PRINCIPAL === */}
      <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* HEADER */}
        <div style={{ background: colors.panelBg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px 0', color: colors.textMain, letterSpacing: '-0.03em' }}>
            Guide de la communauté
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 16, margin: 0, lineHeight: 1.6 }}>
            Tout ce qu'il faut savoir pour partager, écouter et propulser ta carrière sur DropZone DJ.
          </p>
        </div>

        {/* SECTIONS */}
        <Section id="intro" title="C'est quoi DropZone DJ ?" colors={colors}>
          <p>
            <strong>DropZone DJ</strong> est la plateforme tout-en-un dédiée aux DJs et producteurs indépendants.
          </p>
          <ul>
            <li>🎵 Partage tes <strong>morceaux</strong> (originaux, remixes, exclusivités)</li>
            <li>🎧 <strong>Écoute</strong> les nouveautés de la communauté</li>
            <li>📤 <strong>Partage</strong> tes sons avec un lien unique (Smart Link)</li>
            <li>📊 Suis tes <strong>statistiques</strong> (écoutes, téléchargements, revenus)</li>
            <li>🔴 Rejoins le <strong>Live DJ</strong> pour écouter ou mixer en direct</li>
          </ul>
          <Callout title="Gratuit & Premium" colors={colors}>
            La création de compte et l'écoute sont <strong>100% gratuites</strong>. Pour accéder aux outils de carrière (Statistiques, Personnalisation de page, Upload illimité), il faut passer en <strong>DropZone Premium</strong>.
          </Callout>
        </Section>

        <Section id="uploader" title="Comment uploader un son ?" colors={colors}>
          <p>Pour ajouter un son à ton catalogue, rends-toi dans ton Espace Artiste.</p>
          
          <Step number={1} title="Va dans ton Espace Artiste" items={[
            'Clique sur "Réglages" dans le menu de gauche.',
            'Tu arriveras sur ton tableau de bord personnel.',
          ]} colors={colors} />
          
          <Step number={2} title="Clique sur + Uploader un MP3" items={[
            'Sélectionne ton fichier (MP3, WAV).',
            'Le système lit automatiquement les tags ID3 (Titre, Artiste, BPM, Cover).',
          ]} colors={colors} />
          
          <Step number={3} title="Configure ton son" items={[
            'Vérifie les informations extraites.',
            'Ajoute un lien Beatport si le son est en vente.',
            'Choisis si tu autorises le téléchargement gratuit.',
          ]} colors={colors} />
          
          <Step number={4} title="Publie !" items={[
            'Ton son apparaît immédiatement sur ta page artiste et dans les Nouveautés.',
          ]} colors={colors} />
        </Section>

        <Section id="ecouter" title="Comment écouter et liker ?" colors={colors}>
          <p>Pour profiter de la musique sur DropZone :</p>

          <FeatureGrid>
            <Feature icon="▶" title="Bouton Play" description="Clique sur le bouton Play au centre de la pochette." colors={colors} />
            <Feature icon="🎵" title="Lecteur Global" description="La barre en bas gère la lecture sur tout le site." colors={colors} />
            <Feature icon="❤️" title="Liker" description="Clique sur le cœur pour soutenir l'artiste." colors={colors} />
            <Feature icon="📥" title="Télécharger" description="Télécharge les sons si l'artiste l'a autorisé." colors={colors} />
          </FeatureGrid>

          <Callout title="Le saviez-vous ?" colors={colors}>
            Chaque écoute et chaque téléchargement alimentent les statistiques de l'artiste dans son tableau de bord.
          </Callout>
        </Section>

        <Section id="partager" title="Partager un son" colors={colors}>
          <p>Le partage est au cœur de DropZone.</p>
          <ul>
            <li>Utilise le bouton <strong>Partager</strong> sur la page d'un son.</li>
            <li>Sur ta page Premium, utilise ton <strong>Smart Link</strong> (dans tes outils) pour regrouper Spotify, Apple Music et DropZone dans un seul lien.</li>
            <li>Copie simplement l'URL de ton profil : <code>dropzone.dj/premium/ton-pseudo</code>.</li>
          </ul>
        </Section>

        <Section id="profil" title="Ton profil artiste" colors={colors}>
          <p>Ton espace <strong>Réglages</strong> te permet de personnaliser ton identité :</p>
          <ul>
            <li>🖼️ Changer ton <strong>Avatar</strong> et ta vidéo de fond.</li>
            <li>🎨 Choisir ta <strong>couleur de thème</strong> principale.</li>
            <li>📝 Remplir ta <strong>Bio</strong>, tes liens réseaux sociaux et ton email de booking.</li>
            <li>📸 Ajouter des photos à ta <strong>Galerie</strong> et des affiches d'événements.</li>
          </ul>
        </Section>

        {/* ✅ NOUVELLE SECTION PREMIUM */}
        <Section id="premium" title="Les outils Premium" colors={colors}>
          <p>En passant Premium, tu débloques une suite complète pour gérer ta carrière :</p>
          <FeatureGrid>
            <Feature icon="📊" title="Statistiques" description="Suis tes écoutes, tes téléchargements et estime tes revenus en temps réel." colors={colors} />
            <Feature icon="🔗" title="Smart Link" description="Un lien unique qui redirige vers toutes tes plateformes d'écoute." colors={colors} />
            <Feature icon="🖼️" title="Cartes Promo" description="Génère des visuels pour Instagram avec la pochette de ton son." colors={colors} />
            <Feature icon="📤" title="Pitch Playlist" description="Propose tes sons pour la playlist officielle DropZone." colors={colors} />
          </FeatureGrid>
          <Callout title="Comment y accéder ?" colors={colors}>
            Ces outils se trouvent dans ton Espace Artiste (Réglages) ou depuis le menu "Découvrir".
          </Callout>
        </Section>

        <Section id="regles" title="Les règles d'or de la communauté" colors={colors}>
          <Mistake problem="Uploader du contenu protégé (Copyright)" solution="Ne partage que tes propres productions ou des remixes/edits autorisés. Pas de contenu piraté." colors={colors} />
          <Mistake problem="Manquer de respect" solution="La communauté est bienveillante. Pas d'insultes, pas de harcèlement dans les commentaires ou le chat." colors={colors} />
          <Mistake problem="Spammer" solution="Ne fais pas de publicité abusive pour tes sons dans les commentaires des autres." colors={colors} />
        </Section>

        <Section id="aide" title="Besoin d'aide ?" colors={colors}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.textMain, marginBottom: 8 }}>📧 Contact Support</div>
              <p style={{ margin: 0, fontSize: 14, color: colors.textMuted }}>
                Un bug technique ? Une question sur Premium ?<br/>
                Écris-nous à <strong>contact@dropzone-dj.com</strong>
              </p>
            </div>
          </div>
        </Section>

      </div>

      {/* ✅ RESPONSIVE STYLES POUR MOBILE */}
      <style>{`
        @media (max-width: 768px) {
          .help-container { flex-direction: column; }
          .help-sidebar { position: static !important; flex: none !important; flex-direction: row !important; overflow-x: auto; padding-bottom: 12px; }
          .help-sidebar button { white-space: nowrap; }
        }
      `}</style>
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const Section: React.FC<{ id: string; title: string; children: React.ReactNode; colors: ThemeColors }> = ({ id, title, children, colors }) => (
  <div 
    id={id} 
    style={{ 
      background: colors.panelBg,
      border: `1px solid ${colors.border}`,
      borderRadius: 16, 
      padding: '32px',
      scrollMarginTop: 100,
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
    }}
  >
    <h2 style={{ margin: '0 0 24px 0', fontSize: 22, fontWeight: 800, color: colors.textMain, letterSpacing: '-0.02em' }}>
      {title}
    </h2>
    <div style={{ fontSize: 15, lineHeight: 1.7, color: colors.textMuted }}>
      {children}
      <style>{`
        #${id} ul { padding-left: 20px; margin: 12px 0; }
        #${id} li { margin: 8px 0; }
        #${id} strong { color: ${colors.textMain}; }
        #${id} p { margin: 12px 0; }
      `}</style>
    </div>
  </div>
);

const Callout: React.FC<{ title: string; children: React.ReactNode; colors: ThemeColors }> = ({ title, children, colors }) => (
  <div style={{ margin: '24px 0', padding: 20, background: colors.calloutBg, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.accent}`, borderRadius: '0 8px 8px 0' }}>
    <div style={{ fontSize: 14, fontWeight: 800, color: colors.textMain, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: colors.accent }}>💡</span> {title}
    </div>
    <div style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>{children}</div>
  </div>
);

const FeatureGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, margin: '24px 0' }}>
    {children}
  </div>
);

const Feature: React.FC<{ icon: string; title: string; description: string; colors: ThemeColors }> = ({ icon, title, description, colors }) => (
  <div style={{ padding: 20, background: colors.calloutBg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
    <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 800, color: colors.textMain, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>{description}</div>
  </div>
);

const Step: React.FC<{ number: number; title: string; items: string[]; colors: ThemeColors }> = ({ number, title, items, colors }) => (
  <div style={{ marginBottom: 24, paddingLeft: 32, position: 'relative' }}>
    <div style={{ position: 'absolute', left: 11, top: 28, bottom: -24, width: 2, background: colors.border }} />
    
    <div style={{ 
      position: 'absolute', left: 0, top: 0, 
      width: 24, height: 24, borderRadius: '50%', 
      background: colors.activeBg,
      border: `1px solid ${colors.accent}`,
      color: colors.accent,
      fontSize: 12, fontWeight: 800, 
      display: 'flex', alignItems: 'center', justifyContent: 'center' 
    }}>
      {number}
    </div>
    
    <div style={{ fontSize: 16, fontWeight: 800, color: colors.textMain, marginBottom: 8, paddingTop: 2 }}>{title}</div>
    
    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>
      {items.map((item, i) => (<li key={i}>{item}</li>))}
    </ul>
  </div>
);

const Mistake: React.FC<{ problem: string; solution: string; colors: ThemeColors }> = ({ problem, solution, colors }) => (
  <div style={{ marginBottom: 16, padding: 20, background: colors.calloutBg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      <span style={{ color: '#ff3366', fontWeight: 900, fontSize: 16, marginTop: 1 }}>✕</span>
      <span style={{ fontSize: 15, color: colors.textMain, fontWeight: 700 }}>{problem}</span>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ color: '#10b981', fontWeight: 900, fontSize: 16, marginTop: 1 }}>✓</span>
      <span style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>{solution}</span>
    </div>
  </div>
);