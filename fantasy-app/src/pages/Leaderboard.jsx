import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Medal, User } from 'lucide-react';
import './Leaderboard.css';

const Leaderboard = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [contestId]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/${contestId}`);
      const data = await res.json();
      if (data.success) {
        setLeaders(data.leaderboard || []);
        setUserRank(data.userRank);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leaderboard-page">
      <div className="lb-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>Leaderboard</h1>
        <div className="placeholder" />
      </div>

      <div className="lb-top-three">
        {leaders.slice(0, 3).map((player, index) => (
          <div key={player.userId} className={`podium-card pos-${index + 1}`}>
            <div className="podium-avatar">
               <User size={index === 0 ? 40 : 30} />
               <div className="rank-badge">{index + 1}</div>
            </div>
            <span className="p-name">{player.userName || `User ${player.userId.slice(-4)}`}</span>
            <span className="p-points">{player.score} pts</span>
          </div>
        ))}
      </div>

      <div className="lb-list-container">
        <div className="lb-list-header">
           <span>Rank</span>
           <span>Player</span>
           <span>Points</span>
        </div>
        
        {loading ? (
            <div className="lb-loading">Loading Rankings...</div>
        ) : (
            <div className="lb-rows">
                {leaders.map((player, index) => (
                    <div key={player.userId} className={`lb-row ${player.isUser ? 'me' : ''}`}>
                        <div className="lb-rank">
                            {index < 3 ? <Medal size={18} color={index === 0 ? '#ffd54f' : index === 1 ? '#c0c0c0' : '#cd7f32'} /> : `#${index + 1}`}
                        </div>
                        <div className="lb-user">
                             <div className="avatar-small"><User size={14} /></div>
                             <span>{player.userName || `User ${player.userId.slice(-4)}`}</span>
                        </div>
                        <div className="lb-points">{player.score}</div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {userRank && (
          <div className="user-floating-rank">
              <div className="u-rank">Your Rank: #{userRank.rank}</div>
              <div className="u-points">{userRank.score} pts</div>
          </div>
      )}
    </div>
  );
};

export default Leaderboard;
