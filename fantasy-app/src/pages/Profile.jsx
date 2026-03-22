import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Award, 
  Star,
  Zap,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import './Profile.css';
import Footer from '../components/Footer';


const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (token) {
      fetch('/api/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.wallet) setBalance(data.wallet.balance);
        })
        .catch(err => console.error('Error fetching balance:', err));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="profile-loading" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <p>Please log in to view your profile.</p>
        <button onClick={() => navigate('/login')} className="md-explore-btn" style={{ marginTop: '20px' }}>Go to Login</button>
      </div>
    );
  }

  const missions = [
    { title: 'Complete KYC', reward: '₹50 Bonus', btn: 'VERIFY' },
    { title: 'First Deposit', reward: '100 Coins', btn: 'DEPOSIT' },
    { title: 'Refer a Friend', reward: '₹100 Cash', btn: 'REFER' }
  ];

  const profileOptions = [
    { icon: <Settings size={18} />, label: 'My Info & Settings' },
    { icon: <Star size={18} />, label: 'VIP Club' },
    { icon: <Award size={18} />, label: 'Loyalty Program' },
    { icon: <Shield size={18} />, label: 'Security & Privacy' },
    { icon: <HelpCircle size={18} />, label: 'Help & Support' }
  ];

  return (
    <div className="profile-page">
      {/* Red Header */}
      <header className="profile-header">
        <ChevronLeft
          className="profile-back-btn"
          size={24}
          onClick={() => navigate('/home')}
        />
        <div className="profile-avatar-large">
          <User size={36} />
        </div>
        <div className="profile-name-val">{user.name || 'Dream Gamer'}</div>
        <div className="membership-badge">LEVEL 1 MEMBER</div>
      </header>

      {/* White Stats Dashboard */}
      <div className="profile-stats-card">
        <div className="stat-item">
          <span className="stat-val">45</span>
          <span className="stat-label">Played</span>
        </div>
        <div className="stat-item">
          <span className="stat-val">12</span>
          <span className="stat-label">Series</span>
        </div>
        <div className="stat-item">
          <span className="stat-val">22</span>
          <span className="stat-label">Won</span>
        </div>
      </div>

      {/* My Rewards Section */}
      <section className="profile-rewards-section">
        <div className="section-header-p">
          <h3 className="section-title-p">My Rewards</h3>
          <div className="coins-badge">
            <TrendingUp size={14} />
            <span>2,450 COINS</span>
          </div>
        </div>
        
        <div className="missions-scroll">
          {missions.map((m, idx) => (
            <div key={idx} className="mission-card">
              <span className="mission-title">{m.title}</span>
              <span className="mission-reward">{m.reward}</span>
              <button className="mission-btn">{m.btn}</button>
            </div>
          ))}
        </div>
      </section>

      {/* Menu Options (White Background) */}
      <div className="profile-options-list">
        {profileOptions.map((opt, idx) => (
          <div key={idx} className="p-option-item">
            <span className="p-opt-icon">{opt.icon}</span>
            <span className="p-opt-label">{opt.label}</span>
            <ChevronRight size={16} color="#ccc" />
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="profile-logout-wrap">
        <button className="logout-btn-p" onClick={handleLogout}>
          <LogOut size={18} />
          <span>SIGN OUT</span>
        </button>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
