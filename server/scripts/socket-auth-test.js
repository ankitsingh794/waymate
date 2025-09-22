// Test script to verify JWT expiration handling in socket authentication
const jwt = require('jsonwebtoken');
const { authenticateSocket } = require('../utils/socket');

// Mock objects for testing
const mockSocket = {
  handshake: {
    auth: {}
  }
};

const mockNext = (error) => {
  if (error) {
    console.log('❌ Authentication failed:', error.message);
  } else {
    console.log('✅ Authentication successful');
  }
};

// Mock Redis cache
jest.mock('../config/redis', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));

// Mock User model
jest.mock('../models/User', () => ({
  findById: jest.fn().mockResolvedValue({
    _id: 'test-user-id',
    email: 'test@example.com',
    accountStatus: 'active',
    passwordChangedAt: null
  })
}));

describe('Socket Authentication JWT Expiration Handling', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  test('should handle expired JWT tokens gracefully', async () => {
    // Create an expired token (expired 1 hour ago)
    const expiredToken = jwt.sign(
      { 
        id: 'test-user-id', 
        jti: 'test-jti',
        iat: Math.floor(Date.now() / 1000) - 3600, // issued 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 1800  // expired 30 minutes ago
      },
      process.env.JWT_SECRET
    );

    mockSocket.handshake.auth.token = expiredToken;

    // This should not crash and should handle the error gracefully
    await authenticateSocket(mockSocket, mockNext);
    
    // The test passes if we reach this point without crashing
    console.log('✅ Expired token test completed without crashing');
  });

  test('should handle invalid JWT tokens gracefully', async () => {
    mockSocket.handshake.auth.token = 'invalid.jwt.token';

    await authenticateSocket(mockSocket, mockNext);
    
    console.log('✅ Invalid token test completed without crashing');
  });

  test('should handle malformed JWT tokens gracefully', async () => {
    mockSocket.handshake.auth.token = 'not-a-jwt-at-all';

    await authenticateSocket(mockSocket, mockNext);
    
    console.log('✅ Malformed token test completed without crashing');
  });
});

console.log('Socket Authentication JWT Tests');
console.log('==================================');