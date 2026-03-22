import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Matches from './pages/Matches';
import TeamBuilder from './pages/TeamBuilder';
import Splash from './components/Splash';
import Home from './pages/Home';
import Wallet from './pages/Wallet';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MatchDetails from './pages/MatchDetails';
import Leaderboard from './pages/Leaderboard';
import MyMatches from './pages/MyMatches';
import Winners from './pages/Winners';
import Profile from './pages/Profile';
import Rewards from './pages/Rewards';


function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/upcoming-matches" element={<Matches />} />
          <Route path="/match/:matchId" element={<MatchDetails />} />
          <Route path="/contest/:contestId" element={<Leaderboard />} />
          <Route path="/team-builder" element={<TeamBuilder />} />
          <Route path="/my-teams" element={<TeamBuilder />} />
          <Route path="/my-matches" element={<MyMatches />} />
          <Route path="/winner" element={<Winners />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/rewards" element={<Rewards />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
