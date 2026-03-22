// Centralized API Service
// -----------------------
// This file consolidates all backend communication logic.
// All functions preserve the exact existing endpoint structure and data handling.

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * matches - Match related API calls
 */
export const matchesApi = {
  getUpcoming: () => 
    fetch('/api/matches/upcoming')
      .then(res => res.json()),
  
  getDetails: (id) => 
    fetch(`/api/matches/${id}`)
      .then(res => res.json()),
};

/**
 * wallet - Wallet and Balance related API calls
 */
export const walletApi = {
  getBalance: () => 
    fetch('/api/wallet', {
      headers: getAuthHeader()
    }).then(res => res.json()),
};

/**
 * auth - Authentication related API calls
 */
export const authApi = {
  login: (credentials) => 
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(res => res.json()),

  signup: (userData) => 
    fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(res => res.json()),
};
