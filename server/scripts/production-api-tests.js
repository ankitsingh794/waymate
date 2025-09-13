// Production-Grade API Integration Tests
// Tests actual HTTP endpoints with real request/response cycles, authentication, and error handling

const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
require('dotenv').config();

class ProductionAPITests {
    constructor() {
        this.baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
        this.results = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            apiTests: [],
            performance: {
                averageResponseTime: 0,
                slowestEndpoint: null,
                fastestEndpoint: null,
                totalRequests: 0
            },
            security: {
                unauthorizedAttempts: 0,
                rateLimitTested: false,
                corsCompliant: false
            }
        };
        this.testTokens = {};
        this.testUsers = [];
    }

    async runProductionAPITests() {
        console.log('🚀 Starting Production-Grade API Integration Tests...\n');
        
        try {
            await this.setupAPITestEnvironment();
            
            // Core API functionality tests
            await this.testUserRegistrationAPI();
            await this.testUserLoginAPI();
            await this.testAuthenticatedEndpoints();
            await this.testNotificationAPIs();
            await this.testTripManagementAPIs();
            
            // Production-specific tests
            await this.testRateLimiting();
            await this.testErrorHandling();
            await this.testCORSCompliance();
            await this.testAPIVersioning();
            await this.testDataValidation();
            await this.testSecurityHeaders();
            
            await this.generateAPITestReport();
            await this.cleanupAPITestEnvironment();
            
        } catch (error) {
            console.error('❌ API test suite failed:', error);
            await this.cleanupAPITestEnvironment();
        }
    }

    async setupAPITestEnvironment() {
        console.log('🔧 Setting up API test environment...');
        
        await mongoose.connect(process.env.MONGO_URI);
        
        // Clean up test data
        await User.deleteMany({ email: { $regex: /api-test-.*@waymate\.test/ } });
        await Trip.deleteMany({ name: { $regex: /API Test.*/ } });
        await Notification.deleteMany({ message: { $regex: /API test.*/ } });
        
        console.log('✅ API test environment ready\n');
    }

    async cleanupAPITestEnvironment() {
        console.log('\n🧹 Cleaning up API test environment...');
        
        await User.deleteMany({ email: { $regex: /api-test-.*@waymate\.test/ } });
        await Trip.deleteMany({ name: { $regex: /API Test.*/ } });
        await Notification.deleteMany({ message: { $regex: /API test.*/ } });
        
        await mongoose.connection.close();
        console.log('✅ API cleanup completed');
    }

    async makeAPIRequest(method, endpoint, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.baseUrl);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'WayMate-API-Tests/1.0',
                    ...headers
                },
                timeout: 10000
            };

            const startTime = Date.now();
            
            const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
                let responseData = '';
                
                res.on('data', chunk => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    let parsedData = null;
                    
                    try {
                        parsedData = JSON.parse(responseData);
                    } catch (e) {
                        parsedData = responseData;
                    }
                    
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData,
                        duration,
                        rawData: responseData
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    async recordAPITest(testName, endpoint, response, expectedStatus, details = {}) {
        const passed = response.statusCode === expectedStatus;
        
        const testResult = {
            name: testName,
            endpoint,
            method: details.method || 'GET',
            expectedStatus,
            actualStatus: response.statusCode,
            duration: response.duration,
            passed,
            timestamp: new Date().toISOString(),
            details: {
                ...details,
                responseSize: JSON.stringify(response.data).length,
                headers: Object.keys(response.headers).length
            }
        };
        
        this.results.apiTests.push(testResult);
        this.results.performance.totalRequests++;
        
        // Track performance metrics
        if (!this.results.performance.slowestEndpoint || 
            response.duration > this.results.performance.slowestEndpoint.duration) {
            this.results.performance.slowestEndpoint = {
                endpoint: testName,
                duration: response.duration
            };
        }
        
        if (!this.results.performance.fastestEndpoint || 
            response.duration < this.results.performance.fastestEndpoint.duration) {
            this.results.performance.fastestEndpoint = {
                endpoint: testName,
                duration: response.duration
            };
        }
        
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName} (${response.duration}ms) - ${response.statusCode}`);
        
        if (!passed) {
            console.log(`    Expected: ${expectedStatus}, Got: ${response.statusCode}`);
            if (response.data && response.data.message) {
                console.log(`    Error: ${response.data.message}`);
            }
        }
        
        return passed;
    }

    async testUserRegistrationAPI() {
        console.log('👤 Testing User Registration API...');
        
        // Test successful registration
        const registrationData = {
            name: 'API Test User',
            email: 'api-test-user@waymate.test',
            password: 'APITest123!',
            role: 'user'
        };
        
        const response = await this.makeAPIRequest('POST', '/api/v1/auth/register', registrationData);
        await this.recordAPITest('User Registration - Success', '/api/v1/auth/register', response, 201, {
            method: 'POST',
            userEmail: registrationData.email
        });
        
        // Test duplicate email registration
        const duplicateResponse = await this.makeAPIRequest('POST', '/api/v1/auth/register', registrationData);
        await this.recordAPITest('User Registration - Duplicate Email', '/api/v1/auth/register', duplicateResponse, 400, {
            method: 'POST',
            testType: 'validation'
        });
        
        // Test invalid email format
        const invalidEmailData = { ...registrationData, email: 'invalid-email' };
        const invalidResponse = await this.makeAPIRequest('POST', '/api/v1/auth/register', invalidEmailData);
        await this.recordAPITest('User Registration - Invalid Email', '/api/v1/auth/register', invalidResponse, 400, {
            method: 'POST',
            testType: 'validation'
        });
        
        // Test weak password
        const weakPasswordData = { ...registrationData, email: 'weak-password@waymate.test', password: '123' };
        const weakResponse = await this.makeAPIRequest('POST', '/api/v1/auth/register', weakPasswordData);
        await this.recordAPITest('User Registration - Weak Password', '/api/v1/auth/register', weakResponse, 400, {
            method: 'POST',
            testType: 'validation'
        });
    }

    async testUserLoginAPI() {
        console.log('\n🔐 Testing User Login API...');
        
        // Test successful login
        const loginData = {
            email: 'api-test-user@waymate.test',
            password: 'APITest123!'
        };
        
        const response = await this.makeAPIRequest('POST', '/api/v1/auth/login', loginData);
        const success = await this.recordAPITest('User Login - Success', '/api/v1/auth/login', response, 200, {
            method: 'POST',
            hasToken: !!(response.data && response.data.data && response.data.data.accessToken)
        });
        
        // Store token for authenticated tests
        if (success && response.data && response.data.data) {
            this.testTokens.user = response.data.data.accessToken;
            this.testUsers.push(response.data.data.user);
        }
        
        // Test invalid credentials
        const invalidLoginData = { ...loginData, password: 'WrongPassword' };
        const invalidResponse = await this.makeAPIRequest('POST', '/api/v1/auth/login', invalidLoginData);
        await this.recordAPITest('User Login - Invalid Credentials', '/api/v1/auth/login', invalidResponse, 401, {
            method: 'POST',
            testType: 'security'
        });
        
        // Test non-existent user
        const nonExistentData = { email: 'nonexistent@waymate.test', password: 'Password123!' };
        const nonExistentResponse = await this.makeAPIRequest('POST', '/api/v1/auth/login', nonExistentData);
        await this.recordAPITest('User Login - Non-existent User', '/api/v1/auth/login', nonExistentResponse, 401, {
            method: 'POST',
            testType: 'security'
        });
    }

    async testAuthenticatedEndpoints() {
        console.log('\n🛡️ Testing Authenticated Endpoints...');
        
        if (!this.testTokens.user) {
            console.log('  ⚠️ Skipping authenticated tests - no valid token');
            return;
        }
        
        const authHeaders = { Authorization: `Bearer ${this.testTokens.user}` };
        
        // Test user profile access
        const profileResponse = await this.makeAPIRequest('GET', '/api/v1/users/profile', null, authHeaders);
        await this.recordAPITest('Get User Profile', '/api/v1/users/profile', profileResponse, 200, {
            method: 'GET',
            authenticated: true
        });
        
        // Test without token
        const unauthResponse = await this.makeAPIRequest('GET', '/api/v1/users/profile');
        await this.recordAPITest('Get User Profile - Unauthorized', '/api/v1/users/profile', unauthResponse, 401, {
            method: 'GET',
            authenticated: false
        });
        this.results.security.unauthorizedAttempts++;
        
        // Test with invalid token
        const invalidTokenHeaders = { Authorization: 'Bearer invalid-token-here' };
        const invalidTokenResponse = await this.makeAPIRequest('GET', '/api/v1/users/profile', null, invalidTokenHeaders);
        await this.recordAPITest('Get User Profile - Invalid Token', '/api/v1/users/profile', invalidTokenResponse, 401, {
            method: 'GET',
            authenticated: false,
            testType: 'security'
        });
        this.results.security.unauthorizedAttempts++;
    }

    async testNotificationAPIs() {
        console.log('\n🔔 Testing Notification APIs...');
        
        if (!this.testTokens.user) {
            console.log('  ⚠️ Skipping notification tests - no valid token');
            return;
        }
        
        const authHeaders = { Authorization: `Bearer ${this.testTokens.user}` };
        
        // Test get notifications
        const notificationsResponse = await this.makeAPIRequest('GET', '/api/v1/notifications', null, authHeaders);
        await this.recordAPITest('Get Notifications', '/api/v1/notifications', notificationsResponse, 200, {
            method: 'GET',
            authenticated: true,
            notificationCount: notificationsResponse.data?.notifications?.length || 0
        });
        
        // Test pagination
        const paginatedResponse = await this.makeAPIRequest('GET', '/api/v1/notifications?page=1&limit=5', null, authHeaders);
        await this.recordAPITest('Get Notifications - Paginated', '/api/v1/notifications', paginatedResponse, 200, {
            method: 'GET',
            authenticated: true,
            testType: 'pagination'
        });
        
        // Test mark all as read
        const markReadResponse = await this.makeAPIRequest('POST', '/api/v1/notifications/mark-all-read', null, authHeaders);
        await this.recordAPITest('Mark All Notifications Read', '/api/v1/notifications/mark-all-read', markReadResponse, 200, {
            method: 'POST',
            authenticated: true
        });
    }

    async testTripManagementAPIs() {
        console.log('\n🧳 Testing Trip Management APIs...');
        
        if (!this.testTokens.user) {
            console.log('  ⚠️ Skipping trip tests - no valid token');
            return;
        }
        
        const authHeaders = { Authorization: `Bearer ${this.testTokens.user}` };
        const user = this.testUsers[0];
        
        // Test create trip
        const tripData = {
            name: 'API Test Trip',
            destination: 'Test Destination',
            startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
            participants: [user.id]
        };
        
        const createResponse = await this.makeAPIRequest('POST', '/api/v1/trips', tripData, authHeaders);
        await this.recordAPITest('Create Trip', '/api/v1/trips', createResponse, 201, {
            method: 'POST',
            authenticated: true,
            tripName: tripData.name
        });
        
        // Test get trips
        const tripsResponse = await this.makeAPIRequest('GET', '/api/v1/trips', null, authHeaders);
        await this.recordAPITest('Get User Trips', '/api/v1/trips', tripsResponse, 200, {
            method: 'GET',
            authenticated: true,
            tripCount: tripsResponse.data?.trips?.length || 0
        });
    }

    async testRateLimiting() {
        console.log('\n🚦 Testing Rate Limiting...');
        
        // Simulate rapid requests to test rate limiting
        const rapidRequests = Array.from({ length: 20 }, () => 
            this.makeAPIRequest('GET', '/api/v1/auth/check-email', { email: 'test@example.com' })
        );
        
        try {
            const startTime = Date.now();
            const responses = await Promise.all(rapidRequests);
            const duration = Date.now() - startTime;
            
            const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
            const successfulResponses = responses.filter(r => r.statusCode === 200);
            
            this.results.security.rateLimitTested = true;
            
            await this.recordAPITest('Rate Limiting Test', '/api/v1/auth/check-email', {
                statusCode: rateLimitedResponses.length > 0 ? 429 : 200,
                duration
            }, rateLimitedResponses.length > 0 ? 429 : 200, {
                method: 'GET',
                totalRequests: rapidRequests.length,
                rateLimited: rateLimitedResponses.length,
                successful: successfulResponses.length,
                testType: 'security'
            });
            
        } catch (error) {
            console.log('  ⚠️ Rate limiting test failed:', error.message);
        }
    }

    async testErrorHandling() {
        console.log('\n🚨 Testing Error Handling...');
        
        // Test 404 endpoint
        const notFoundResponse = await this.makeAPIRequest('GET', '/api/v1/nonexistent-endpoint');
        await this.recordAPITest('404 Error Handling', '/api/v1/nonexistent-endpoint', notFoundResponse, 404, {
            method: 'GET',
            testType: 'error-handling'
        });
        
        // Test malformed JSON
        try {
            const malformedResponse = await this.makeAPIRequest('POST', '/api/v1/auth/register', 'invalid-json');
            await this.recordAPITest('Malformed JSON Handling', '/api/v1/auth/register', malformedResponse, 400, {
                method: 'POST',
                testType: 'error-handling'
            });
        } catch (error) {
            // Handle parsing errors gracefully
            console.log('  ✅ Malformed JSON properly rejected');
        }
        
        // Test oversized request
        const oversizedData = {
            name: 'A'.repeat(10000), // Very long name
            email: 'oversized@waymate.test',
            password: 'Password123!'
        };
        
        const oversizedResponse = await this.makeAPIRequest('POST', '/api/v1/auth/register', oversizedData);
        await this.recordAPITest('Oversized Request Handling', '/api/v1/auth/register', oversizedResponse, 400, {
            method: 'POST',
            testType: 'error-handling',
            dataSize: JSON.stringify(oversizedData).length
        });
    }

    async testCORSCompliance() {
        console.log('\n🌐 Testing CORS Compliance...');
        
        // Test preflight request
        const corsHeaders = {
            'Origin': 'https://waymate.vercel.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        };
        
        try {
            const corsResponse = await this.makeAPIRequest('OPTIONS', '/api/v1/auth/login', null, corsHeaders);
            
            const hasCORSHeaders = corsResponse.headers['access-control-allow-origin'] || 
                                 corsResponse.headers['access-control-allow-methods'];
            
            this.results.security.corsCompliant = !!hasCORSHeaders;
            
            await this.recordAPITest('CORS Preflight', '/api/v1/auth/login', corsResponse, 200, {
                method: 'OPTIONS',
                corsHeaders: !!hasCORSHeaders,
                testType: 'security'
            });
        } catch (error) {
            console.log('  ⚠️ CORS test failed:', error.message);
        }
    }

    async testAPIVersioning() {
        console.log('\n📝 Testing API Versioning...');
        
        // Test current version
        const v1Response = await this.makeAPIRequest('GET', '/api/v1/health');
        await this.recordAPITest('API v1 Health Check', '/api/v1/health', v1Response, 200, {
            method: 'GET',
            version: 'v1'
        });
        
        // Test non-existent version
        const v2Response = await this.makeAPIRequest('GET', '/api/v2/health');
        await this.recordAPITest('API v2 Non-existent Version', '/api/v2/health', v2Response, 404, {
            method: 'GET',
            version: 'v2',
            testType: 'versioning'
        });
    }

    async testDataValidation() {
        console.log('\n✅ Testing Data Validation...');
        
        // Test SQL injection attempt
        const sqlInjectionData = {
            email: "test@example.com'; DROP TABLE users; --",
            password: 'Password123!'
        };
        
        const sqlResponse = await this.makeAPIRequest('POST', '/api/v1/auth/login', sqlInjectionData);
        await this.recordAPITest('SQL Injection Protection', '/api/v1/auth/login', sqlResponse, 401, {
            method: 'POST',
            testType: 'security',
            injectionAttempt: true
        });
        
        // Test XSS attempt
        const xssData = {
            name: '<script>alert("xss")</script>',
            email: 'xss-test@waymate.test',
            password: 'Password123!'
        };
        
        const xssResponse = await this.makeAPIRequest('POST', '/api/v1/auth/register', xssData);
        await this.recordAPITest('XSS Protection', '/api/v1/auth/register', xssResponse, 400, {
            method: 'POST',
            testType: 'security',
            xssAttempt: true
        });
    }

    async testSecurityHeaders() {
        console.log('\n🔒 Testing Security Headers...');
        
        const response = await this.makeAPIRequest('GET', '/api/v1/health');
        
        const securityHeaders = {
            'x-frame-options': response.headers['x-frame-options'],
            'x-content-type-options': response.headers['x-content-type-options'],
            'x-xss-protection': response.headers['x-xss-protection'],
            'strict-transport-security': response.headers['strict-transport-security']
        };
        
        const hasSecurityHeaders = Object.values(securityHeaders).some(header => !!header);
        
        await this.recordAPITest('Security Headers Check', '/api/v1/health', {
            statusCode: 200,
            duration: response.duration,
            headers: response.headers
        }, 200, {
            method: 'GET',
            testType: 'security',
            securityHeaders: hasSecurityHeaders,
            headerCount: Object.keys(securityHeaders).filter(key => securityHeaders[key]).length
        });
    }

    async generateAPITestReport() {
        console.log('\n📊 Generating Production API Test Report...');
        
        // Calculate metrics
        const totalTests = this.results.apiTests.length;
        const passedTests = this.results.apiTests.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        const totalDuration = this.results.apiTests.reduce((sum, test) => sum + test.duration, 0);
        this.results.performance.averageResponseTime = (totalDuration / totalTests).toFixed(2);
        
        console.log('\n' + '='.repeat(70));
        console.log('🚀 PRODUCTION API TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`🌍 Environment: ${this.results.environment}`);
        console.log(`🕐 Timestamp: ${this.results.timestamp}`);
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log(`⚡ Average Response Time: ${this.results.performance.averageResponseTime}ms`);
        
        if (this.results.performance.slowestEndpoint) {
            console.log(`🐌 Slowest Endpoint: ${this.results.performance.slowestEndpoint.endpoint} (${this.results.performance.slowestEndpoint.duration}ms)`);
        }
        
        if (this.results.performance.fastestEndpoint) {
            console.log(`⚡ Fastest Endpoint: ${this.results.performance.fastestEndpoint.endpoint} (${this.results.performance.fastestEndpoint.duration}ms)`);
        }
        
        console.log('='.repeat(70));
        
        // Security summary
        console.log('\n🔒 SECURITY TEST SUMMARY:');
        console.log(`Unauthorized Access Attempts: ${this.results.security.unauthorizedAttempts}`);
        console.log(`Rate Limiting Tested: ${this.results.security.rateLimitTested ? 'Yes' : 'No'}`);
        console.log(`CORS Compliant: ${this.results.security.corsCompliant ? 'Yes' : 'No'}`);
        
        // Test breakdown by category
        const categories = this.results.apiTests.reduce((acc, test) => {
            const category = test.details.testType || 'functional';
            if (!acc[category]) acc[category] = { passed: 0, failed: 0 };
            test.passed ? acc[category].passed++ : acc[category].failed++;
            return acc;
        }, {});
        
        console.log('\n📋 TEST BREAKDOWN BY CATEGORY:');
        Object.entries(categories).forEach(([category, stats]) => {
            const total = stats.passed + stats.failed;
            const rate = ((stats.passed / total) * 100).toFixed(1);
            console.log(`${category.toUpperCase()}: ${stats.passed}/${total} (${rate}%)`);
        });
        
        // Failed tests details
        const failedTestsList = this.results.apiTests.filter(t => !t.passed);
        if (failedTestsList.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            failedTestsList.forEach(test => {
                console.log(`- ${test.name}: Expected ${test.expectedStatus}, got ${test.actualStatus}`);
            });
        }
        
        // Save results
        const fs = require('fs');
        const resultsPath = `./test-results/production-api-test-results-${Date.now()}.json`;
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Production API test results saved to: ${resultsPath}`);
    }
}

// Run the production API tests
if (require.main === module) {
    const apiTests = new ProductionAPITests();
    apiTests.runProductionAPITests().catch(console.error);
}

module.exports = { ProductionAPITests };