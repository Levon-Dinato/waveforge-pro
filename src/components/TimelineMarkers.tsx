import type { Section } from '../audio/sectionDetector';

interface Props {
  sections: Section[];
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
}

export function TimelineMarkers({
  sections,
  duration,
  currentTime,
  onSeek,
}: Props) {
  if (sections.length === 0 || duration <= 0) return null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 26,
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {sections.map((section) => {
        const leftPercent = (section.start / duration) * 100;
        const widthPercent = (section.duration / duration) * 100;
        const isActive =
          currentTime >= section.start && currentTime < section.end;

        return (
          <div
            key={section.id}
            onClick={() => onSeek(section.start)}
            title={`${section.label} — ${section.duration.toFixed(1)}s`}
            style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              top: 0,
              bottom: 0,
              background: isActive ? `${section.color}30` : 'transparent',
              borderLeft: `2px solid ${section.color}`,
              borderRight: `1px solid ${section.color}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
              overflow: 'hidden',
            }}
          >
            <span
              className="label-uppercase"
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: section.color,
                opacity: isActive ? 1 : 0.75,
                textShadow: isActive ? `0 0 8px ${section.color}` : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 4px',
              }}
            >
              {section.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}