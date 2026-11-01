// src/pages/HelpPage.tsx
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext'; // ✅ IMPORT DU THEME

interface SectionInfo {
  id: string;
  title: string;
}

const SECTIONS: SectionInfo[] = [
  { id: 'intro', title: 'C\'est quoi DropZone DJ ?' },
  { id: 'uploader', title: 'Uploader un son' },
  { id: 'ecouter', title: 'Écouter et liker' },
  { id: 'partager', title: 'Partager un son' },
  { id: 'live', title: 'Le Live DJ' },
  { id: 'profil', title: 'Ton profil artiste' },
  { id: 'regles', title: 'Les règles de la communauté' },
  { id: 'aide', title: 'Besoin d\'aide ?' },
];

// ✅ Type pour les couleurs (partagé entre le parent et les enfants)
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
}

export const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors: ThemeColors = {
    bg: isDark ? '#121212' : '#f5f5f7',
    panelBg: isDark ? '#181818' : '#ffffff',
    calloutBg: isDark ? '#121212' : '#f9fafb',
    border: isDark ? '#2a2a2a' : '#e5e7eb',
    borderHover: isDark ? '#444444' : '#d1d5db',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#888888' : '#666666',
    textLight: isDark ? '#cccccc' : '#333333',
    activeBg: isDark ? '#2a2a2a' : '#e5e7eb',
    activeBorder: isDark ? '#444444' : '#d1d5db',
    activeText: isDark ? '#ffffff' : '#000000',
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ 
      padding: '24px', 
      display: 'grid', 
      gap: 32, 
      background: colors.bg,
      minHeight: '100vh', 
      fontFamily: 'Inter, sans-serif', 
      color: colors.textMain,
      maxWidth: 1000,
      margin: '0 auto',
      transition: 'background 0.3s ease, color 0.3s ease'
    }}>
      
      {/* === HEADER === */}
      <div style={{ 
        background: colors.panelBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8, 
        padding: 32 
      }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', color: colors.textMain }}>
            Guide de la communauté
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
            Tout ce qu'il faut savoir pour partager, écouter et faire grandir DropZone DJ.
          </p>
        </div>

        <div style={{ 
          padding: 16, 
          background: colors.calloutBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 6, 
          fontSize: 13, 
          color: colors.textLight,
          lineHeight: 1.6 
        }}>
          💡 <strong style={{ color: colors.textMain }}>Le message clé :</strong> DropZone DJ est la plateforme où les DJs partagent leurs sons, découvrent les nouveautés, et font vibrer la communauté. 100% gratuit.
        </div>
      </div>

      {/* === SOMMAIRE === */}
      <div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
          Sommaire
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
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
                  padding: '12px 16px',
                  background: isActive ? colors.activeBg : colors.panelBg,
                  border: `1px solid ${isActive ? colors.activeBorder : colors.border}`,
                  borderRadius: 6,
                  color: isActive ? colors.activeText : colors.textMuted,
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontWeight: isActive ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = colors.activeBg;
                    e.currentTarget.style.color = colors.textMain;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = colors.panelBg;
                    e.currentTarget.style.color = colors.textMuted;
                  }
                }}
              >
                <span style={{ fontSize: 12, color: isActive ? colors.activeText : colors.textMuted, fontWeight: 700 }}>0{i + 1}</span>
                <span style={{ flex: 1 }}>{section.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* === SECTIONS DE CONTENU === */}
      <div style={{ display: 'grid', gap: 24 }}>
        
        {/* SECTION 1 : INTRO */}
        <Section id="intro" title="C'est quoi DropZone DJ ?" colors={colors}>
          <p>
            <strong>DropZone DJ</strong> est une plateforme de partage musical dédiée aux DJs et producteurs.
          </p>
          <ul>
            <li>🎵 Partage tes <strong>morceaux</strong> (originaux, remixes, edits, promos)</li>
            <li>🎧 <strong>Écoute</strong> les nouveautés de la communauté</li>
            <li>❤️ <strong>Like</strong> et commente les sons que tu aimes</li>
            <li>📤 <strong>Partage</strong> tes coups de cœur sur les réseaux sociaux</li>
            <li>🔴 Rejoins le <strong>Live DJ</strong> pour écouter les émissions en direct</li>
            <li>💬 <strong>Échange</strong> avec les autres DJs via le chat</li>
          </ul>
          <Callout title="100% gratuit" colors={colors}>
            DropZone DJ est <strong>entièrement gratuit</strong> pour tous les DJs. Pas d'abonnement, pas de frais cachés.
          </Callout>
        </Section>

        {/* SECTION 2 : UPLOADER */}
        <Section id="uploader" title="Comment uploader un son ?" colors={colors}>
          <p>Pour partager ta musique, rien de plus simple :</p>
          
          <Step number={1} title="Va sur la page Nouveautés" items={[
            'Clique sur "Nouveautés" dans le menu de gauche.',
            'En haut de la page, tu verras une zone "Partager un nouveau son".',
          ]} colors={colors} />
          
          <Step number={2} title="Clique sur + UPLOADER" items={[
            'Sélectionne ton fichier audio (MP3, WAV, etc.).',
            'Le système analyse automatiquement ton morceau : BPM, tonalité, durée.',
          ]} colors={colors} />
          
          <Step number={3} title="Vérifie les infos" items={[
            'Le titre et l\'artiste sont détectés automatiquement (via les tags ID3).',
            'Le BPM et la tonalité sont calculés par l\'IA.',
            'Tu peux modifier ces infos après l\'upload via le bouton ✏️.',
          ]} colors={colors} />
          
          <Step number={4} title="Ton son est en ligne !" items={[
            'Ton morceau apparaît dans la page Nouveautés.',
            'Il est visible par toute la communauté.',
            'Tu peux le partager sur les réseaux sociaux avec le bouton 🔗.',
          ]} colors={colors} />

          <Callout title="Formats acceptés" colors={colors}>
            MP3, WAV, FLAC, OGG, M4A. Le MP3 est recommandé pour un chargement rapide.
          </Callout>
        </Section>

        {/* SECTION 3 : ECOUTER */}
        <Section id="ecouter" title="Comment écouter et liker ?" colors={colors}>
          <p>Pour écouter un morceau, plusieurs options :</p>

          <FeatureGrid>
            <Feature icon="▶" title="Bouton Play" description="Clique sur le bouton Play au centre de la pochette." colors={colors} />
            <Feature icon="🎵" title="Carte entière" description="Clique sur la carte pour ouvrir la page du morceau." colors={colors} />
            <Feature icon="❤️" title="Liker" description="Clique sur le cœur pour liker (il faut être connecté)." colors={colors} />
            <Feature icon="🔊" title="Lecteur global" description="La barre en bas affiche le morceau en cours de lecture." colors={colors} />
          </FeatureGrid>

          <Callout title="Le lecteur global" colors={colors}>
            En bas de l'écran, tu as un lecteur qui te permet de :
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>Voir la <strong>waveform</strong> du morceau</li>
              <li><strong>Pause/Play</strong> à tout moment</li>
              <li><strong>Avancer/reculer</strong> en cliquant sur la waveform</li>
              <li>Voir la <strong>pochette</strong>, le titre et l'artiste</li>
              <li><strong>Télécharger</strong> le morceau (si connecté)</li>
            </ul>
          </Callout>
        </Section>

        {/* SECTION 4 : PARTAGER */}
        <Section id="partager" title="Comment partager un son ?" colors={colors}>
          <p>Pour partager un morceau avec tes amis ou sur les réseaux sociaux :</p>
          
          <Step number={1} title="Clique sur le bouton Partager" items={[
            'Sur la page du morceau, clique sur le bouton "Partager".',
            'Sur la page d\'accueil ou Nouveautés, clique sur l\'icône 🔗 qui apparaît au survol de la carte.',
          ]} colors={colors} />
          
          <Step number={2} title="Choisis ta plateforme" items={[
            'Facebook, Twitter/X, WhatsApp, Telegram, LinkedIn, Reddit...',
            'Ou clique sur "Copier le lien" pour partager manuellement.',
          ]} colors={colors} />

          <Callout title="Aperçu automatique" colors={colors}>
            Quand tu partages un lien, les réseaux sociaux affichent automatiquement :
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>La <strong>pochette</strong> du morceau</li>
              <li>Le <strong>titre</strong> et l'<strong>artiste</strong></li>
              <li>La <strong>description</strong> avec le lien vers DropZone DJ</li>
            </ul>
          </Callout>
        </Section>

        {/* SECTION 5 : LIVE */}
        <Section id="live" title="Le Live DJ" colors={colors}>
          <p>DropZone DJ propose aussi un <strong>Live DJ</strong> où tu peux :</p>
          <ul>
            <li>🎙️ Écouter les émissions en direct</li>
            <li>💬 Discuter avec les autres auditeurs dans le chat</li>
            <li>🎧 Voir le live en streaming vidéo</li>
            <li>🔴 Rejoindre l'antenne pour mixer en direct</li>
          </ul>

          <Step number={1} title="Va sur la page Live DJ" items={[
            'Clique sur "Live DJ" dans le menu de gauche.',
          ]} colors={colors} />
          
          <Step number={2} title="Regarde le live" items={[
            'Le lecteur Tviply s\'affiche au centre de la page.',
            'Le chat est à droite pour discuter avec la communauté.',
          ]} colors={colors} />
          
          <Step number={3} title="Partage le live" items={[
            'Clique sur "Partager" en haut à droite.',
            'Les réseaux sociaux afficheront l\'affiche "ON AIR" personnalisée.',
          ]} colors={colors} />
        </Section>

        {/* SECTION 6 : PROFIL */}
        <Section id="profil" title="Ton profil artiste" colors={colors}>
          <p>Sur ton profil, tu peux :</p>
          <ul>
            <li>🖼️ Changer ta <strong>bannière</strong> et ton <strong>avatar</strong></li>
            <li>✏️ Modifier ton <strong>nom d'artiste</strong>, ta <strong>ville</strong>, ton <strong>pays</strong> et ta <strong>bio</strong></li>
            <li>🎵 Voir tous tes <strong>morceaux</strong> uploadés</li>
            <li>📁 Créer des <strong>playlists</strong> avec tes sons préférés</li>
            <li>💬 Poster des <strong>messages</strong> sur ton mur</li>
            <li>👥 Voir tes <strong>followers</strong> et tes <strong>stats</strong> (plays, tracks)</li>
          </ul>

          <Callout title="Accède à ton profil" colors={colors}>
            Clique sur ton nom en bas de la barre latérale gauche, ou dans le menu mobile.
          </Callout>
        </Section>

        {/* SECTION 7 : REGLES */}
        <Section id="regles" title="Les règles de la communauté" colors={colors}>
          <Mistake problem="Uploader du contenu protégé par le copyright" solution="Ne partage que tes propres productions, remixes, edits et promos autorisés. Pas de contenu piraté." colors={colors} />
          <Mistake problem="Spammer ou faire de la pub abusive" solution="Pas de spam dans les commentaires ou les messages. La communauté doit rester accueillante." colors={colors} />
          <Mistake problem="Manquer de respect aux autres DJs" solution="Sois respectueux dans tes commentaires et tes messages. Pas d'insultes, pas de harcèlement." colors={colors} />
          <Mistake problem="Partager sa clé RTMP publiquement" solution="Ne partage JAMAIS ta clé de flux RTMP. Elle permet à n'importe qui de diffuser sur DropZone DJ Live." colors={colors} />
        </Section>

        {/* SECTION 8 : AIDE */}
        <Section id="aide" title="Besoin d'aide ?" colors={colors}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain, marginBottom: 8 }}>💬 Communauté Discord</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
                <li>Rejoins le Discord officiel de DropZone DJ pour discuter avec les autres DJs.</li>
                <li>Pose tes questions, partage tes sons, donne ton avis.</li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain, marginBottom: 8 }}>📧 Contact</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
                <li>Un bug ? Une suggestion ? Contacte-nous à <strong>contact@dropzone-dj.com</strong></li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain, marginBottom: 8 }}>📚 Ressources</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
                <li>Guide pour bien débuter sur DropZone DJ (cette page).</li>
                <li>Tutoriels vidéo sur la chaîne YouTube officielle.</li>
              </ul>
            </div>
          </div>
        </Section>
      </div>

      {/* === FOOTER INFO === */}
      <div style={{ 
        padding: 32, 
        background: colors.panelBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8, 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎵</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.textMain, marginBottom: 8 }}>Le message à retenir</div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
          DropZone DJ : la plateforme gratuite où les DJs partagent leurs sons et font vibrer la communauté.
        </div>
        <div style={{ 
          fontSize: 11, 
          color: colors.textMuted,
          padding: '8px 16px', 
          background: colors.calloutBg,
          borderRadius: 6, 
          display: 'inline-block', 
          fontFamily: 'monospace',
          border: `1px solid ${colors.border}`
        }}>
          Upload → Écoute → Like → Partage → Live
        </div>
      </div>

      {/* ✅ CSS INJECTÉ AVEC VARIABLES POUR LE THEME */}
      <style>{`
        .help-section ul { margin: 8px 0; padding-left: 24px; color: var(--text-muted); }
        .help-section li { margin: 6px 0; }
        .help-section p { margin: 8px 0; color: var(--text-muted); }
        .help-section strong { color: var(--text-main); }
      `}</style>
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS (avec couleurs dynamiques en props)
   ============================================================ */

