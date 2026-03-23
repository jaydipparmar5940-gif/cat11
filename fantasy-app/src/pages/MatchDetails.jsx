import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Info, Trophy, Edit3, Eye, Award, CheckCircle, Bell, Wallet, Filter, ChevronRight } from 'lucide-react';
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
      const [matchRes, contestRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/contests`)
      ]);

      const matchData = await matchRes.json();
      const contestData = await contestRes.json();

      if (matchData.success) {
        setMatch(matchData.data);
      } else if (Array.isArray(matchData)) {
        setMatch(matchData[0]);
      } else {
        setMatch(matchData);
      }

      setContests(contestData || []);
    } catch (err) {
      console.error('Error fetching match:', err);
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

  const handleJoinClick = async (contest) => {
    if (myTeams.length === 0) {
      alert("Please create a team first before joining a contest!");
      navigate(`/team-builder?matchId=${matchId}`);
      return;
    }
    
    const userTeamId = myTeams[0].id;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/contest/join', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          contestId: contest.id,
          userTeamId
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Successfully joined the contest!");
        fetchMatchData();
      } else {
        alert(data.message || data.error || "Failed to join contest");
      }
    } catch (err) {
      console.error(err);
      alert("Network error trying to join contest");
    }
  };

  if (loading) return <div className="loading-state">Loading Match Details...</div>;
  if (!match) return <div className="error-state">Match not found or backend API still restarting, please refresh.</div>;

  // Group contests by contestName (which the backend aliases smartly)
  const groupedContests = contests.reduce((acc, curr) => {
    const name = curr.contestName || 'Other Contests';
    if (!acc[name]) acc[name] = [];
    acc[name].push(curr);
    return acc;
  }, {});

  return (
    <div className="match-details-page">
      {/* Dark Sticky Header */}
      <header className="md-header">
        <div className="header-top">
          <ChevronLeft className="header-icon" onClick={() => navigate('/home')} />
          <div className="match-info-center">
            <span className="match-title-text">
              {match.team_a_info?.shortName || match.team_a} vs {match.team_b_info?.shortName || match.team_b}
            </span>
            <span className="match-timer-text">3h 20m left</span>
          </div>
          <div className="header-actions">
            <Bell size={20} className="header-icon" />
            <Wallet size={20} className="header-icon" onClick={() => navigate('/wallet')} />
          </div>
        </div>
      </header>

      {/* Tabs & Filters */}
      <div className="md-tabs-container">
        <div className="md-tabs">
          {[
            { id: 'Contests', label: 'Contests' },
            { id: 'MyContests', label: 'My Contests (0)' },
            { id: 'MyTeams', label: `My Teams (${myTeams.length})` },
            { id: 'Guide', label: 'Guide' }
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
        {activeTab === 'Contests' && (
          <div className="md-filters">
            <span className="sort-label">Sort By:</span>
            <span className="filter-option">ENTRY</span>
            <span className="filter-option">SPOTS</span>
            <span className="filter-option">PRIZE POOL</span>
            <span className="filter-option">%WINNER</span>
            <Filter size={14} className="filter-icon-box" />
          </div>
        )}
      </div>

      {activeTab === 'Contests' && (
        <>
          <div className="guru-promo">
            <div className="guru-text">
              <Trophy size={14} color="#d4bd44" fill="#d4bd44" />
              <span>Guru Teams available for this match</span>
            </div>
            <button className="guru-btn">TRY NOW</button>
          </div>

          <main className="md-scroll-content">
            {contests.length === 0 ? (
              <div className="empty-contests">
                <Trophy size={64} color="#E0E0E0" strokeWidth={1} style={{marginBottom:10}} />
                <p style={{marginBottom:20}}>No contests found for this match yet.</p>
              </div>
            ) : (
              Object.entries(groupedContests).map(([groupName, groupContests]) => (
                <section key={groupName} className="contest-section">
                  <div className="section-header">
                    <h2 className="section-title">{groupName}</h2>
                    <div className="section-link">View All <ChevronRight size={14} /></div>
                  </div>

                  {groupContests.map(contest => {
                    const isFull = contest.joinedSpots >= contest.totalSpots;
                    const fillPercent = Math.min((contest.joinedSpots / contest.totalSpots) * 100, 100);
                    const spotsLeft = contest.totalSpots - contest.joinedSpots;

                    return (
                      <div key={contest.id} className="contest-card-d11" onClick={() => navigate(`/contest/${contest.id}`)}>
                        {groupName === 'Mega Contest' && (
                          <div className="jeeto-banner">
                            <span className="jeeto-text">
                              <span style={{color: '#e41a2d'}}>Jeeto</span> CRORES | 3 Crorepatis | 50 iPhones
                            </span>
                            <ChevronRight size={14} color="#aaa" />
                          </div>
                        )}

                        <div className="c-card-body">
                          <div className="c-labels">
                            <span>Prize Pool</span>
                            <span>Entry</span>
                          </div>
                          
                          <div className="c-prize-row">
                            <span className="prize-val">₹{parseFloat(contest.prizePool || 0).toLocaleString()}</span>
                            <button 
                              className={`entry-fee-btn ${isFull ? 'disabled' : ''}`}
                              disabled={isFull}
                              onClick={(e) => { e.stopPropagation(); handleJoinClick(contest); }}
                            >
                              {isFull ? 'FULL' : `₹${contest.entryFee}`}
                            </button>
                          </div>

                          <div className="c-progress-wrap">
                            <div className="c-progress-bar">
                              <div className="c-progress-fill" style={{ width: `${fillPercent}%` }}></div>
                            </div>
                            <div className="c-spots-info">
                              <span className="spots-left-red">{spotsLeft.toLocaleString()} spots left</span>
                              <span className="total-spots">{contest.totalSpots.toLocaleString()} spots</span>
                            </div>
                          </div>
                        </div>

                        <div className="c-card-footer">
                          <div className="footer-icon-item">
                            <Award size={14} color="#999" />
                            <span>₹{parseFloat((contest.prizePool * 0.4) || 20000000).toLocaleString()}</span>
                          </div>
                          <div className="footer-icon-item">
                            <Trophy size={14} color="#999" />
                            <span>65%</span>
                          </div>
                          <div className="footer-icon-item" style={{marginLeft: 'auto'}}>
                            <CheckCircle size={14} color="#999" />
                            <span>Guaranteed</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))
            )}
          </main>

          {/* Floating Action Button */}
          <div className="md-fab-container">
            <div className="fab-tooltip">Create or choose the best contests for you</div>
            <div className="fab-pill">
              <button className="fab-btn" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                <Trophy size={16} color="white" /> CONTESTS
              </button>
              <div className="fab-divider"></div>
              <button className="fab-btn" onClick={() => navigate(`/team-builder?matchId=${matchId}`)}>
                <Edit3 size={16} color="white" /> CREATE TEAM
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'MyTeams' && (
        <main className="md-scroll-content" style={{paddingTop: 16}}>
          {myTeams.length === 0 ? (
            <div className="empty-contests">
              <Trophy size={64} color="#E0E0E0" strokeWidth={1} style={{marginBottom:10}} />
              <p style={{marginBottom:20}}>You haven't created any teams yet.</p>
              <button className="entry-fee-btn" onClick={() => navigate(`/team-builder?matchId=${matchId}`)}>
                CREATE TEAM
              </button>
            </div>
          ) : (
            <div className="my-teams-list">
              {myTeams.map((team, idx) => (
                <div key={team.id} className="contest-card-d11" style={{padding: 16}}>
                  <div className="section-header" style={{marginBottom: 10}}>
                    <span className="section-title">TEAM {idx + 1}</span>
                    <div style={{display:'flex', gap:10}}>
                      <Edit3 size={18} color="#666" style={{cursor:'pointer'}} />
                      <Eye size={18} color="#666" style={{cursor:'pointer'}} onClick={() => handleOpenPreview(team)} />
                    </div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', color:'#666', fontSize: 13}}>
                    <span>Captain: <strong style={{color:'#111'}}>{team.captain?.name?.split(' ').pop()}</strong></span>
                    <span>VC: <strong style={{color:'#111'}}>{team.viceCaptain?.name?.split(' ').pop()}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

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
