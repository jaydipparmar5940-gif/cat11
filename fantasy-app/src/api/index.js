// Centralized API Service
// -----------------------
// This file consolidates all backend communication logic.
// Base URL is configurable via environment variable (VITE_API_URL).

const API_BASE = import.meta.env.VITE_API_URL || '';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * matches - Match related API calls
 */
export const matchesApi = {
  getUpcoming: () => 
    fetch(`${API_BASE}/api/matches/upcoming`)
      .then(res => res.json()),
  
  getDetails: (id) => 
    fetch(`${API_BASE}/api/matches/${id}`)
      .then(res => res.json()),
  
  getAll: () =>
    fetch(`${API_BASE}/api/matches`)
      .then(res => res.json()),
};

/**
 * wallet - Wallet and Balance related API calls
 */
export const walletApi = {
  getBalance: () => 
    fetch(`${API_BASE}/api/wallet`, {
      headers: getAuthHeader()
    }).then(res => res.json()),
};

/**
 * auth - Authentication related API calls
 */
export const authApi = {
  login: (credentials) => 
    fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(res => res.json()),

  signup: (userData) => 
    fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }).then(res => res.json()),
};
