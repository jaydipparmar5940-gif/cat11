import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, HelpCircle, CheckCircle2 } from 'lucide-react';
import TeamPreview from '../components/TeamPreview';
import './TeamBuilder.css';

const ROLE_LIMITS = {
  WK: { min: 1, max: 8, label: 'WK' },
  BAT: { min: 1, max: 8, label: 'BAT' },
  AR: { min: 1, max: 8, label: 'AR' },
  BOWL: { min: 1, max: 8, label: 'BOWL' }
};

const ROLES = ['WK', 'BAT', 'AR', 'BOWL'];

const TeamBuilder = ({ matchId: propMatchId, onCancel }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const matchId = propMatchId || searchParams.get('matchId');

  const [matchData, setMatchData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Selection State ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('WK');
  const [step, setStep] = useState(1); // 1 = Pick players, 2 = Pick C/VC
  const [captainId, setCaptainId] = useState(null);
  const [viceCaptainId, setViceCaptainId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    // Fetch match details
    fetch(`/api/matches/upcoming`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const match = data.data.find(m => String(m.match_id) === String(matchId));
          setMatchData(match);
        }
      });

    // Fetch players
    fetch(`/api/matches/${matchId}/players`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPlayers(data.players || []);
        else setError('Failed to load players');
      })
      .catch(() => setError('Error connecting to server'))
      .finally(() => setLoading(false));
  }, [matchId]);

  const selectedPlayers = players.filter(p => selectedIds.has(p.id));
  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r]: selectedPlayers.filter(p => p.role === r).length }), {});
  const totalCredits = selectedPlayers.reduce((acc, p) => acc + (p.credit || 8.5), 0);

  const handleTogglePlayer = (p) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        if (next.size >= 11) return prev;
        next.add(p.id);
      }
      return next;
    });
  };

  const isTeamValid = () => {
    if (selectedIds.size !== 11) return false;
    return ROLES.every(r => roleCounts[r] >= 1);
  };

  const handleSelectCaptain = (id, type) => {
    if (type === 'C') {
      if (viceCaptainId === id) setViceCaptainId(null);
      setCaptainId(id === captainId ? null : id);
    } else {
      if (captainId === id) setCaptainId(null);
      setViceCaptainId(id === viceCaptainId ? null : id);
    }
  };

  const saveTeam = async () => {
    if (!captainId || !viceCaptainId) return;
    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          matchId: parseInt(matchId),
          captainId,
          viceCaptainId,
          playerIds: Array.from(selectedIds)
        })
      });
      if (res.ok) {
        navigate('/home');
      } else {
        const data = await res.json();
        alert(data.message || 'Error saving team');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="tb-status">Loading Players...</div>;
  if (error) return <div className="tb-status">{error}</div>;

  return (
    <div className={`team-builder ${step === 2 ? 'cvc-mode' : ''}`}>
      <header className="tb-header-premium">
        <div className="tb-top-bar">
          <button className="tb-back-btn" onClick={() => step === 2 ? setStep(1) : navigate(-1)}>
            <ChevronLeft size={24} />
          </button>
          <div className="tb-match-title-group">
            <span className="tb-match-title">Create Team 1</span>
            <span className="tb-time-left">17h 30m left</span>
          </div>
          <HelpCircle size={20} className="tb-help-icon" />
        </div>

        <div className="tb-selection-summary">
          <div className="tb-summary-stat">
            <span className="tb-stat-label">Players</span>
            <span className="tb-stat-val">0<small>/11</small></span>
          </div>

          <div className="tb-teams-score">
            <div className="tb-team-item">
              <div className="tb-logo-circle">
                <img 
                  src={matchData?.team_a_info?.logo || "https://api.dicebear.com/7.x/initials/svg?seed=A"} 
                  alt="Team A" 
                  className="tb-team-logo" 
                  onError={(e) => e.target.style.display = 'none'}
                />
                <span className="tb-logo-fallback">{matchData?.team_a_info?.shortName?.charAt(0) || 'A'}</span>
              </div>
              <div className="tb-id-score">
                <span className="tb-team-id">{matchData?.team_a_info?.shortName || 'T1'}</span>
                <span className="tb-team-score-val">0</span>
              </div>
            </div>
            <div className="tb-team-item">
              <div className="tb-id-score right">
                <span className="tb-team-id">{matchData?.team_b_info?.shortName || 'T2'}</span>
                <span className="tb-team-score-val">0</span>
              </div>
              <div className="tb-logo-circle">
                <img 
                  src={matchData?.team_b_info?.logo || "https://api.dicebear.com/7.x/initials/svg?seed=B"} 
                  alt="Team B" 
                  className="tb-team-logo" 
                  onError={(e) => e.target.style.display = 'none'}
                />
                <span className="tb-logo-fallback">{matchData?.team_b_info?.shortName?.charAt(0) || 'B'}</span>
              </div>
            </div>
          </div>

          <div className="tb-summary-stat right">
            <span className="tb-stat-label">Credits Left</span>
            <span className="tb-stat-val">100</span>
          </div>
        </div>

        <div className="tb-progress-tilted">
          {[...Array(11)].map((_, i) => (
            <div key={i} className={`tb-progress-box ${i < selectedIds.size ? 'filled' : ''}`}>
              {i === 10 && <span className="tb-box-num">11</span>}
            </div>
          ))}
          <div className="tb-minus-icon">
            <div className="minus-circle">
              <span>−</span>
            </div>
          </div>
        </div>
      </header>

      {step === 1 ? (
        <>
          <div className="tb-guru-banner">
            <div className="guru-pill">
              <span className="guru-icon">📊</span>
              <span>Guru & Stats</span>
              <span className="guru-arrow">›</span>
            </div>
            <div className="pitch-info">
              Pitch <strong>Batting</strong> • Good for <strong>Pace</strong> • Avg Score <strong>205</strong>
            </div>
          </div>

          <nav className="tb-role-nav-v2">
            {ROLES.map(role => (
              <div
                key={role}
                className={`role-tab-v2 ${activeTab === role ? 'active' : ''}`}
                onClick={() => setActiveTab(role)}
              >
                {role} (0)
              </div>
            ))}
          </nav>

          <div className="select-hint-bar">
            <span>Select 1 - 8 Wicket-Keepers</span>
            <div className="tb-filter-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            </div>
          </div>

          <div className="list-sort-header">
            <div className="h-selected-by">SELECTED BY</div>
            <div className="h-points">
              <span>POINTS</span>
              <div className="sort-box">
                <div className="sort-dot active"></div>
              </div>
            </div>
            <div className="h-credits">
              <span>CREDITS</span>
              <div className="sort-arrow">↓</div>
            </div>
          </div>

          <main className="player-list-scroll-v2">
            {players.filter(p => p.role === activeTab).length === 0 ? (
              <div className="tb-empty-players">
                 <span>Loading players or none found for this role...</span>
              </div>
            ) : (
              players.filter(p => p.role === activeTab).map(p => (
                <div
                  key={p.id}
                  className={`player-row-v2 ${selectedIds.has(p.id) ? 'selected' : ''}`}
                  onClick={() => handleTogglePlayer(p)}
                >
                  <div className="p-avatar-wrap">
                    <div className="info-icon-small">i</div>
                    <img src={p.imageUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + p.name} className="p-avatar-v2" alt={p.name} />
                    <div className="p-team-badge">RCB</div>
                  </div>
                  
                  <div className="p-info-v2">
                    <span className="p-name-v2">{p.name}</span>
                    <div className="p-meta-v2">
                       <span className="p-sel-percent">Sel by 54.58%</span>
                       <span className="p-status-dot"></span>
                       <span className="p-status-text">Played last match</span>
                    </div>
                  </div>

                  <div className="p-stats-v2">
                    <span className="p-points-v2">419</span>
                    <span className="p-credits-v2">8.0</span>
                  </div>

                  <div className="p-action-v2">
                    {selectedIds.has(p.id) ? (
                      <div className="minus-btn-sm">−</div>
                    ) : (
                      <div className="plus-btn-sm">+</div>
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="tb-footer-icons">
               <div className="footer-icon-item"><span className="f-icon">⚾</span> Spinner</div>
               <div className="footer-icon-item"><span className="f-icon">⚡</span> Pacer</div>
               <div className="footer-icon-item"><span className="f-icon">🔄</span> Backup</div>
               <div className="footer-info-icon">i</div>
            </div>
          </main>
        </>
      ) : (
        <main className="player-list-scroll cvc-list">
          <div className="cvc-header-msg">C gets 2x points & VC gets 1.5x points</div>
          {selectedPlayers.map(p => (
            <div key={p.id} className="cvc-player-row">
              <img src={p.imageUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + p.name} className="p-avatar" alt={p.name} />
              <div className="p-info">
                <span className="p-name">{p.name}</span>
                <span className="p-team-role">{p.role}</span>
              </div>
              <div className="cvc-options">
                <button
                  className={`cvc-btn ${captainId === p.id ? 'active captain' : ''}`}
                  onClick={() => handleSelectCaptain(p.id, 'C')}
                >C</button>
                <button
                  className={`cvc-btn ${viceCaptainId === p.id ? 'active vice' : ''}`}
                  onClick={() => handleSelectCaptain(p.id, 'VC')}
                >VC</button>
              </div>
            </div>
          ))}
        </main>
      )}

      <footer className="tb-bottom-actions-v2">
        <div className="dual-action-capsule">
          <button className="btn-preview-v2" onClick={() => setShowPreview(true)}>
            <span className="btn-icon">👁</span> PREVIEW
          </button>
          <div className="capsule-divider"></div>
          <button className="btn-lineup-v2">
            <span className="btn-icon">📋</span> PAST LINEUP
          </button>
        </div>
        <button
          className="btn-next-v2"
          disabled={step === 1 ? !isTeamValid() : (!captainId || !viceCaptainId || submitting)}
          onClick={step === 1 ? () => setStep(2) : saveTeam}
        >
          {step === 2 && submitting ? 'SAVING...' : 'NEXT'}
        </button>
      </footer>

      {showPreview && (
        <TeamPreview
          players={selectedPlayers}
          matchData={matchData}
          onClose={() => setShowPreview(false)}
          captainId={captainId}
          viceCaptainId={viceCaptainId}
        />
      )}
    </div>
  );
};

export default TeamBuilder;
