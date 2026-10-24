// Dans PremiumPage.tsx, cherche la section "Dernières Sorties" et remplace le map par ceci :

{tracks.length > 0 ? (
  tracks.map((track) => {
    const isPlayable = track.audio_url && track.audio_url.length > 0;
    const hasEmbed = track.embed_code && track.embed_code.includes('<iframe');

    return (
      <div key={track.id} style={{ marginBottom: 20 }}>
        <div 
          className="track-row" 
          onClick={() => isPlayable && handlePlayTrack(track)}
          style={{ cursor: isPlayable ? 'pointer' : 'default', borderBottom: hasEmbed ? 'none' : '1px solid var(--border)' }}
        >
          
          <div className="track-play" style={{ cursor: isPlayable ? 'pointer' : 'default' }}>
            {isPlayable ? (
              currentTrack?.id === track.id && isPlaying ? '⏸' : '▶'
            ) : (
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#00d9ff' }}>EXT</span>
            )}
          </div>
          
          <div className="track-info">
            <h4>{track.title}</h4>
            <p>{track.artist}</p>
          </div>
          
          <div className="track-genre">{track.genre}</div>
          
          <div style={{ textAlign: 'right' }}>
            {isPlayable ? (
              <span className="track-bpm">{track.bpm} BPM</span>
            ) : track.purchase_url ? (
              <a href={track.purchase_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ background: themeColor, color: '#000', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', textDecoration: 'none' }}>
                ACHETER
              </a>
            ) : null}
          </div>
        </div>

        {/* ✅ AFFICHAGE DU LECTEUR BEATPORT (Si le code iframe est présent) */}
        {hasEmbed && (
          <div 
            style={{ padding: '0 0 20px 0', display: 'flex', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: track.embed_code }} 
          />
        )}
      </div>
    );
  })
) : (
  <div style={{ padding: '20px', color: '#888' }}>Aucune musique pour le moment.</div>
)}