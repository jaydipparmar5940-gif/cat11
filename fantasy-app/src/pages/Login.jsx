import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';
import { authApi } from '../api';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authApi.login({ email, password });
      
      if (data.success || data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/home');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <nav className="auth-top-nav">
        <div className="lang-switch">English</div>
      </nav>

      <h1>Log In</h1>

      <form onSubmit={handleLogin}>
        <div className="auth-form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            placeholder="Enter email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div className="auth-form-group">
          <label>Password</label>
          <div className="password-wrap">
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <div className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>

        <span className="forgot-pw-link" onClick={() => navigate('/forgot')}>
          Forgot Password?
        </span>

        <button type="submit" className="auth-action-btn" disabled={loading}>
          {loading ? 'LOGGING IN...' : 'LOG IN'}
        </button>
      </form>

      {error && <p className="auth-error">{error}</p>}

      <div className="auth-footer">
        <span>Not a member?</span>
        <span className="auth-link" onClick={() => navigate('/signup')}>Register</span>
      </div>
    </div>
  );
};


export default Login;