const Section: React.FC<{ id: string; title: string; children: React.ReactNode; colors: ThemeColors }> = ({ id, title, children, colors }) => (
  <div 
    id={id} 
    className="help-section"
    style={{ 
      background: colors.panelBg,
      border: `1px solid ${colors.border}`,
      borderRadius: 8, 
      padding: 32,
      scrollMarginTop: 24,
      // ✅ On passe les couleurs au CSS injecté via des variables
      ['--text-main' as any]: colors.textMain,
      ['--text-muted' as any]: colors.textMuted,
    }}
  >
    <h2 style={{ margin: '0 0 24px 0', fontSize: 20, fontWeight: 700, color: colors.textMain }}>
      {title}
    </h2>
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {children}
    </div>
  </div>
);

const Callout: React.FC<{ title: string; children: React.ReactNode; colors: ThemeColors }> = ({ title, children, colors }) => (
  <div style={{ margin: '20px 0', padding: 20, background: colors.calloutBg, border: `1px solid ${colors.border}`, borderRadius: 6 }}>
    <div style={{ fontSize: 13, fontWeight: 600, color: '#00d9ff', marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>{children}</div>
  </div>
);

const FeatureGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, margin: '20px 0' }}>
    {children}
  </div>
);

const Feature: React.FC<{ icon: string; title: string; description: string; colors: ThemeColors }> = ({ icon, title, description, colors }) => (
  <div style={{ padding: 16, background: colors.calloutBg, border: `1px solid ${colors.border}`, borderRadius: 6 }}>
    <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMain, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.5 }}>{description}</div>
  </div>
);

