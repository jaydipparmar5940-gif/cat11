import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, Lock, User as UserIcon, CheckCircle, Eye, EyeOff } from 'lucide-react';
import './Signup.css';
import { authApi } from '../api';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    inviteCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authApi.signup({
        ...formData,
        confirm_password: formData.password
      });

      if (data.success || data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccess(true);
        setTimeout(() => navigate('/home'), 2500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="signup-page">
        <div className="success-state-container">
          <CheckCircle size={60} color="#00874e" />
          <h3>Welcome to the Team!</h3>
          <p>Your registration was successful.<br />Redirecting you to the home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <nav className="auth-top-nav">
        <div className="lang-switch">English</div>
      </nav>

      <h1>Register</h1>

      <form onSubmit={handleSignup}>
        <div className="auth-form-group">
          <label>Full Name</label>
          <input 
            type="text" 
            name="name"
            placeholder="Enter name" 
            value={formData.name}
            onChange={handleChange}
            required 
          />
        </div>

        <div className="auth-form-group">
          <label>Mobile Number</label>
          <input 
            type="tel" 
            name="phone"
            placeholder="Enter mobile no." 
            value={formData.phone}
            onChange={handleChange}
            required 
          />
        </div>

        <div className="auth-form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            name="email"
            placeholder="Enter email" 
            value={formData.email}
            onChange={handleChange}
            required 
          />
        </div>

        <div className="auth-form-group">
          <label>Password</label>
          <div className="pw-wrap">
            <input 
              type={showPassword ? 'text' : 'password'} 
              name="password"
              placeholder="Min 8 characters" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
            <div className="pw-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>
        </div>

        <div className="auth-form-group">
          <label>Invite Code (Optional)</label>
          <input 
            type="text" 
            name="inviteCode"
            placeholder="Have a referral code?" 
            value={formData.inviteCode}
            onChange={handleChange}
          />
        </div>

        <p className="auth-terms-text">
          By registering, I agree to the <span>T&Cs</span> and <span>Privacy Policy</span>
        </p>

        <button type="submit" className="auth-action-btn" disabled={loading}>
          {loading ? 'REGISTERING...' : 'REGISTER'}
        </button>
      </form>

      {error && <p className="auth-error">{error}</p>}

      <div className="auth-footer">
        <span>Already have an account?</span>
        <span className="auth-link" onClick={() => navigate('/login')}>Log In</span>
      </div>
    </div>
  );
};


export default Signup;
