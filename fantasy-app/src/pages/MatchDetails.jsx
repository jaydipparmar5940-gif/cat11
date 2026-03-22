import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Info, Trophy, Edit3, Eye, Award, CheckCircle } from 'lucide-react';
import TeamPreview from '../components/TeamPreview';
import './MatchDetails.css';

const MatchDetails = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [contests, setContests] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Contests');

  const [showPreview, setShowPreview] = useState(false);
  const [previewTeam, setPreviewTeam] = useState(null);

  useEffect(() => {
    fetchMatchData();
    fetchMyTeams();
  }, [matchId]);

  const fetchMatchData = async () => {
    setLoading(true);
    try {
      const matchRes = await fetch(`/api/matches/${matchId}`);
      const matchData = await matchRes.json();
      if (matchData.success) {
        setMatch(matchData.data);
      }

      const contestRes = await fetch(`/api/matches/${matchId}/contests`);
      const contestData = await contestRes.json();
      setContests(contestData || []);
    } catch (err) {
      console.error('Error fetching match details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/teams/${matchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyTeams(data.teams || []);
      }
    } catch (err) {
      console.error('Error fetching my teams:', err);
    }
  };

  const handleOpenPreview = (team) => {
    setPreviewTeam(team);
    setShowPreview(true);
  };

  if (loading) return <div className="loading-state">Loading Match Details...</div>;
  if (!match) return <div className="error-state">Match not found</div>;

  return (
    <div className="match-details-page">
      {/* Red Header */}
      <header className="md-header">
        <div className="header-top">
          <ChevronLeft onClick={() => navigate('/home')} style={{ cursor: 'pointer' }} />
          <div className="match-info-center">
            <span className="match-title-text">
              {match.team_a_info?.shortName || match.team_a} vs {match.team_b_info?.shortName || match.team_b}
            </span>
            <span className="match-timer-text">7h 30m left</span>
          </div>
          <Share2 size={20} className="share-icon" />
        </div>

        <div className="md-tabs">
          {[
            { id: 'Contests', label: 'CONTESTS' },
            { id: 'MyContests', label: 'MY CONTESTS (0)' },
            { id: 'MyTeams', label: `MY TEAMS (${myTeams.length})` }
          ].map(tab => (
            <div
              key={tab.id}
              className={`md-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </header>

      {activeTab === 'Contests' && (
        <>
          <div className="md-filters">
            <div className="filter-chip active">Mega</div>
            <div className="filter-chip">Winner Takes All</div>
            <div className="filter-chip">Head to Head</div>
            <div className="filter-chip">H2H Plus</div>
          </div>

          <main className="md-scroll-content">
            <div className="contest-list-header">
              <h2 className="section-title">MEGA CONTEST</h2>
              <Info size={14} color="#999" />
            </div>

            {contests.length === 0 ? (
              <div className="empty-contests">
                <div className="empty-trophy-icon">
                  <Trophy size={64} color="#E0E0E0" strokeWidth={1} />
                </div>
                <p className="empty-text">No contests found for this match yet.</p>
                <button className="md-explore-btn" onClick={() => navigate('/home')}>
                  EXPLORE OTHER MATCHES
                </button>
              </div>
            ) : (
              contests.map(contest => (
                <div key={contest.id} className="contest-card-d11" onClick={() => navigate(`/contest/${contest.id}`)}>
                  <div className="c-card-header">
                    <div className="prize-column">
                      <span className="prize-pool-label">Prize Pool</span>
                      <span className="prize-pool-val">₹{contest.prize_pool?.toLocaleString()}</span>
                    </div>
                    <div className="entry-btn-wrap">
                      <button className="entry-fee-btn">₹{contest.entry_fee}</button>
                    </div>
                  </div>

                  <div className="c-progress-wrap">
                    <div className="c-progress-bar">
                      <div className="c-progress-fill" style={{ width: '45%' }}></div>
                    </div>
                    <div className="c-spots-info">
                      <span className="spots-left-red">1,24,452 spots left</span>
                      <span className="total-spots">2,00,000 spots</span>
                    </div>
                  </div>

                  <div className="c-card-footer">
                    <div className="footer-icon-item">
                      <Award size={14} color="#c90" />
                      <span>₹50,000</span>
                    </div>
                    <div className="footer-icon-item">
                      <Trophy size={14} color="#999" />
                      <span>60%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </main>
        </>
      )}

      {activeTab === 'MyTeams' && (
        <main className="md-scroll-content">
          {myTeams.length === 0 ? (
            <div className="empty-state-p">
              <div className="empty-trophy-icon">
                <Trophy size={64} color="#E0E0E0" strokeWidth={1} />
              </div>
              <p className="empty-text">You haven't created any teams yet.</p>
              <button
                className="md-explore-btn"
                onClick={() => navigate(`/team-builder?matchId=${matchId}`)}
              >
                CREATE TEAM
              </button>
            </div>
          ) : (
            <div className="my-teams-list">
              {myTeams.map((team, idx) => (
                <div key={team.id} className="team-card-p">
                  <div className="team-card-header-p">
                    <span className="team-name-label">TEAM {idx + 1}</span>
                    <div className="team-card-actions">
                      <Edit3 size={18} className="icon-action" />
                      <Eye size={18} className="icon-action" onClick={() => handleOpenPreview(team)} />
                    </div>
                  </div>

                  <div className="team-card-body-p">
                    <div className="team-stats-mini">
                      <div className="stat-box">
                        <span className="stat-label">Captain</span>
                        <span className="stat-val">{team.captain?.name?.split(' ').pop()}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">VC</span>
                        <span className="stat-val">{team.viceCaptain?.name?.split(' ').pop()}</span>
                      </div>
                    </div>
                    <div className="team-role-dist">
                      <span>WK: {team.players?.filter(p => p.role === 'WK').length}</span>
                      <span>BAT: {team.players?.filter(p => p.role === 'BAT').length}</span>
                      <span>AR: {team.players?.filter(p => p.role === 'AR').length}</span>
                      <span>BOWL: {team.players?.filter(p => p.role === 'BOWL').length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Fixed Create Team Button */}
      <div className="md-footer-action">
        <button
          className="btn-create-team-fixed"
          onClick={() => navigate(`/team-builder?matchId=${matchId}`)}
        >
          CREATE TEAM
        </button>
      </div>

      {showPreview && previewTeam && (
        <TeamPreview
          players={previewTeam.players}
          matchData={match}
          onClose={() => setShowPreview(false)}
          captainId={previewTeam.captainId}
          viceCaptainId={previewTeam.viceCaptainId}
        />
      )}
    </div>
  );
};

export default MatchDetails;