const Step: React.FC<{ number: number; title: string; items: string[]; colors: ThemeColors }> = ({ number, title, items, colors }) => (
  <div style={{ marginBottom: 24, paddingLeft: 24, position: 'relative' }}>
    <div style={{ position: 'absolute', left: 8, top: 24, bottom: -24, width: 1, background: colors.border }} />
    
    <div style={{ 
      position: 'absolute', left: 0, top: 0, 
      width: 18, height: 18, borderRadius: '50%', 
      background: colors.activeBg,
      border: `1px solid ${colors.activeBorder}`,
      color: colors.textMain,
      fontSize: 10, fontWeight: 600, 
      display: 'flex', alignItems: 'center', justifyContent: 'center' 
    }}>
      {number}
    </div>
    
    <div style={{ fontSize: 14, fontWeight: 600, color: colors.textMain, marginBottom: 8, paddingTop: 1 }}>{title}</div>
    
    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
      {items.map((item, i) => (<li key={i}>{item}</li>))}
    </ul>
  </div>
);

const Mistake: React.FC<{ problem: string; solution: string; colors: ThemeColors }> = ({ problem, solution, colors }) => (
  <div style={{ marginBottom: 16, padding: 20, background: colors.calloutBg, border: `1px solid ${colors.border}`, borderRadius: 6 }}>
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <span style={{ color: '#ff3366', fontWeight: 700, fontSize: 14 }}>✕</span>
      <span style={{ fontSize: 13, color: colors.textMain, fontWeight: 600 }}>{problem}</span>
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      <span style={{ color: '#00ff88', fontWeight: 700, fontSize: 14 }}>✓</span>
      <span style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>{solution}</span>
    </div>
  </div>
);