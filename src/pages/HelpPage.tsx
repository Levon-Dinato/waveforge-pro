// src/pages/HelpPage.tsx
import React, { useState } from 'react';

interface Section {
  id: string;
  icon: string;
  title: string;
  color: string;
}

const SECTIONS: Section[] = [
  { id: 'intro', icon: '🎯', title: 'C\'est quoi DropZone DJ ?', color: '#00d9ff' },
  { id: 'uploader', icon: '📤', title: 'Uploader un son', color: '#00ff88' },
  { id: 'ecouter', icon: '🎧', title: 'Écouter et liker', color: '#ff5cf0' },
  { id: 'partager', icon: '🔗', title: 'Partager un son', color: '#7c5cff' },
  { id: 'live', icon: '🔴', title: 'Le Live DJ', color: '#ff3366' },
  { id: 'profil', icon: '👤', title: 'Ton profil artiste', color: '#ffd43b' },
  { id: 'regles', icon: '⚠️', title: 'Les règles de la communauté', color: '#ff3366' },
  { id: 'aide', icon: '🆘', title: 'Besoin d\'aide ?', color: '#999' },
];

const PANEL_STYLE: React.CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  padding: 24,
};

export const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ padding: 20, display: 'grid', gap: 20, background: '#121212', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      
      {/* === HEADER === */}
      <div style={{ ...PANEL_STYLE, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 32 }}>📖</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                Guide de la communauté DropZone DJ
              </h2>
              <p style={{ color: '#999', fontSize: 12, margin: 0, marginTop: 2 }}>
                Tout ce qu'il faut savoir pour partager, écouter et faire grandir ta communauté.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 12, color: '#ccc', lineHeight: 1.6 }}>
            💡 <strong style={{ color: '#00d9ff' }}>Le message clé :</strong> DropZone DJ est la plateforme où les DJs partagent leurs sons, découvrent les nouveautés, et font vibrer la communauté. 100% gratuit.
          </div>
        </div>
      </div>

      {/* === SOMMAIRE === */}
      <div>
        <div style={{ fontSize: 10, color: '#999', marginBottom: 12, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>
          📑 SOMMAIRE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {SECTIONS.map((section, i) => (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: activeSection === section.id ? '#2a2a2a' : '#1c1c1c',
                border: activeSection === section.id ? '1px solid #00d9ff' : '1px solid #2a2a2a',
                borderRadius: 4,
                color: activeSection === section.id ? '#00d9ff' : '#999',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                fontWeight: activeSection === section.id ? 600 : 500,
              }}
            >
              <span style={{ fontSize: 16 }}>{section.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ color: '#666', fontSize: 9, display: 'block', marginBottom: 2 }}>{i + 1}.</span>
                {section.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1 : INTRO */}
      <Section id="intro" icon="🎯" title="C'est quoi DropZone DJ ?" color="#00d9ff">
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

        <Callout type="success" title="100% gratuit">
          DropZone DJ est <strong>entièrement gratuit</strong> pour tous les DJs. Pas d'abonnement, pas de frais cachés.
        </Callout>
      </Section>

      {/* SECTION 2 : UPLOADER */}
      <Section id="uploader" icon="📤" title="Comment uploader un son ?" color="#00ff88">
        <p>Pour partager ta musique, rien de plus simple :</p>
        <Step number={1} title="Va sur la page Nouveautés" color="#00ff88" items={[
          'Clique sur "Nouveautés" dans le menu de gauche.',
          'En haut de la page, tu verras une zone "Partager un nouveau son".',
        ]} />
        <Step number={2} title="Clique sur + UPLOADER" color="#00d9ff" items={[
          'Sélectionne ton fichier audio (MP3, WAV, etc.).',
          'Le système analyse automatiquement ton morceau : BPM, tonalité, durée.',
        ]} />
        <Step number={3} title="Vérifie les infos" color="#7c5cff" items={[
          'Le titre et l\'artiste sont détectés automatiquement (via les tags ID3).',
          'Le BPM et la tonalité sont calculés par l\'IA.',
          'Tu peux modifier ces infos après l\'upload via le bouton ✏️.',
        ]} />
        <Step number={4} title="Ton son est en ligne !" color="#ff5cf0" items={[
          'Ton morceau apparaît dans la page Nouveautés.',
          'Il est visible par toute la communauté.',
          'Tu peux le partager sur les réseaux sociaux avec le bouton 🔗.',
        ]} />

        <Callout type="info" title="Formats acceptés">
          MP3, WAV, FLAC, OGG, M4A. Le MP3 est recommandé pour un chargement rapide.
        </Callout>
      </Section>

      {/* SECTION 3 : ECOUTER */}
      <Section id="ecouter" icon="🎧" title="Comment écouter et liker ?" color="#ff5cf0">
        <p>Pour écouter un morceau, plusieurs options :</p>

        <FeatureGrid>
          <Feature icon="▶" title="Bouton Play" description="Clique sur le bouton Play au centre de la pochette." />
          <Feature icon="🎵" title="Carte entière" description="Clique sur la carte pour ouvrir la page du morceau." />
          <Feature icon="❤️" title="Liker" description="Clique sur le cœur pour liker (il faut être connecté)." />
          <Feature icon="🔊" title="Lecteur global" description="La barre en bas affiche le morceau en cours de lecture." />
        </FeatureGrid>

        <Callout type="success" title="Le lecteur global">
          En bas de l'écran, tu as un lecteur qui te permet de :
          <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
            <li>Voir la <strong>waveform</strong> du morceau</li>
            <li><strong>Pause/Play</strong> à tout moment</li>
            <li><strong>Avancer/reculer</strong> en cliquant sur la waveform</li>
            <li>Voir la <strong>pochette</strong>, le titre et l'artiste</li>
            <li><strong>Télécharger</strong> le morceau (si connecté)</li>
          </ul>
        </Callout>
      </Section>

      {/* SECTION 4 : PARTAGER */}
      <Section id="partager" icon="🔗" title="Comment partager un son ?" color="#7c5cff">
        <p>Pour partager un morceau avec tes amis ou sur les réseaux sociaux :</p>
        <Step number={1} title="Clique sur le bouton Partager" color="#7c5cff" items={[
          'Sur la page du morceau, clique sur le bouton "Partager".',
          'Sur la page d\'accueil ou Nouveautés, clique sur l\'icône 🔗 qui apparaît au survol de la carte.',
        ]} />
        <Step number={2} title="Choisis ta plateforme" color="#00d9ff" items={[
          'Facebook, Twitter/X, WhatsApp, Telegram, LinkedIn, Reddit...',
          'Ou clique sur "Copier le lien" pour partager manuellement.',
        ]} />

        <Callout type="info" title="Aperçu automatique">
          Quand tu partages un lien, les réseaux sociaux affichent automatiquement :
          <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
            <li>La <strong>pochette</strong> du morceau</li>
            <li>Le <strong>titre</strong> et l'<strong>artiste</strong></li>
            <li>La <strong>description</strong> avec le lien vers DropZone DJ</li>
          </ul>
        </Callout>
      </Section>

      {/* SECTION 5 : LIVE */}
      <Section id="live" icon="🔴" title="Le Live DJ" color="#ff3366">
        <p>DropZone DJ propose aussi un <strong>Live DJ</strong> où tu peux :</p>
        <ul>
          <li>🎙️ Écouter les émissions en direct</li>
          <li>💬 Discuter avec les autres auditeurs dans le chat</li>
          <li>🎧 Voir le live en streaming vidéo</li>
          <li>🔴 Rejoindre l'antenne pour mixer en direct</li>
        </ul>

        <Step number={1} title="Va sur la page Live DJ" color="#ff3366" items={[
          'Clique sur "Live DJ" dans le menu de gauche.',
        ]} />
        <Step number={2} title="Regarde le live" color="#00d9ff" items={[
          'Le lecteur Tviply s\'affiche au centre de la page.',
          'Le chat est à droite pour discuter avec la communauté.',
        ]} />
        <Step number={3} title="Partage le live" color="#ff5cf0" items={[
          'Clique sur "Partager" en haut à droite.',
          'Les réseaux sociaux afficheront l\'affiche "ON AIR" personnalisée.',
        ]} />
      </Section>

      {/* SECTION 6 : PROFIL */}
      <Section id="profil" icon="👤" title="Ton profil artiste" color="#ffd43b">
        <p>Sur ton profil, tu peux :</p>
        <ul>
          <li>🖼️ Changer ta <strong>bannière</strong> et ton <strong>avatar</strong></li>
          <li>✏️ Modifier ton <strong>nom d'artiste</strong>, ta <strong>ville</strong>, ton <strong>pays</strong> et ta <strong>bio</strong></li>
          <li>🎵 Voir tous tes <strong>morceaux</strong> uploadés</li>
          <li>📁 Créer des <strong>playlists</strong> avec tes sons préférés</li>
          <li>💬 Poster des <strong>messages</strong> sur ton mur</li>
          <li>👥 Voir tes <strong>followers</strong> et tes <strong>stats</strong> (plays, tracks)</li>
        </ul>

        <Callout type="info" title="Accède à ton profil">
          Clique sur ton nom en bas de la barre latérale gauche, ou dans le menu mobile.
        </Callout>
      </Section>

      {/* SECTION 7 : REGLES */}
      <Section id="regles" icon="⚠️" title="Les règles de la communauté" color="#ff3366">
        <Mistake problem="Uploader du contenu protégé par le copyright" solution="Ne partage que tes propres productions, remixes, edits et promos autorisés. Pas de contenu piraté." />
        <Mistake problem="Spammer ou faire de la pub abusive" solution="Pas de spam dans les commentaires ou les messages. La communauté doit rester accueillante." />
        <Mistake problem="Manquer de respect aux autres DJs" solution="Sois respectueux dans tes commentaires et tes messages. Pas d'insultes, pas de harcèlement." />
        <Mistake problem="Partager sa clé RTMP publiquement" solution="Ne partage JAMAIS ta clé de flux RTMP. Elle permet à n'importe qui de diffuser sur DropZone DJ Live." />
      </Section>

      {/* SECTION 8 : AIDE */}
      <Section id="aide" icon="🆘" title="Besoin d'aide ?" color="#999">
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>💬 Communauté Discord</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc' }}>
              <li>Rejoins le Discord officiel de DropZone DJ pour discuter avec les autres DJs.</li>
              <li>Pose tes questions, partage tes sons, donne ton avis.</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>📧 Contact</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc' }}>
              <li>Un bug ? Une suggestion ? Contacte-nous à <strong>contact@dropzone-dj.com</strong></li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>📚 Ressources</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc' }}>
              <li>Guide pour bien débuter sur DropZone DJ (cette page).</li>
              <li>Tutoriels vidéo sur la chaîne YouTube officielle.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* === FOOTER INFO === */}
      <div style={{ padding: 20, background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🎵</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Le message à retenir</div>
        <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 600, marginBottom: 12 }}>
          DropZone DJ : la plateforme gratuite où les DJs partagent leurs sons et font vibrer la communauté.
        </div>
        <div style={{ fontSize: 10, color: '#999', padding: '8px 12px', background: '#121212', borderRadius: 6, display: 'inline-block', fontFamily: 'monospace' }}>
          Upload → Écoute → Like → Partage → Live
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const Section: React.FC<{ id: string; icon: string; title: string; color: string; children: React.ReactNode }> = ({ id, icon, title, color, children }) => (
  <div id={id} style={{ ...PANEL_STYLE, scrollMarginTop: 20, borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{title}</h3>
    </div>
    <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.7 }}>
      <style>{`
        #${id} ul { margin: 8px 0; padding-left: 20px; }
        #${id} li { margin: 4px 0; }
        #${id} p { margin: 8px 0; }
        #${id} strong { color: #fff; }
      `}</style>
      {children}
    </div>
  </div>
);

const Callout: React.FC<{ type: 'info' | 'success' | 'warning'; title: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ type, title, children, style }) => {
  const colors = {
    info: { bg: 'rgba(0, 217, 255, 0.05)', border: 'rgba(0, 217, 255, 0.3)', color: '#00d9ff', icon: 'ℹ️' },
    success: { bg: 'rgba(0, 255, 136, 0.05)', border: 'rgba(0, 255, 136, 0.3)', color: '#00ff88', icon: '✅' },
    warning: { bg: 'rgba(255, 212, 59, 0.05)', border: 'rgba(255, 212, 59, 0.3)', color: '#ffd43b', icon: '⚠️' },
  };
  const c = colors[type];

  return (
    <div style={{ margin: '12px 0', padding: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, ...style }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: c.color, marginBottom: 6 }}>{c.icon} {title}</div>
      <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
};

const FeatureGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, margin: '12px 0' }}>{children}</div>
);

const Feature: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div style={{ padding: 12, background: '#121212', border: '1px solid #2a2a2a', borderRadius: 6 }}>
    <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 10, color: '#999', lineHeight: 1.5 }}>{description}</div>
  </div>
);

const Step: React.FC<{ number: number; title: string; color: string; items: string[]; children?: React.ReactNode }> = ({ number, title, color, items, children }) => (
  <div style={{ marginBottom: 16, paddingLeft: 16, borderLeft: `2px solid ${color}40`, position: 'relative' }}>
    <div style={{ position: 'absolute', left: -12, top: 0, width: 22, height: 22, borderRadius: '50%', background: color, color: '#000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{number}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{title}</div>
    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc', lineHeight: 1.7 }}>
      {items.map((item, i) => (<li key={i}>{item}</li>))}
    </ul>
    {children}
  </div>
);

const Mistake: React.FC<{ problem: string; solution: string }> = ({ problem, solution }) => (
  <div style={{ marginBottom: 12, padding: 12, background: '#121212', border: '1px solid #2a2a2a', borderLeft: '3px solid #ff3366', borderRadius: 6 }}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
      <span style={{ color: '#ff3366', fontWeight: 700, fontSize: 12 }}>❌</span>
      <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{problem}</span>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#00ff88', fontWeight: 700, fontSize: 12 }}>✅</span>
      <span style={{ fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>{solution}</span>
    </div>
  </div>
);