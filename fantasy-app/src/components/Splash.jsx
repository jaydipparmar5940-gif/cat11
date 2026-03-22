import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Splash.css';

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div className="splash">
      {/* HERO VIDEO/IMAGE */}
      <img 
        src="/fantasy-app/frontend/assets/images/rohit_sharma_splash.png" 
        alt="Rohit Sharma" 
        className="cricketer-img"
      />
      <div className="hero-gradient"></div>

      {/* LOGO */}
      <div className="logo-area">
        <div className="logo-text-wrap">
            <div className="text-logo">CAT<span>11</span></div>
            <div className="logo-tagline">Fantasy Cricket</div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="bottom-section">
        <button className="lets-play-btn" onClick={() => navigate('/home')}>
          Let's Play
        </button>

        <div className="bottom-links">
          <div className="link-group" onClick={() => navigate('/signup')}>
            <small>Have a referral code?</small>
            <span>Enter code</span>
          </div>
          <div className="divider-dot"></div>
          <div className="link-group" onClick={() => navigate('/login')}>
            <small>Already a user?</small>
            <span>Log In</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
