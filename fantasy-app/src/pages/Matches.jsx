import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, MonitorPlay, Shirt } from 'lucide-react';
import './Matches.css';
import Footer from '../components/Footer';


/**
 * Matches.jsx – Upcoming Matches Page
 *
 * Fetches from GET /api/matches/upcoming and renders a list of match cards.
 * Each card shows Team A vs Team B, match time, venue, and a "Create Team" CTA.
 *
 * Props:
 *   onCreateTeam  fn(match) – called when the user clicks "Create Team"
 */

const BACKEND = ''; // Use relative path to leverage Vite proxy

// Role-color pair for the countdown badge
const STATUS_COLORS = {
  UPCOMING:  { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e' },
  LIVE:      { bg: 'rgba(239,68,68,0.20)',   text: '#ef4444' },
  COMPLETED: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
};

function formatMatchTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function timeUntil(isoString) {
  if (!isoString) return '';
  const diff = new Date(isoString) - Date.now();
  if (diff <= 0) return 'Starting soon';
  const h = Math.floor(diff / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
}

// ── MatchCard ─────────────────────────────────────────────────────────────────
function MatchCard({ match, onCreateTeam }) {
  const timeLeft = timeUntil(match.match_time);
  const teamAInfo = match.team_a_info || {};
  const teamBInfo = match.team_b_info || {};

  return (
    <div className="match-card" onClick={() => onCreateTeam?.(match)}>
      {/* League Header */}
      <div className="card-league-header">
        <span className="league-name">{match.seriesName || 'Bukhatir T10 League'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {match.status === 'UPCOMING' && (
            <div className="lineups-status">
              <Clock size={12} strokeWidth={3} />
              <span>Lineups Out</span>
            </div>
          )}
          <Bell size={14} className="league-bell" />
        </div>
      </div>

      {/* Team Full Names Row */}
      <div className="card-team-names-row">
        <span className="team-full-name">{teamAInfo.name || match.team_a || 'Team A'}</span>
        <span className="team-full-name">{teamBInfo.name || match.team_b || 'Team B'}</span>
      </div>

      {/* Main Body */}
      <div className="card-main-body">
        <div className="team-info-left">
          <div className="team-logo-wrap">
            <div className="color-bar" style={{ backgroundColor: '#2196F3' }}></div>
            {teamAInfo.logo 
              ? <img src={teamAInfo.logo} className="team-logo-circle" alt="T1" />
              : <div className="team-logo-circle" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>LOG</div>
            }
          </div>
          <span className="team-abbr">{teamAInfo.shortName || match.team_a}</span>
        </div>

        <div className="match-status-center">
          <span className="match-time-red">{timeLeft}</span>
        </div>

        <div className="team-info-right">
          <span className="team-abbr">{teamBInfo.shortName || match.team_b}</span>
          <div className="team-logo-wrap">
            {teamBInfo.logo 
              ? <img src={teamBInfo.logo} className="team-logo-circle" alt="T2" />
              : <div className="team-logo-circle" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>LOG</div>
            }
            <div className="color-bar right" style={{ backgroundColor: '#FFC107' }}></div>
          </div>
        </div>
      </div>

      {/* Prize Footer */}
      <div className="card-mega-footer">
        <div className="prize-info">
          <div className="mega-badge">MEGA</div>
          <span className="prize-pool-text">₹25 Lakhs</span>
        </div>
        <div className="footer-action-icons">
          <MonitorPlay size={16} />
          <Shirt size={16} />
        </div>
      </div>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="match-card" style={{ opacity: 0.5 }}>
      <div style={{ height: '140px', background: '#f5f5f5', borderRadius: '12px' }}></div>
    </div>
  );
}

// ── Matches Page ──────────────────────────────────────────────────────────────
export function Matches({ onCreateTeam }) {
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res  = await fetch(`${BACKEND}/api/matches/upcoming`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setMatches(json.data || json || []);
      } catch (e) {
        setError('Could not load matches. Please check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateTeam = (match) => {
    if (onCreateTeam) {
      onCreateTeam(match);
    } else {
      navigate(`/my-teams?matchId=${match.match_id}`);
    }
  };

  const FILTERS  = ['ALL', 'UPCOMING', 'LIVE'];
  const visible  = filter === 'ALL' ? matches : matches.filter((m) => m.status === filter);

  return (
    <div className="matches-page">
      {/* Page header */}
      <div className="mm-top-nav">
        <h1 className="matches-title">Upcoming Matches</h1>
      </div>

      {/* Filter tabs */}
      <div className="matches-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`mf-btn${filter === f ? ' mf-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="matches-content-scroll" style={{ padding: '16px', paddingBottom: '80px' }}>
        {loading && (
          <div className="matches-grid">
            {[1,2,3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="matches-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#E41A2D', color: '#fff', border: 'none', borderRadius: '6px' }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="matches-empty">
            <span>🏏</span>
            <p>No {filter !== 'ALL' ? filter.toLowerCase() : ''} matches right now.</p>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="matches-grid">
            {visible.map((m) => (
              <MatchCard
                key={m.match_id}
                match={m}
                onCreateTeam={handleCreateTeam}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Matches;
