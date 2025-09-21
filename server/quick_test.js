require('dotenv').config();
const axios = require('axios');

async function quickTest() {
  console.log('🧪 Quick Topic Restriction Test\n');
  
  const baseUrl = 'http://localhost:5000/api/chat';
  const testUserId = 'test-user-' + Date.now();
  
  try {
    // Create an AI session
    console.log('Creating AI session...');
    const sessionResponse = await axios.post(`${baseUrl}/sessions/ai`, {
      userId: testUserId
    });
    const sessionId = sessionResponse.data.data.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);
    
    // Test non-transportation query
    console.log('Testing non-transportation query: "help me make a cookie"');
    const response = await axios.post(`${baseUrl}/message`, {
      sessionId: sessionId,
      message: "help me make a cookie",
      userId: testUserId
    });
    
    console.log('✅ Response received!');
    console.log('Server response:', response.data.message);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

quickTest();