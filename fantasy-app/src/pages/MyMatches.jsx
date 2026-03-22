import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronLeft, Bell, Share2, Search, Calendar } from 'lucide-react';
import './MyMatches.css';
import Footer from '../components/Footer';


const BACKEND = import.meta.env?.VITE_API_URL || '';

export function MyMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyMatches = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(`${BACKEND}/api/teams/my/matches`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          if (res.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch matches');
        }

        const data = await res.json();
        setMatches(data);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyMatches();
  }, [navigate]);

  const filteredMatches = matches.filter(m => {
    if (activeTab === 'upcoming') return m.status === 'UPCOMING';
    if (activeTab === 'live') return m.status === 'LIVE';
    if (activeTab === 'completed') return m.status === 'COMPLETED';
    return m.status === 'UPCOMING';
  });

  return (
    <div className="my-matches-page">
      {/* Red Header */}
      <header className="mm-top-nav">
        <ChevronLeft onClick={() => navigate('/home')} style={{ cursor: 'pointer' }} />
        <h1>My Matches</h1>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '15px' }}>
          <Bell size={20} />
          <Share2 size={20} />
        </div>
      </header>

      {/* Tabs (Inside Red Header area visually) */}
      <nav className="mm-tabs">
        {['upcoming', 'live', 'completed'].map(tab => (
          <div
            key={tab}
            className={`mm-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </div>
        ))}
      </nav>

      <main className="mm-list-container">
        {loading ? (
          <div className="loading-placeholder" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading matches...
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="mm-empty-state">
            <Trophy size={64} color="#eee" strokeWidth={1} />
            <h3>No {activeTab} matches</h3>
            <p>You haven't joined any {activeTab} matches yet.</p>
            <button className="mm-view-btn" onClick={() => navigate('/home')}>
              VIEW UPCOMING MATCHES
            </button>
          </div>
        ) : (
          filteredMatches.map(match => (
            <div
              key={match.id}
              className="mm-match-card"
              onClick={() => navigate(`/match/${match.id}`)}
            >
              <div className="mm-card-header">
                <span>{match.seriesName || 'T20 World Cup'}</span>
                <span className={`mm-status-label ${activeTab}`}>
                  {match.status === 'UPCOMING' ? '7h 30m left' : match.status}
                </span>
              </div>

              <div className="mm-card-body">
                <div className="mm-team-info">
                  <img src={match.teamA?.logo || 'https://api.dicebear.com/7.x/identicon/svg?seed=A'} alt="A" />
                  <span className="mm-team-name">{match.teamA?.shortName}</span>
                </div>
                <div className="mm-vs-badge">VS</div>
                <div className="mm-team-info">
                  <img src={match.teamB?.logo || 'https://api.dicebear.com/7.x/identicon/svg?seed=B'} alt="B" />
                  <span className="mm-team-name">{match.teamB?.shortName}</span>
                </div>
              </div>

              <div className="mm-card-footer">
                <div className="mm-joined-info">
                  <Trophy size={14} />
                  <span>1 Team Joined</span>
                </div>
                <span>1 Contest joined</span>
              </div>
            </div>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}

export default MyMatches;
