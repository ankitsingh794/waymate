// Comprehensive Server Test Suite for WayMate
// Tests authentication, authorization, API endpoints, database operations, and performance

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Trip = require('../models/Trip');
const Message = require('../models/Message');
const logger = require('../utils/logger');
require('dotenv').config();

class ServerTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            categories: {
                authentication: { tests: [], passed: 0, failed: 0 },
                authorization: { tests: [], passed: 0, failed: 0 },
                database: { tests: [], passed: 0, failed: 0 },
                api: { tests: [], passed: 0, failed: 0 },
                performance: { tests: [], passed: 0, failed: 0 },
                security: { tests: [], passed: 0, failed: 0 }
            },
            performance: {
                averageResponseTime: 0,
                slowestQuery: null,
                fastestQuery: null,
                dbConnections: 0
            },
            recommendations: []
        };
        this.testUsers = [];
    }

    async runAllTests() {
        console.log('🧪 Starting WayMate Server Test Suite...\n');
        
        try {
            await this.setupTestEnvironment();
            
            // Run test categories
            await this.runAuthenticationTests();
            await this.runAuthorizationTests();
            await this.runDatabaseTests();
            await this.runAPITests();
            await this.runPerformanceTests();
            await this.runSecurityTests();
            
            await this.cleanupTestEnvironment();
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            await this.cleanupTestEnvironment();
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Database connected');
        
        // Clean up existing test data
        await User.deleteMany({ email: { $regex: /test-.*@waymate\.test/ } });
        await Notification.deleteMany({ message: { $regex: /Test.*/ } });
        await Trip.deleteMany({ name: { $regex: /Test.*/ } });
        await Message.deleteMany({ text: { $regex: /Test.*/ } });
        
        console.log('🧹 Test environment cleaned\n');
    }

    async cleanupTestEnvironment() {
        console.log('\n🧹 Cleaning up test environment...');
        
        // Remove test data
        await User.deleteMany({ email: { $regex: /test-.*@waymate\.test/ } });
        await Notification.deleteMany({ message: { $regex: /Test.*/ } });
        await Trip.deleteMany({ name: { $regex: /Test.*/ } });
        await Message.deleteMany({ text: { $regex: /Test.*/ } });
        
        await mongoose.connection.close();
        console.log('✅ Cleanup completed');
    }

    async recordTest(category, testName, passed, duration, details = null, error = null) {
        this.results.totalTests++;
        
        const testResult = {
            name: testName,
            passed,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            details,
            error: error ? error.message : null
        };
        
        this.results.categories[category].tests.push(testResult);
        
        if (passed) {
            this.results.passedTests++;
            this.results.categories[category].passed++;
            console.log(`  ✅ ${testName} (${duration}ms)`);
        } else {
            this.results.failedTests++;
            this.results.categories[category].failed++;
            console.log(`  ❌ ${testName} (${duration}ms) - ${error?.message || 'Failed'}`);
        }
    }

    async runAuthenticationTests() {
        console.log('🔐 Running Authentication Tests...');
        
        // Test 1: User Registration
        const startTime = Date.now();
        try {
            const user = await User.create({
                name: 'Test User Auth',
                email: 'test-auth@waymate.test',
                password: 'TestPassword123!',
                role: 'user'
            });
            this.testUsers.push(user);
            await this.recordTest('authentication', 'User Registration', true, Date.now() - startTime, 
                { userId: user._id, email: user.email });
        } catch (error) {
            await this.recordTest('authentication', 'User Registration', false, Date.now() - startTime, null, error);
        }

        // Test 2: Password Hashing
        const hashStart = Date.now();
        try {
            const user = this.testUsers[0];
            const isPasswordHashed = user.password !== 'TestPassword123!';
            const isValidHash = await bcrypt.compare('TestPassword123!', user.password);
            
            if (isPasswordHashed && isValidHash) {
                await this.recordTest('authentication', 'Password Hashing', true, Date.now() - hashStart,
                    { hashLength: user.password.length, bcryptValid: isValidHash });
            } else {
                throw new Error('Password not properly hashed');
            }
        } catch (error) {
            await this.recordTest('authentication', 'Password Hashing', false, Date.now() - hashStart, null, error);
        }

        // Test 3: JWT Token Generation
        const jwtStart = Date.now();
        try {
            const user = this.testUsers[0];
            const token = jwt.sign(
                { id: user._id, email: user.email, role: user.role }, 
                process.env.JWT_SECRET, 
                { expiresIn: process.env.JWT_EXPIRE }
            );
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            await this.recordTest('authentication', 'JWT Token Generation', true, Date.now() - jwtStart,
                { tokenLength: token.length, decodedId: decoded.id, validExpiry: !!decoded.exp });
        } catch (error) {
            await this.recordTest('authentication', 'JWT Token Generation', false, Date.now() - jwtStart, null, error);
        }

        // Test 4: Invalid Credentials
        const invalidStart = Date.now();
        try {
            const user = this.testUsers[0];
            const isInvalidPassword = !(await bcrypt.compare('WrongPassword', user.password));
            
            if (isInvalidPassword) {
                await this.recordTest('authentication', 'Invalid Credentials Rejection', true, Date.now() - invalidStart,
                    { properlyRejected: true });
            } else {
                throw new Error('Invalid password was accepted');
            }
        } catch (error) {
            await this.recordTest('authentication', 'Invalid Credentials Rejection', false, Date.now() - invalidStart, null, error);
        }
    }

    async runAuthorizationTests() {
        console.log('\n🛡️ Running Authorization Tests...');

        // Test 1: User Role Assignment
        const roleStart = Date.now();
        try {
            const regularUser = await User.create({
                name: 'Regular User',
                email: 'test-regular@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            const researcherUser = await User.create({
                name: 'Researcher User',
                email: 'test-researcher@waymate.test',
                password: 'Password123!',
                role: 'researcher'
            });

            this.testUsers.push(regularUser, researcherUser);
            
            await this.recordTest('authorization', 'User Role Assignment', true, Date.now() - roleStart,
                { userRole: regularUser.role, researcherRole: researcherUser.role });
        } catch (error) {
            await this.recordTest('authorization', 'User Role Assignment', false, Date.now() - roleStart, null, error);
        }

        // Test 2: User-Specific Data Isolation
        const isolationStart = Date.now();
        try {
            const user1 = this.testUsers[0];
            const user2 = this.testUsers[1];

            // Create notifications for each user
            const notif1 = await Notification.create({
                user: user1._id,
                message: 'Test notification for user 1',
                type: 'system'
            });

            const notif2 = await Notification.create({
                user: user2._id,
                message: 'Test notification for user 2',
                type: 'system'
            });

            // Test isolation
            const user1Notifs = await Notification.find({ user: user1._id });
            const user2Notifs = await Notification.find({ user: user2._id });

            const isolationWorking = user1Notifs.length === 1 && user2Notifs.length === 1 &&
                                   user1Notifs[0].user.toString() === user1._id.toString() &&
                                   user2Notifs[0].user.toString() === user2._id.toString();

            if (isolationWorking) {
                await this.recordTest('authorization', 'User Data Isolation', true, Date.now() - isolationStart,
                    { user1Notifications: user1Notifs.length, user2Notifications: user2Notifs.length });
            } else {
                throw new Error('User data isolation failed');
            }
        } catch (error) {
            await this.recordTest('authorization', 'User Data Isolation', false, Date.now() - isolationStart, null, error);
        }
    }

    async runDatabaseTests() {
        console.log('\n🗄️ Running Database Tests...');

        // Test 1: Database Connection Health
        const connStart = Date.now();
        try {
            const adminDb = mongoose.connection.db.admin();
            const serverStatus = await adminDb.serverStatus();
            
            await this.recordTest('database', 'Database Connection Health', true, Date.now() - connStart,
                { uptime: serverStatus.uptime, connections: serverStatus.connections?.current });
        } catch (error) {
            await this.recordTest('database', 'Database Connection Health', false, Date.now() - connStart, null, error);
        }

        // Test 2: Index Performance
        const indexStart = Date.now();
        try {
            const indexes = await User.collection.getIndexes();
            const notificationIndexes = await Notification.collection.getIndexes();
            
            await this.recordTest('database', 'Index Configuration', true, Date.now() - indexStart,
                { userIndexes: Object.keys(indexes).length, notificationIndexes: Object.keys(notificationIndexes).length });
        } catch (error) {
            await this.recordTest('database', 'Index Configuration', false, Date.now() - indexStart, null, error);
        }

        // Test 3: Data Validation
        const validationStart = Date.now();
        try {
            // Test required field validation
            let validationError = null;
            try {
                await User.create({ name: 'Test', email: 'invalid' }); // Missing password
            } catch (err) {
                validationError = err;
            }

            if (validationError) {
                await this.recordTest('database', 'Schema Validation', true, Date.now() - validationStart,
                    { validationWorking: true, errorType: validationError.name });
            } else {
                throw new Error('Schema validation not working');
            }
        } catch (error) {
            await this.recordTest('database', 'Schema Validation', false, Date.now() - validationStart, null, error);
        }

        // Test 4: Query Performance
        const queryStart = Date.now();
        try {
            const user = this.testUsers[0];
            
            // Create multiple notifications for performance testing
            const notifications = [];
            for (let i = 0; i < 100; i++) {
                notifications.push({
                    user: user._id,
                    message: `Test performance notification ${i}`,
                    type: 'system'
                });
            }
            await Notification.insertMany(notifications);

            // Test query performance
            const queryTime = Date.now();
            const userNotifications = await Notification.find({ user: user._id }).limit(10);
            const queryDuration = Date.now() - queryTime;

            await this.recordTest('database', 'Query Performance', true, Date.now() - queryStart,
                { queryDuration: `${queryDuration}ms`, recordsFound: userNotifications.length, totalRecords: 100 });
        } catch (error) {
            await this.recordTest('database', 'Query Performance', false, Date.now() - queryStart, null, error);
        }
    }

    async runAPITests() {
        console.log('\n🌐 Running API Tests...');

        // Test 1: Environment Configuration
        const envStart = Date.now();
        try {
            const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'NODE_ENV'];
            const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
            
            if (missingVars.length === 0) {
                await this.recordTest('api', 'Environment Configuration', true, Date.now() - envStart,
                    { configuredVars: requiredEnvVars.length });
            } else {
                throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
            }
        } catch (error) {
            await this.recordTest('api', 'Environment Configuration', false, Date.now() - envStart, null, error);
        }

        // Test 2: Model Relationships
        const relationStart = Date.now();
        try {
            const user = this.testUsers[0];
            
            // Create a trip and verify relationship
            const trip = await Trip.create({
                name: 'Test Trip API',
                createdBy: user._id,
                participants: [user._id],
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000) // +1 day
            });

            // Test population
            const populatedTrip = await Trip.findById(trip._id).populate('createdBy');
            
            if (populatedTrip.createdBy.email === user.email) {
                await this.recordTest('api', 'Model Relationships', true, Date.now() - relationStart,
                    { tripId: trip._id, createdBy: populatedTrip.createdBy.email });
            } else {
                throw new Error('Model population failed');
            }
        } catch (error) {
            await this.recordTest('api', 'Model Relationships', false, Date.now() - relationStart, null, error);
        }
    }

    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Tests...');

        // Test 1: Bulk Operations
        const bulkStart = Date.now();
        try {
            const user = this.testUsers[0];
            
            // Bulk insert test
            const bulkNotifications = Array.from({ length: 1000 }, (_, i) => ({
                user: user._id,
                message: `Bulk test notification ${i}`,
                type: 'system'
            }));

            const insertStart = Date.now();
            await Notification.insertMany(bulkNotifications);
            const insertDuration = Date.now() - insertStart;

            // Bulk query test
            const queryStart = Date.now();
            const count = await Notification.countDocuments({ user: user._id });
            const queryDuration = Date.now() - queryStart;

            await this.recordTest('performance', 'Bulk Operations', true, Date.now() - bulkStart,
                { insertTime: `${insertDuration}ms`, queryTime: `${queryDuration}ms`, recordsInserted: 1000, recordsFound: count });
        } catch (error) {
            await this.recordTest('performance', 'Bulk Operations', false, Date.now() - bulkStart, null, error);
        }

        // Test 2: Concurrent Operations
        const concurrentStart = Date.now();
        try {
            const user = this.testUsers[0];
            
            // Simulate concurrent reads
            const concurrentQueries = Array.from({ length: 10 }, () => 
                Notification.find({ user: user._id }).limit(5)
            );

            const concurrentQueryStart = Date.now();
            const results = await Promise.all(concurrentQueries);
            const concurrentDuration = Date.now() - concurrentQueryStart;

            await this.recordTest('performance', 'Concurrent Operations', true, Date.now() - concurrentStart,
                { concurrentQueries: 10, averageTime: `${concurrentDuration / 10}ms`, totalTime: `${concurrentDuration}ms` });
        } catch (error) {
            await this.recordTest('performance', 'Concurrent Operations', false, Date.now() - concurrentStart, null, error);
        }
    }

    async runSecurityTests() {
        console.log('\n🔒 Running Security Tests...');

        // Test 1: Password Security
        const passwordStart = Date.now();
        try {
            const user = this.testUsers[0];
            
            // Check password is hashed and salted
            const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
            const isLongEnough = user.password.length >= 60; // bcrypt hash length
            
            if (isHashed && isLongEnough) {
                await this.recordTest('security', 'Password Security', true, Date.now() - passwordStart,
                    { hashType: 'bcrypt', hashLength: user.password.length });
            } else {
                throw new Error('Password not properly secured');
            }
        } catch (error) {
            await this.recordTest('security', 'Password Security', false, Date.now() - passwordStart, null, error);
        }

        // Test 2: JWT Security
        const jwtStart = Date.now();
        try {
            const user = this.testUsers[0];
            
            // Test token with short expiry
            const shortToken = jwt.sign(
                { id: user._id, test: true }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1ms' }
            );

            // Wait and verify token is expired
            await new Promise(resolve => setTimeout(resolve, 10));
            
            let tokenExpired = false;
            try {
                jwt.verify(shortToken, process.env.JWT_SECRET);
            } catch (err) {
                tokenExpired = err.name === 'TokenExpiredError';
            }

            if (tokenExpired) {
                await this.recordTest('security', 'JWT Expiry Security', true, Date.now() - jwtStart,
                    { expiryWorking: true });
            } else {
                throw new Error('JWT expiry not working');
            }
        } catch (error) {
            await this.recordTest('security', 'JWT Expiry Security', false, Date.now() - jwtStart, null, error);
        }

        // Test 3: Input Sanitization
        const sanitizationStart = Date.now();
        try {
            // Test with malicious input
            let sanitizationWorked = false;
            try {
                await User.create({
                    name: '<script>alert("xss")</script>',
                    email: 'test-malicious@waymate.test',
                    password: 'Password123!',
                    role: 'admin' // Should not be allowed if properly validated
                });
            } catch (err) {
                sanitizationWorked = true; // Good, validation should catch this
            }

            // If it doesn't throw, check if the data was sanitized
            if (!sanitizationWorked) {
                const maliciousUser = await User.findOne({ email: 'test-malicious@waymate.test' });
                if (maliciousUser && !maliciousUser.name.includes('<script>')) {
                    sanitizationWorked = true; // Data was sanitized
                }
            }

            await this.recordTest('security', 'Input Sanitization', sanitizationWorked, Date.now() - sanitizationStart,
                { sanitizationActive: sanitizationWorked });
        } catch (error) {
            await this.recordTest('security', 'Input Sanitization', false, Date.now() - sanitizationStart, null, error);
        }
    }

    generateRecommendations() {
        const { categories } = this.results;
        
        // Performance recommendations
        if (categories.performance.failed > 0) {
            this.results.recommendations.push({
                category: 'Performance',
                priority: 'High',
                issue: 'Performance tests failed',
                recommendation: 'Consider implementing database query optimization and connection pooling'
            });
        }

        // Security recommendations
        if (categories.security.failed > 0) {
            this.results.recommendations.push({
                category: 'Security',
                priority: 'Critical',
                issue: 'Security tests failed',
                recommendation: 'Review and strengthen security measures immediately'
            });
        }

        // Database recommendations
        if (categories.database.failed > 0) {
            this.results.recommendations.push({
                category: 'Database',
                priority: 'Medium',
                issue: 'Database tests failed',
                recommendation: 'Review database schema and indexing strategy'
            });
        }

        // General recommendations
        const successRate = (this.results.passedTests / this.results.totalTests) * 100;
        if (successRate < 90) {
            this.results.recommendations.push({
                category: 'General',
                priority: 'High',
                issue: `Overall success rate is ${successRate.toFixed(1)}%`,
                recommendation: 'Address failing tests to improve system reliability'
            });
        }
    }

    async generateReport() {
        console.log('\n📊 Generating Test Report...');
        
        this.generateRecommendations();
        
        const successRate = ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 WAYMATE SERVER TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`🕐 Timestamp: ${this.results.timestamp}`);
        console.log(`📊 Total Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed: ${this.results.passedTests}`);
        console.log(`❌ Failed: ${this.results.failedTests}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log('='.repeat(60));
        
        // Category breakdown
        for (const [category, data] of Object.entries(this.results.categories)) {
            if (data.tests.length > 0) {
                const categoryRate = ((data.passed / data.tests.length) * 100).toFixed(1);
                console.log(`\n${category.toUpperCase()}: ${data.passed}/${data.tests.length} (${categoryRate}%)`);
                
                data.tests.forEach(test => {
                    const status = test.passed ? '✅' : '❌';
                    console.log(`  ${status} ${test.name} (${test.duration})`);
                    if (test.error) {
                        console.log(`    Error: ${test.error}`);
                    }
                });
            }
        }
        
        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('💡 RECOMMENDATIONS');
            console.log('='.repeat(60));
            this.results.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
                console.log(`   → ${rec.recommendation}\n`);
            });
        }
        
        // Save results to file
        const fs = require('fs');
        const resultsPath = `./test-results/server-test-results-${Date.now()}.json`;
        
        // Ensure directory exists
        if (!fs.existsSync('./test-results')) {
            fs.mkdirSync('./test-results');
        }
        
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Results saved to: ${resultsPath}`);
    }
}

// Run the test suite
if (require.main === module) {
    const testSuite = new ServerTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = { ServerTestSuite };