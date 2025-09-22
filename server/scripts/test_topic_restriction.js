require('dotenv').config();
const axios = require('axios');

// Test queries to verify topic restriction
const testQueries = [
  {
    name: "Non-transportation: Cooking",
    query: "help me make a cookie in Japanese",
    expected: "should be rejected"
  },
  {
    name: "Non-transportation: Tech support", 
    query: "how do I fix my computer",
    expected: "should be rejected"
  },
  {
    name: "Transportation: Trip planning",
    query: "plan a trip to Tokyo",
    expected: "should be accepted"
  },
  {
    name: "Transportation: Local places",
    query: "find good restaurants near me",
    expected: "should be accepted"
  },
  {
    name: "Transportation: Travel advice",
    query: "what's the best time to visit Thailand",
    expected: "should be accepted"
  },
  {
    name: "Non-transportation: Math help",
    query: "solve this math equation: 2x + 5 = 15",
    expected: "should be rejected"
  }
];

async function testTopicRestriction() {
  console.log('🧪 Testing AI Topic Restriction Implementation\n');
  
  const baseUrl = 'http://localhost:5000/api/chat';
  const testUserId = 'test-user-' + Date.now();
  
  // First create an AI session
  try {
    const sessionResponse = await axios.post(`${baseUrl}/sessions/ai`, {
      userId: testUserId
    });
    const sessionId = sessionResponse.data.data.sessionId;
    console.log(`✅ Created test session: ${sessionId}\n`);
    
    // Test each query
    for (const test of testQueries) {
      console.log(`🔍 Testing: ${test.name}`);
      console.log(`Query: "${test.query}"`);
      console.log(`Expected: ${test.expected}`);
      
      try {
        const response = await axios.post(`${baseUrl}/message`, {
          sessionId: sessionId,
          message: test.query,
          userId: testUserId
        });
        
        console.log(`✅ Response received successfully`);
        console.log(`Status: ${response.data.message}\n`);
        
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.message || error.message}\n`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ Failed to create test session:', error.response?.data?.message || error.message);
  }
}

// Run the test if called directly
if (require.main === module) {
  testTopicRestriction().catch(console.error);
}

module.exports = { testTopicRestriction };