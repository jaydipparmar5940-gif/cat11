import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Smartphone, CreditCard, History, ChevronRight, HelpCircle } from 'lucide-react';
import './Wallet.css';

const Wallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const res = await fetch('/api/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBalance(data.wallet.balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }
    setLoading(true);
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.wallet.balance);
        setAmount('');
        setMessage('Deposit successful!');
        setTimeout(() => navigate('/home'), 1500);
      } else {
        setMessage(data.message || 'Deposit failed');
      }
    } catch (err) {
      setMessage('Network error tool call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-page">
      {/* Red Header */}
      <header className="wallet-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>ADD CASH</h1>
      </header>

      {/* Balance Card */}
      <div className="balance-card">
        <span className="balance-label">CURRENT BALANCE</span>
        <div className="balance-amount">₹{parseFloat(balance).toLocaleString()}</div>
        <div className="balance-divider"></div>
        <div className="balance-types">
          <div className="type">
            <small>UNUTILIZED</small>
            <span>₹{parseFloat(balance).toLocaleString()}</span>
          </div>
          <div className="type">
            <small>WINNINGS</small>
            <span>₹0</span>
          </div>
          <div className="type">
            <small>CASH BONUS</small>
            <span>₹0</span>
          </div>
        </div>
      </div>

      {/* Add Cash Actions */}
      <div className="wallet-actions">
        <h3>AMOUNT TO ADD</h3>
        <div className="amount-input-group">
          <span>₹</span>
          <input
            type="number"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="quick-amounts">
          {[100, 200, 500].map(amt => (
            <button key={amt} onClick={() => setAmount(amt.toString())}>+₹{amt}</button>
          ))}
        </div>

        <button
          className="add-cash-btn"
          onClick={handleDeposit}
          disabled={loading}
        >
          {loading ? 'PROCESSING...' : 'ADD CASH'}
        </button>
        {message && (
          <p className={`status-msg ${message.includes('successful') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Menu Options */}
      <div className="wallet-menu">
        <div className="menu-item">
          <History size={18} color="#666" />
          <span>My Recent Transactions</span>
          <ChevronRight size={18} className="chevron" />
        </div>
        <div className="menu-item">
          <HelpCircle size={18} color="#666" />
          <span>Help & Support</span>
          <ChevronRight size={18} className="chevron" />
        </div>
      </div>
    </div>
  );
};

export default Wallet;
