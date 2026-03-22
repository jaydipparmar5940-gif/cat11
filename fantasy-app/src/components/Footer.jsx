import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Trophy,
  Award,
  User,
  CheckCircle
} from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'matches', label: 'My Matches', icon: Trophy, path: '/my-matches' },
    { id: 'winners', label: 'Winners', icon: CheckCircle, path: '/winner' },
    { id: 'rewards', label: 'Rewards', icon: Award, path: '/rewards' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
  ];

  return (
    <footer className="main-footer">
      <div className="footer-container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.path;
          return (
            <div
              key={tab.id}
              className={`footer-tab ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <Icon size={22} className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
            </div>
          );
        })}
      </div>
    </footer>
  );
};

export default Footer;
