import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Award, 
  Star, 
  Zap, 
  Gift, 
  ChevronRight, 
  ChevronLeft,
  Clock,
  Tag,
  ShieldCheck,
  ZapIcon
} from 'lucide-react';
import './Rewards.css';
import Footer from '../components/Footer';

const Rewards = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('missions');

  const missions = [
    { id: 1, title: 'Complete KYC', reward: '₹50 Bonus', points: 50, icon: <ShieldCheck size={20} />, status: 'VERIFY', color: '#14CB23' },
    { id: 2, title: 'First Deposit', reward: '100 Coins', points: 100, icon: <Gift size={20} />, status: 'DEPOSIT', color: '#E41A2D' },
    { id: 3, title: 'Play 5 Contests', reward: '₹25 Cash', points: 25, icon: <Star size={20} />, status: 'PLAY', color: '#101219' },
    { id: 4, title: 'Refer a Friend', reward: '₹100 Cash', points: 150, icon: <Award size={20} />, status: 'REFER', color: '#f59e0b' }
  ];

  const coupons = [
    { id: 101, title: '50% Discount', desc: 'On next Mega Contest', cost: 200, icon: <Tag size={20} />, color: '#E41A2D' },
    { id: 102, title: '₹10 Bonus Cash', desc: 'Redeem for 500 coins', cost: 500, icon: <ZapIcon size={20} />, color: '#f59e0b' },
    { id: 103, title: 'IPL Special Pass', desc: 'Free entry to ₹49 contest', cost: 1000, icon: <Star size={20} />, color: '#14CB23' }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      className="rewards-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <header className="rewards-header">
        <div className="rewards-top-bar">
          <motion.div whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="back-btn" onClick={() => navigate('/home')} />
          </motion.div>
          <h1>Rewards Shop</h1>
          <div style={{ width: 24 }} />
        </div>
        
        <div className="points-display">
          <div className="points-main">
            <span className="points-label">AVAILABLE COINS</span>
            <div className="points-value">
              <TrendingUp size={28} className="coin-icon" />
              <span>2,450</span>
            </div>
          </div>
          <motion.button 
            className="how-it-works"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            How it works?
          </motion.button>
        </div>
      </header>

      <div className="rewards-tabs">
        {['missions', 'shop'].map((tab) => (
          <button 
            key={tab}
            className={`reward-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'missions' ? 'MISSIONS' : 'REWARDS SHOP'}
            {activeTab === tab && (
              <motion.div 
                className="active-line"
                layoutId="underline"
              />
            )}
          </button>
        ))}
      </div>

      <main className="rewards-content">
        <AnimatePresence mode="wait">
          {activeTab === 'missions' ? (
            <motion.div 
              key="missions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="missions-list"
            >
              <div className="section-header">
                <h3>DAILY MISSIONS</h3>
                <div className="timer">
                  <Clock size={14} />
                  <span>Reset in 12h:45m</span>
                </div>
              </div>
              
              {missions.map(m => (
                <motion.div 
                  key={m.id} 
                  className="reward-item-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="reward-icon-box" style={{ background: `${m.color}20`, color: m.color }}>
                    {m.icon}
                  </div>
                  <div className="reward-info">
                    <span className="reward-title">{m.title}</span>
                    <span className="reward-desc">Earn {m.reward}</span>
                  </div>
                  <motion.button 
                    className={`reward-action-btn ${m.status}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {m.status}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="shop"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="shop-list"
            >
              <div className="section-header">
                <h3>EXCLUSIVE REWARDS</h3>
              </div>
              
              {coupons.map(c => (
                <motion.div 
                  key={c.id} 
                  className="reward-item-card shop-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="reward-icon-box shop-icon" style={{ background: `${c.color}20`, color: c.color }}>
                    {c.icon}
                  </div>
                  <div className="reward-info">
                    <span className="reward-title">{c.title}</span>
                    <span className="reward-desc">{c.desc}</span>
                  </div>
                  <div className="cost-tag">
                    <TrendingUp size={12} />
                    <span>{c.cost}</span>
                    <ChevronRight size={14} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="referral-banner"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="banner-content">
            <h4>Invite Your Friends</h4>
            <p>Get up to ₹500 for every friend who plays!</p>
            <motion.button 
              className="invite-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              INVITE NOW
            </motion.button>
          </div>
          <div className="banner-image">
            <Gift size={60} color="rgba(255,255,255,0.4)" strokeWidth={1} />
          </div>
        </motion.div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default Rewards;
