// src/pages/HelpPage.tsx
import React, { useState } from 'react';

interface Section {
  id: string;
  icon: string;
  title: string;
  color: string;
}

const SECTIONS: Section[] = [
  { id: 'intro', icon: '🎯', title: 'C\'est quoi une mélodie MIDI ?', color: '#00d9ff' },
  { id: 'midi', icon: '📄', title: 'Le fichier MIDI', color: '#7c5cff' },
  { id: 'workflow', icon: '🚀', title: 'Le workflow en 5 étapes', color: '#ff5cf0' },
  { id: 'logiciels', icon: '💻', title: 'Logiciels compatibles', color: '#00ff88' },
  { id: 'erreurs', icon: '⚠️', title: 'Erreurs courantes', color: '#ff3366' },
  { id: 'recettes', icon: '🍳', title: 'Recettes pour débuter', color: '#ffd43b' },
  { id: 'instruments', icon: '🎹', title: 'Instruments gratuits', color: '#00d9ff' },
  { id: 'aide', icon: '🆘', title: 'Où trouver de l\'aide', color: '#888' },
];

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
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* === HEADER === */}
      <div
        className="panel"
        style={{
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          background:
            'linear-gradient(135deg, rgba(0, 217, 255, 0.06) 0%, rgba(124, 92, 255, 0.04) 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(0, 217, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 32 }}>📖</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                Guide d'utilisation
              </h2>
              <p style={{ color: '#888', fontSize: 12, margin: 0, marginTop: 2 }}>
                Tout ce qu'il faut savoir pour débuter avec WaveForge
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.25)',
              borderRadius: 8,
              fontSize: 12,
              color: '#ccc',
              lineHeight: 1.6,
            }}
          >
            💡 <strong style={{ color: '#00d9ff' }}>Message clé :</strong> WaveForge
            écrit la partition. Ton logiciel de musique la joue. Toi, tu deviens le
            chef d'orchestre.
          </div>
        </div>
      </div>

      {/* === SOMMAIRE === */}
      <div>
        <div
          className="label-uppercase"
          style={{
            fontSize: 10,
            color: '#666',
            marginBottom: 12,
            letterSpacing: '1px',
          }}
        >
          📑 SOMMAIRE
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
          }}
        >
          {SECTIONS.map((section, i) => (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background:
                  activeSection === section.id
                    ? `${section.color}15`
                    : 'var(--bg-1)',
                border:
                  activeSection === section.id
                    ? `1px solid ${section.color}`
                    : '1px solid var(--border)',
                borderRadius: 6,
                color: activeSection === section.id ? section.color : '#ccc',
                cursor: 'pointer',
                fontSize: 11,
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>{section.icon}</span>
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    color: '#666',
                    fontSize: 9,
                    display: 'block',
                    marginBottom: 2,
                  }}
                >
                  {i + 1}.
                </span>
                {section.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1 : INTRO */}
      {/* ============================================================ */}
      <Section id="intro" icon="🎯" title="C'est quoi une mélodie MIDI ?" color="#00d9ff">
        <p>
          Imagine que tu écris une chanson sur une <strong>feuille de papier</strong> :
        </p>
        <ul>
          <li>📝 Tu écris les <strong>notes</strong> : Do, Ré, Mi, Fa...</li>
          <li>📝 Tu indiques <strong>quand</strong> les jouer (temps 1, temps 2...)</li>
          <li>📝 Tu précises <strong>combien de temps</strong> chaque note dure</li>
          <li>❌ <strong>Mais la feuille ne fait aucun son !</strong></li>
        </ul>

        <Callout type="info" title="WaveForge fait la même chose">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>✅ Il invente les <strong>notes</strong> de ta mélodie</li>
            <li>✅ Il décide <strong>quand</strong> elles se jouent</li>
            <li>❌ <strong>Mais il ne joue aucun son</strong></li>
          </ul>
        </Callout>

        <p>
          C'est <strong>TOI</strong> qui vas donner vie à ces notes en les mettant dans
          un logiciel de musique (Ableton, FL Studio, etc.) avec l'<strong>instrument de ton choix</strong>.
        </p>

        <Callout type="success" title="Analogie simple">
          <div style={{ display: 'grid', gap: 6 }}>
            <div>🎼 <strong>WaveForge</strong> = le compositeur qui écrit la partition</div>
            <div>🎹 <strong>Ableton / FL Studio</strong> = l'orchestre qui joue la partition</div>
            <div>👤 <strong>Toi</strong> = le chef d'orchestre qui choisit l'instrument</div>
          </div>
        </Callout>
      </Section>

      {/* ============================================================ */}
      {/* SECTION 2 : MIDI */}
      {/* ============================================================ */}
      <Section id="midi" icon="📄" title="Le fichier MIDI, c'est quoi ?" color="#7c5cff">
        <p>
          Un fichier <strong>.mid</strong> (MIDI) est comme un <strong>fichier texte universel</strong> pour la musique :
        </p>

        <FeatureGrid>
          <Feature icon="📦" title="Minuscule" description="Quelques Ko (contre plusieurs Mo pour un MP3)" />
          <Feature icon="🌍" title="Universel" description="Compatible avec TOUS les logiciels de musique" />
          <Feature icon="✏️" title="Éditable" description="Tu peux modifier chaque note après import" />
          <Feature icon="🎨" title="Flexible" description="Le même fichier peut être joué par n'importe quel instrument" />
        </FeatureGrid>

        <p style={{ marginTop: 12, color: '#888', fontStyle: 'italic', fontSize: 11 }}>
          💡 C'est le format standard du monde de la musique depuis 1983.
        </p>
      </Section>

      {/* ============================================================ */}
      {/* SECTION 3 : WORKFLOW */}
      {/* ============================================================ */}
      <Section id="workflow" icon="🚀" title="Le workflow en 5 étapes" color="#ff5cf0">
        <Step
          number={1}
          title="Générer dans WaveForge"
          color="#ff5cf0"
          items={[
            'Ouvre WaveForge (site ou app)',
            'Va sur "Générateur"',
            'Choisis un style : Pop, Trap, Lo-Fi, Drill, House',
            'Règle la complexité (1 = simple, 10 = complexe)',
            'Clique sur GÉNÉRER',
            'Écoute la démo avec le bouton LIRE',
            'Si ça te plaît : clique sur EXPORT MIDI',
            'Un fichier "waveforge.mid" sera téléchargé',
          ]}
        />

        <Step
          number={2}
          title="Ouvrir ton logiciel de musique"
          color="#00d9ff"
          items={[
            'Lance le logiciel que tu utilises :',
            '→ Ableton Live, FL Studio, Logic Pro, GarageBand, Cubase, Bitwig...',
            'Si tu n\'en as pas, installe un gratuit : GarageBand (Mac/iOS), LMMS, Waveform Free, Reaper',
          ]}
        />

        <Step
          number={3}
          title="Importer le fichier MIDI"
          color="#00ff88"
          items={[
            'Méthode universelle :',
            '1. Ouvre un nouveau projet',
            '2. Crée une piste MIDI (ou instrument track)',
            '3. Glisse-dépose le fichier .mid dessus',
            '4. Les notes apparaissent dans le piano-roll !',
          ]}
        >
          <div
            style={{
              marginTop: 10,
              padding: 12,
              background: 'var(--bg-1)',
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <div style={{ color: '#888', marginBottom: 8, fontWeight: 600 }}>
              Import selon le logiciel :
            </div>
            <div style={{ display: 'grid', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
              <div><span style={{ color: '#00d9ff' }}>Ableton</span> → Fichier &gt; Importer &gt; Fichier MIDI</div>
              <div><span style={{ color: '#00d9ff' }}>FL Studio</span> → Glisse sur la playlist ou Channel Rack</div>
              <div><span style={{ color: '#00d9ff' }}>Logic</span> → Fichier &gt; Importer &gt; MIDI</div>
              <div><span style={{ color: '#00d9ff' }}>GarageBand</span> → Fichier &gt; Importer &gt; MIDI</div>
              <div><span style={{ color: '#00d9ff' }}>Cubase</span> → Fichier &gt; Importer &gt; MIDI File</div>
            </div>
          </div>
        </Step>

        <Step
          number={4}
          title="Choisir un instrument"
          color="#ffd43b"
          items={[
            'C\'est LA partie importante — c\'est là que le son apparaît !',
            'Sans instrument = notes silencieuses',
            'Avec instrument = musique !',
          ]}
        >
          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            <InstrumentBox
              name="Ableton"
              items={[
                { label: 'Piano', value: 'Grand Piano' },
                { label: 'Synthé', value: 'Analog, Operator' },
                { label: 'Basse', value: 'Bass' },
              ]}
            />
            <InstrumentBox
              name="FL Studio"
              items={[
                { label: 'Piano', value: 'FL Keys' },
                { label: 'Synthé', value: '3xOsc, Sytrus' },
                { label: 'Basse', value: 'BooBass' },
              ]}
            />
            <InstrumentBox
              name="GarageBand"
              items={[
                { label: 'Piano', value: 'Classic Piano' },
                { label: 'Synthé', value: 'Synth Pad' },
                { label: 'Cordes', value: 'String Ensemble' },
              ]}
            />
          </div>
        </Step>

        <Step
          number={5}
          title="Ajuster et produire"
          color="#7c5cff"
          items={[
            'Modifier les notes (enlever/ajouter)',
            'Changer l\'instrument en cours de route',
            'Ajouter des effets : reverb, delay, filtre',
            'Looper la mélodie pour en faire un beat',
            'Ajouter des drums par-dessus',
            'Ajouter une basse complémentaire',
          ]}
        >
          <p style={{ marginTop: 10, color: '#00ff88', fontSize: 12, fontWeight: 600 }}>
            🎉 Tu es officiellement devenu producteur !
          </p>
        </Step>
      </Section>

      {/* ============================================================ */}
      {/* SECTION 4 : LOGICIELS */}
      {/* ============================================================ */}
      <Section id="logiciels" icon="💻" title="Logiciels compatibles" color="#00ff88">
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 10, letterSpacing: '1px' }}>LOGICIEL</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 10, letterSpacing: '1px' }}>NIVEAU</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 10, letterSpacing: '1px' }}>PRIX</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'GarageBand', level: 'Débutant', color: '#00ff88', price: 'Gratuit' },
                { name: 'LMMS', level: 'Débutant', color: '#00ff88', price: 'Gratuit' },
                { name: 'Waveform Free', level: 'Intermédiaire', color: '#ffd43b', price: 'Gratuit' },
                { name: 'Ableton Live Intro', level: 'Intermédiaire', color: '#ffd43b', price: '~79 €' },
                { name: 'FL Studio', level: 'Intermédiaire', color: '#ffd43b', price: '~200 €' },
                { name: 'Logic Pro', level: 'Avancé', color: '#ff5cf0', price: '~230 €' },
                { name: 'Cubase', level: 'Avancé', color: '#ff5cf0', price: '~500 €' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px', color: '#fff', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        fontSize: 9,
                        fontWeight: 700,
                        borderRadius: 10,
                        background: `${row.color}20`,
                        color: row.color,
                        border: `1px solid ${row.color}50`,
                      }}
                    >
                      {row.level}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#ccc', fontFamily: 'var(--font-mono)' }}>{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout type="success" title="Ma recommandation pour débuter" style={{ marginTop: 16 }}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>GarageBand</strong> si tu es sur Mac (gratuit et parfait)</li>
            <li><strong>LMMS</strong> si tu es sur Windows (gratuit et intuitif)</li>
            <li><strong>Ableton Live Intro</strong> si tu veux passer pro</li>
          </ol>
        </Callout>
      </Section>

      {/* ============================================================ */}
      {/* SECTION 5 : ERREURS */}
      {/* ============================================================ */}
      <Section id="erreurs" icon="⚠️" title="Erreurs courantes (à éviter)" color="#ff3366">
        <Mistake
          problem="Le fichier MIDI ne produit aucun son dans WaveForge !"
          solution="Normal ! WaveForge exporte les NOTES, pas le SON. C'est comme un fichier texte : il ne se joue pas tout seul."
        />
        <Mistake
          problem="J'ai importé le MIDI mais rien ne s'entend"
          solution="Tu n'as pas mis d'INSTRUMENT sur la piste. Choisis un piano, un synthé, etc."
        />
        <Mistake
          problem="La mélodie sonne bizarre"
          solution="Essaie un autre INSTRUMENT ou change la TONALITÉ dans WaveForge."
        />
        <Mistake
          problem="C'est trop simple ou trop complexe"
          solution="Ajuste la COMPLEXITÉ dans WaveForge (1 à 10)."
        />
        <Mistake
          problem="Les 4 pistes s'affichent sur une seule piste"
          solution="Dans Ableton : clic droit puis 'Extract Chains'. Dans FL Studio : importe dans le Channel Rack au lieu de la playlist."
        />
      </Section>

      {/* ============================================================ */}
      {/* SECTION 6 : RECETTES */}
      {/* ============================================================ */}
      <Section id="recettes" icon="🍳" title="Trois recettes pour bien débuter" color="#ffd43b">
        <Recipe
          title="Ma première mélodie Pop"
          color="#ff5cf0"
          steps={[
            'WaveForge → Générateur → Pop',
            'Complexité : 5/10',
            'Tonalité : Do majeur',
            'Mesures : 8',
            'Générer → Écouter → Export MIDI',
            'Ableton ou GarageBand : glisse le fichier',
            'Instrument : Grand Piano',
          ]}
          result="Tu as une mélodie pop !"
        />

        <Recipe
          title="Ma première Trap"
          color="#ff3366"
          steps={[
            'WaveForge → Générateur → Trap',
            'Complexité : 7/10',
            'Tonalité : La mineur',
            'Mesures : 16',
            'Générer → Export MIDI',
            'FL Studio → Channel Rack',
            'Instrument : 3xOsc (synthé)',
            'Ajoute un kick 808 + hihats par-dessus',
          ]}
          result="Tu as une trap !"
        />

        <Recipe
          title="Ma première Lo-Fi"
          color="#ffd43b"
          steps={[
            'WaveForge → Générateur → Lo-Fi',
            'Complexité : 4/10',
            'Tonalité : Ré majeur',
            'Mesures : 8',
            'Export MIDI',
            'GarageBand : glisse le fichier',
            'Instrument : Electric Piano',
            'Ajoute un filtre Lo-Fi + reverb',
          ]}
          result="Tu as un beat Lo-Fi chill !"
        />
      </Section>

      {/* ============================================================ */}
      {/* SECTION 7 : INSTRUMENTS */}
      {/* ============================================================ */}
      <Section id="instruments" icon="🎹" title="Où trouver des instruments gratuits ?" color="#00d9ff">
        <p>Si tu débutes et que tu n'as pas d'instruments, voici des ressources gratuites :</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 10,
            marginTop: 12,
          }}
        >
          {[
            { name: 'Spitfire LABS', desc: 'Piano, cordes, synthés', url: 'labs.spitfireaudio.com' },
            { name: 'Vital', desc: 'Synthé très puissant', url: 'vital.audio' },
            { name: 'Decent Sampler', desc: 'Des centaines de sons', url: 'decentsamples.com' },
            { name: 'Ample Bass P Lite', desc: 'Basse gratuite', url: 'amplesound.net' },
            { name: 'DrumMic\'a', desc: 'Batterie gratuite', url: 'sennheiser.com/drummica' },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                padding: 12,
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00d9ff', marginBottom: 4 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>{item.desc}</div>
              <div className="mono" style={{ fontSize: 9, color: '#666' }}>{item.url}</div>
            </div>
          ))}
        </div>

        <Callout type="info" title="Banques de sons intégrées" style={{ marginTop: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>Ableton</strong> : une centaine d'instruments et effets</li>
            <li><strong>FL Studio</strong> : instruments inclus avec toutes les versions</li>
            <li><strong>GarageBand</strong> : des dizaines d'instruments de qualité</li>
          </ul>
        </Callout>
      </Section>

      {/* ============================================================ */}
      {/* SECTION 8 : AIDE */}
      {/* ============================================================ */}
      <Section id="aide" icon="🆘" title="Où trouver de l'aide ?" color="#888">
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              🎥 YouTube (chaînes francophones)
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc' }}>
              <li><strong>Zurlo</strong> — Ableton FR</li>
              <li><strong>Mister V</strong> — FL Studio FR</li>
              <li><strong>Ziak</strong> — Production rap FR</li>
              <li><strong>Briac</strong> — Bases pour débutants</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              💬 Communautés
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc' }}>
              <li>Reddit : r/edmproduction, r/AbletonLive</li>
              <li>Discord : Ableton Francophone, FL Studio France</li>
              <li>Forums : Audiofanzine (FR)</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              📚 Tutoriels
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc' }}>
              <li>Ableton Learning Music (gratuit, en ligne)</li>
              <li>YouTube "Ableton pour débutants"</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* === FOOTER INFO === */}
      <div
        style={{
          padding: 20,
          background:
            'linear-gradient(135deg, rgba(0, 217, 255, 0.05), rgba(124, 92, 255, 0.03))',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>🎵</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          Le message à retenir
        </div>
        <div style={{ fontSize: 12, color: '#00d9ff', fontWeight: 600, marginBottom: 12 }}>
          WaveForge écrit la partition. Ton logiciel la joue. Toi, tu deviens le chef d'orchestre.
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: '#888',
            padding: '8px 12px',
            background: 'var(--bg-1)',
            borderRadius: 6,
            display: 'inline-block',
          }}
        >
          WaveForge → fichier .mid → Ableton/FL/... → Musique !
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const Section: React.FC<{
  id: string;
  icon: string;
  title: string;
  color: string;
  children: React.ReactNode;
}> = ({ id, icon, title, color, children }) => (
  <div
    id={id}
    className="panel"
    style={{
      padding: 24,
      scrollMarginTop: 20,
      borderLeft: `3px solid ${color}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>
        {title}
      </h3>
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

const Callout: React.FC<{
  type: 'info' | 'success' | 'warning';
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ type, title, children, style }) => {
  const colors = {
    info: { bg: 'rgba(0, 217, 255, 0.05)', border: 'rgba(0, 217, 255, 0.3)', color: '#00d9ff', icon: 'ℹ️' },
    success: { bg: 'rgba(0, 255, 136, 0.05)', border: 'rgba(0, 255, 136, 0.3)', color: '#00ff88', icon: '✅' },
    warning: { bg: 'rgba(255, 212, 59, 0.05)', border: 'rgba(255, 212, 59, 0.3)', color: '#ffd43b', icon: '⚠️' },
  };
  const c = colors[type];

  return (
    <div
      style={{
        margin: '12px 0',
        padding: 12,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        ...style,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: c.color, marginBottom: 6 }}>
        {c.icon} {title}
      </div>
      <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
};

const FeatureGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 10,
      margin: '12px 0',
    }}
  >
    {children}
  </div>
);

const Feature: React.FC<{ icon: string; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div
    style={{
      padding: 12,
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 6,
    }}
  >
    <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
      {title}
    </div>
    <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>{description}</div>
  </div>
);

const Step: React.FC<{
  number: number;
  title: string;
  color: string;
  items: string[];
  children?: React.ReactNode;
}> = ({ number, title, color, items, children }) => (
  <div
    style={{
      marginBottom: 16,
      paddingLeft: 16,
      borderLeft: `2px solid ${color}40`,
      position: 'relative',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: -12,
        top: 0,
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: color,
        color: '#000',
        fontSize: 11,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {number}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>
      {title}
    </div>
    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc', lineHeight: 1.7 }}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
    {children}
  </div>
);

const InstrumentBox: React.FC<{
  name: string;
  items: { label: string; value: string }[];
}> = ({ name, items }) => (
  <div
    style={{
      padding: 10,
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 6,
    }}
  >
    <div style={{ fontSize: 10, fontWeight: 700, color: '#ffd43b', marginBottom: 6, letterSpacing: '1px' }}>
      {name.toUpperCase()}
    </div>
    <div style={{ display: 'grid', gap: 4 }}>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 10, color: '#ccc' }}>
          <span style={{ color: '#888' }}>{item.label} :</span>{' '}
          <span className="mono">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const Mistake: React.FC<{ problem: string; solution: string }> = ({ problem, solution }) => (
  <div
    style={{
      marginBottom: 12,
      padding: 12,
      background: 'var(--bg-1)',
      border: '1px solid rgba(255, 51, 102, 0.2)',
      borderLeft: '3px solid #ff3366',
      borderRadius: 6,
    }}
  >
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

const Recipe: React.FC<{
  title: string;
  color: string;
  steps: string[];
  result: string;
}> = ({ title, color, steps, result }) => (
  <div
    style={{
      marginBottom: 16,
      padding: 14,
      background: 'var(--bg-1)',
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>
      {title}
    </div>
    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#ccc', lineHeight: 1.7 }}>
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
    <div
      style={{
        marginTop: 10,
        padding: '6px 10px',
        background: `${color}15`,
        borderRadius: 6,
        fontSize: 11,
        color,
        fontWeight: 600,
      }}
    >
      🎉 {result}
    </div>
  </div>
);