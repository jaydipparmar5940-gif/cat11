import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home as HomeIcon,
  Trophy,
  Award,
  User,
  Bell,
  Plus,
  Coins,
  ChevronRight,
  Wallet,
  Clock,
  MonitorPlay,
  Shirt
} from 'lucide-react';
import './Home.css';
import Footer from '../components/Footer';
import { matchesApi, walletApi } from '../api';


const BANNER_IMAGES = [
  '/banners/ipl_rcb_csk.png',
  '/banners/ipl_mi_kkr.png',
  '/banners/ipl_gt_rr.png'
];

const Home = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Recommended');
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    // 1. Fetch wallet balance via centralized API
    walletApi.getBalance()
      .then(data => {
        if (data.success && data.wallet) {
          setBalance(data.wallet.balance || 0);
        }
      })
      .catch(err => console.error('Error fetching balance:', err));

    // 2. Fetch upcoming matches via centralized API
    matchesApi.getUpcoming()
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setMatches(data.data);
        }
      })
      .catch(err => console.error('Error fetching matches:', err))
      .finally(() => setLoading(false));

    // 3. Banner Auto-play
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % BANNER_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getTimeRemaining = (startTime) => {
    const total = Date.parse(startTime) - Date.parse(new Date());
    if (total <= 0) return "Started";
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="home-page">
      {/* CAT11 Red Header */}
      <header className="home-top-nav">
        <div className="user-profile-logo" onClick={() => navigate('/profile')}>
          <div className="avatar-container">
            <User size={22} color="#fff" strokeWidth={2} />
          </div>
        </div>

        <div className="header-center-logo">
          <div className="trophy-c-icon">
            <Trophy size={28} color="#fff" strokeWidth={2} />
            <span className="logo-letter-c">C</span>
          </div>
          <div className="app-logo-text">CAT11</div>
        </div>

        <div className="top-actions">
          <Bell size={22} color="#fff" strokeWidth={2} className="header-icon" />
          <Wallet size={22} color="#fff" strokeWidth={2} className="header-icon" onClick={() => navigate('/wallet')} />
        </div>
      </header>

      {/* Banner Carousel */}
      <section className="banner-carousel">
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentBanner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="banner-slide"
          >
            <img src={BANNER_IMAGES[currentBanner]} alt="Promo Banner" className="banner-img" />
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Filter Tabs (White Background) */}
      <div className="filter-tabs">
        {['Recommended', 'Starting Soon', 'Popular'].map(tab => (
          <div
            key={tab}
            className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      <main className="home-scroll-content">
        <div className="matches-container">
          {loading ? (
            <div className="loading-placeholder">Loading matches...</div>
          ) : matches.length > 0 ? (
            matches.map(m => (
              <div key={m.match_id} className="home-match-card" onClick={() => navigate(`/match/${m.match_id}`)}>
                {/* League Header */}
                <div className="card-league-header">
                  <span className="league-name">{m.seriesName || 'Bukhatir T10 League'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {matches.indexOf(m) < 2 && (
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
                  <span className="team-full-name">{m.team_a_info?.name || 'Future Mattress'}</span>
                  <span className="team-full-name">{m.team_b_info?.name || 'Interglobe Marine'}</span>
                </div>

                {/* Main Body */}
                <div className="card-main-body">
                  <div className="team-info-left">
                    <div className="team-logo-wrap">
                      <div className="color-bar" style={{ backgroundColor: '#2196F3' }}></div>
                      <img src={m.team_a_info?.logo || 'https://api.dicebear.com/7.x/identicon/svg?seed=A'} className="team-logo-circle" alt="T1" />
                    </div>
                    <span className="team-abbr">{m.team_a_info?.shortName || m.team_a}</span>
                  </div>

                  <div className="match-status-center">
                    <span className="match-time-red">{getTimeRemaining(m.match_time)}</span>
                  </div>

                  <div className="team-info-right">
                    <span className="team-abbr">{m.team_b_info?.shortName || m.team_b}</span>
                    <div className="team-logo-wrap">
                      <img src={m.team_b_info?.logo || 'https://api.dicebear.com/7.x/identicon/svg?seed=B'} className="team-logo-circle" alt="T2" />
                      <div className="color-bar right" style={{ backgroundColor: '#FFC107' }}></div>
                    </div>
                  </div>
                </div>

                {/* Prize Footer */}
                <div className="card-mega-footer">
                  <div className="prize-info">
                    <div className="mega-badge">MEGA</div>
                    <span className="prize-pool-text">₹15 Lakhs</span>
                  </div>
                  <div className="footer-action-icons">
                    <MonitorPlay size={16} />
                    <Shirt size={16} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-matches">No matches available right now</div>
          )}
        </div>


        {/* Fantasy Help Section */}
        <section className="fantasy-help-section">
          <h3 className="help-title">Fantasy Help</h3>
          {[
            { label: 'How to Play', icon: <img src="https://cdn-icons-png.flaticon.com/128/686/686589.png" width="20" alt="" /> },
            { label: 'Points System', icon: <img src="https://cdn-icons-png.flaticon.com/128/11242/11242318.png" width="20" alt="" /> },
            { label: 'Help and Support', icon: <img src="https://cdn-icons-png.flaticon.com/128/1067/1067562.png" width="20" alt="" /> }
          ].map((item, idx) => (
            <div key={idx} className="help-item">
              <div className="help-icon-box">{item.icon}</div>
              <span className="help-label">{item.label}</span>
              <ChevronRight className="help-arrow" size={16} />
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
