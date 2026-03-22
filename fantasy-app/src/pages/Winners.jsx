import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Search } from 'lucide-react';
import './Winners.css';
import Footer from '../components/Footer';


const MOCK_WINNERS = [
  {
    id: 1,
    match: 'India vs Pakistan',
    series: 'ICC Men\'s T20 World Cup',
    winnerName: 'Rahul_King11',
    teamName: 'WinnerTeam (T1)',
    prize: '₹1 Crore',
    rank: 1,
    imageUrl: 'https://img.freepik.com/free-photo/lifestyle-people-emotions-casual-concept-confident-nice-smiling-asian-man-cross-arms-chest-looking-cheerful-at-camera-standing-white-background_1258-59335.jpg'
  },
  {
    id: 2,
    match: 'Australia vs England',
    series: 'The Ashes 2024',
    winnerName: 'CricketGuru_99',
    teamName: 'AussieDominator (T2)',
    prize: '₹50 Lakh',
    rank: 1,
    imageUrl: 'https://img.freepik.com/free-photo/young-bearded-man-with-striped-shirt_273609-5677.jpg'
  },
  {
    id: 3,
    match: 'West Indies vs South Africa',
    series: 'International Series',
    winnerName: 'Amit_Star',
    teamName: 'WindiesMagic (T1)',
    prize: '₹25 Lakh',
    rank: 1,
    imageUrl: 'https://img.freepik.com/free-photo/handsome-young-man-with-arms-crossed-white-background_23-2148213405.jpg'
  }
];

export function Winners() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Mega');

  return (
    <div className="winners-page">
      {/* Red Header */}
      <header className="winners-top-nav">
        <ChevronLeft onClick={() => navigate('/home')} style={{ cursor: 'pointer' }} />
        <h1>Winners</h1>
        <div style={{ flex: 1 }} />
        <Search size={20} />
      </header>

      {/* Tabs */}
      <nav className="winners-tabs">
        <div 
          className={`win-tab ${activeTab === 'Mega' ? 'active' : ''}`}
          onClick={() => setActiveTab('Mega')}
        >
          MEGA CONTEST
        </div>
        <div 
          className={`win-tab ${activeTab === 'Contest' ? 'active' : ''}`}
          onClick={() => setActiveTab('Contest')}
        >
          OTHER CONTESTS
        </div>
      </nav>

      <main className="winners-scroll-content">
        {MOCK_WINNERS.map(winner => (
          <div key={winner.id} className="winner-match-card">
            <div className="win-card-header">
              <span>{winner.series}</span>
              <span>12 Oct 2024</span>
            </div>
            
            <div className="win-card-body">
              <div className="winner-img-wrap">
                <img src={winner.imageUrl} alt={winner.winnerName} />
                <div className="rank-badge">#{winner.rank}</div>
              </div>
              
              <div className="winner-main-info">
                <span className="winner-user-name">{winner.winnerName}</span>
                <span className="winner-team-name">{winner.teamName}</span>
              </div>
              
              <div className="winner-prize-info">
                <span className="prize-amount">{winner.prize}</span>
                <span className="prize-label">Won</span>
              </div>
            </div>
            
            <div className="win-card-footer">
              <span>{winner.match}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={14} /> View Team
              </div>
            </div>
          </div>
        ))}
      </main>
      <Footer />
    </div>
  );
}

export default Winners;
