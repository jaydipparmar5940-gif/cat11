const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAuthFlow() {
  const testEmail = `user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  console.log('--- Phase 1: Signup ---');
  try {
    const signupRes = await axios.post(`${API_URL}/auth/signup`, {
      name: 'Test Automation',
      email: testEmail,
      phone: '9876543210',
      password: testPassword,
      confirm_password: testPassword
    });
    console.log('Signup Success:', signupRes.data.message);
    console.log('Token received:', signupRes.data.token ? 'Yes' : 'No');
  } catch (error) {
    console.error('Signup Failed:', error.response?.data || error.message);
    return;
  }

  console.log('\n--- Phase 2: Login ---');
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    console.log('Login Success:', loginRes.data.message);
    console.log('User ID:', loginRes.data.user?.id);
  } catch (error) {
    console.error('Login Failed:', error.response?.data || error.message);
  }
}

testAuthFlow();
