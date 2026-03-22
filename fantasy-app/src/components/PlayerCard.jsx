import React, { useState } from 'react';

/**
 * PlayerCard.jsx
 *
 * Displays a single player with their image, name, role and team.
 * Falls back to /default-player.png if the image fails to load.
 *
 * Props:
 *   player  {id, name, role, team, image_url}
 *   selected  bool   – whether the player is currently selected
 *   onClick   fn     – called when the card is clicked
 */

// Role display config
const ROLE_CONFIG = {
  WK:   { label: 'WK',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  BAT:  { label: 'BAT', color: '#22c55e', bg: 'rgba(34,197,94,0.15)'   },
  AR:   { label: 'AR',  color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
  BOWL: { label: 'BOWL',color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
};

export function PlayerCard({ player, selected = false, onClick }) {
  const [imgSrc, setImgSrc] = useState(player.image_url || '/default-player.png');
  const roleConf = ROLE_CONFIG[player.role] || ROLE_CONFIG.BAT;

  return (
    <div
      className={`player-card${selected ? ' player-card--selected' : ''}`}
      onClick={() => onClick?.(player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(player)}
      aria-pressed={selected}
      aria-label={`${player.name}, ${roleConf.label}, ${player.team}`}
    >
      {/* Selection tick */}
      {selected && (
        <span className="player-card__tick" aria-hidden="true">✓</span>
      )}

      {/* Player image */}
      <div className="player-card__img-wrap">
        <img
          src={imgSrc}
          alt={player.name}
          className="player-card__img"
          onError={() => setImgSrc('/default-player.png')}
          loading="lazy"
        />
      </div>

      {/* Role badge */}
      <span
        className="player-card__role"
        style={{ color: roleConf.color, background: roleConf.bg }}
      >
        {roleConf.label}
      </span>

      {/* Info */}
      <p className="player-card__name">{player.name}</p>
      <p className="player-card__team">{player.team}</p>
    </div>
  );
}

export default PlayerCard;
