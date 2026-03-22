import React, { useState, useEffect } from 'react';
import { PlayerCard } from './PlayerCard';

/**
 * SquadGrid.jsx
 *
 * Renders a squad in a responsive grid layout.
 * Fetches players from the backend if no players prop is supplied.
 *
 * Props:
 *   matchId       number  – backend match ID (used when fetching)
 *   players       array   – pre-loaded player objects (optional)
 *   maxSelect     number  – max players user can select (default 11)
 *   onSelectionChange fn  – called with the current selection array
 */
export function SquadGrid({ matchId, players: propPlayers, maxSelect = 11, onSelectionChange }) {
  const [players,   setPlayers]   = useState(propPlayers || []);
  const [selected,  setSelected]  = useState([]);
  const [loading,   setLoading]   = useState(!propPlayers);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('ALL');

  // ── Fetch if not provided ─────────────────────────────────────────
  useEffect(() => {
    if (propPlayers) { setPlayers(propPlayers); setLoading(false); return; }
    if (!matchId) return;

    (async () => {
      try {
        setLoading(true);
        const res  = await fetch(`/api/players/match/${matchId}`);
        const json = await res.json();
        setPlayers(json.players || []);
      } catch (e) {
        setError('Failed to load players. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId, propPlayers]);

  // ── Selection toggle ──────────────────────────────────────────────
  const togglePlayer = (player) => {
    setSelected((prev) => {
      const isIn = prev.some((p) => p.id === player.id);
      let next;
      if (isIn) {
        next = prev.filter((p) => p.id !== player.id);
      } else if (prev.length < maxSelect) {
        next = [...prev, player];
      } else {
        return prev; // already at limit
      }
      onSelectionChange?.(next);
      return next;
    });
  };

  // ── Filtered view ─────────────────────────────────────────────────
  const roles   = ['ALL', 'WK', 'BAT', 'AR', 'BOWL'];
  const visible = filter === 'ALL' ? players : players.filter((p) => p.role === filter);

  // ── Render ────────────────────────────────────────────────────────
  if (loading) return <div className="squad-status">Loading players…</div>;
  if (error)   return <div className="squad-status squad-status--error">{error}</div>;
  if (!players.length) return <div className="squad-status">No players available.</div>;

  return (
    <section className="squad-grid-wrap">

      {/* Selection counter */}
      <div className="squad-header">
        <span className="squad-count">{selected.length}/{maxSelect} selected</span>
        <div className="squad-filters">
          {roles.map((r) => (
            <button
              key={r}
              className={`squad-filter-btn${filter === r ? ' active' : ''}`}
              onClick={() => setFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Player grid */}
      <div className="squad-grid">
        {visible.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            selected={selected.some((p) => p.id === player.id)}
            onClick={togglePlayer}
          />
        ))}
      </div>

      {/* Confirm CTA */}
      {selected.length > 0 && (
        <div className="squad-confirm-bar">
          <span>{selected.length} player{selected.length !== 1 ? 's' : ''} selected</span>
          <button
            className="squad-confirm-btn"
            onClick={() => onSelectionChange?.(selected)}
            disabled={selected.length < 1}
          >
            Confirm Selection →
          </button>
        </div>
      )}
    </section>
  );
}

export default SquadGrid;
