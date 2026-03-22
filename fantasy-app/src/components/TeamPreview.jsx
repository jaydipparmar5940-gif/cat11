import React from 'react';
import { X, User } from 'lucide-react';
import './TeamPreview.css';

const TeamPreview = ({ players, matchData, onClose, captainId, viceCaptainId }) => {
  if (!players || players.length === 0) return null;

  const roles = ['WK', 'BAT', 'AR', 'BOWL'];
  const playersByRole = roles.reduce((acc, role) => {
    acc[role] = players.filter(p => p.role === role);
    return acc;
  }, {});

  return (
    <div className="team-preview-overlay">
      <div className="team-preview-container">
        <header className="tp-header">
          <button className="tp-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
          <div className="tp-match-info">
             {matchData?.team_a_info?.shortName || matchData?.team_a} vs {matchData?.team_b_info?.shortName || matchData?.team_b}
          </div>
          <div style={{ width: 24 }} />
        </header>

        <div className="ground-view">
          <div className="pitch-background">
            <div className="pitch-center-line"></div>
            <div className="pitch-inner-circle"></div>
          </div>

          <div className="players-layout">
            {roles.map(role => (
              <div key={role} className={`role-row role-${role.toLowerCase()}`}>
                {playersByRole[role].map(player => (
                  <div key={player.id} className="player-icon-wrap">
                    <div className="player-avatar-box">
                      <img 
                        src={player.imageUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + player.name} 
                        alt={player.name} 
                        className="tp-player-img"
                      />
                      {player.id === captainId && <span className="badge-c">C</span>}
                      {player.id === viceCaptainId && <span className="badge-vc">VC</span>}
                    </div>
                    <div className="player-name-tag">
                      {player.name.split(' ').pop()}
                    </div>
                    <div className="player-credits-tag">
                      {player.credit || 8.5} Cr
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <footer className="tp-footer">
          <div className="team-stats-summary">
             <span>WK: {playersByRole.WK.length}</span>
             <span>BAT: {playersByRole.BAT.length}</span>
             <span>AR: {playersByRole.AR.length}</span>
             <span>BOWL: {playersByRole.BOWL.length}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TeamPreview;
