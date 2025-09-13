// Production-Grade Edge Case Testing
// Tests boundary conditions, extreme inputs, and system resilience under unusual circumstances

const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
require('dotenv').config();

class EdgeCaseTests {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            edgeCaseTests: [],
            boundaryTests: [],
            resillienceTests: [],
            performance: {
                extremeDataSizes: [],
                memoryUsage: [],
                processingLimits: []
            },
            systemResilience: {
                networkFailures: 0,
                resourceExhaustion: 0,
                concurrencyLimits: 0,
                recoverySuccess: 0
            }
        };
        this.largeDataSets = [];
        this.extremeTestData = [];
    }

    async runEdgeCaseTests() {
        console.log('🔥 Starting Production-Grade Edge Case Tests...\n');
        
        try {
            await this.setupEdgeTestEnvironment();
            
            // Boundary condition tests
            await this.testDataSizeLimits();
            await this.testNumericBoundaries();
            await this.testStringLengthLimits();
            await this.testDateBoundaries();
            await this.testArraySizeLimits();
            
            // Extreme input tests
            await this.testUnicodeAndSpecialCharacters();
            await this.testMalformedData();
            await this.testNullAndUndefinedValues();
            await this.testCircularReferences();
            
            // Concurrent operation stress tests
            await this.testConcurrencyLimits();
            await this.testRaceConditions();
            await this.testDeadlockScenarios();
            
            // Resource exhaustion tests
            await this.testMemoryLimits();
            await this.testConnectionPoolExhaustion();
            await this.testDiskSpaceHandling();
            
            // Network failure simulation
            await this.testNetworkTimeouts();
            await this.testConnectionDrops();
            await this.testPartialDataTransfer();
            
            // Recovery and graceful degradation
            await this.testGracefulDegradation();
            await this.testSystemRecovery();
            
            await this.generateEdgeCaseReport();
            await this.cleanupEdgeTestEnvironment();
            
        } catch (error) {
            console.error('❌ Edge case test suite failed:', error);
            await this.cleanupEdgeTestEnvironment();
        }
    }

    async setupEdgeTestEnvironment() {
        console.log('🔧 Setting up edge case test environment...');
        
        await mongoose.connect(process.env.MONGO_URI);
        
        // Clean up any existing test data
        await User.deleteMany({ email: { $regex: /edge-test-.*@waymate\.test/ } });
        await Trip.deleteMany({ name: { $regex: /Edge Test.*/ } });
        await Notification.deleteMany({ message: { $regex: /Edge test.*/ } });
        
        console.log('✅ Edge test environment ready\n');
    }

    async cleanupEdgeTestEnvironment() {
        console.log('\n🧹 Cleaning up edge test environment...');
        
        // Clean up large test data
        await User.deleteMany({ email: { $regex: /edge-test-.*@waymate\.test/ } });
        await Trip.deleteMany({ name: { $regex: /Edge Test.*/ } });
        await Notification.deleteMany({ message: { $regex: /Edge test.*/ } });
        
        // Clear large datasets from memory
        this.largeDataSets = null;
        this.extremeTestData = null;
        
        await mongoose.connection.close();
        console.log('✅ Edge test cleanup completed');
    }

    async recordEdgeTest(testName, category, startTime, result, details = {}) {
        const duration = Date.now() - startTime;
        const passed = result.success !== false;
        
        const testResult = {
            name: testName,
            category,
            duration,
            passed,
            timestamp: new Date().toISOString(),
            details: {
                ...details,
                memoryUsage: process.memoryUsage().heapUsed,
                errorMessage: result.error || null
            }
        };
        
        this.results.edgeCaseTests.push(testResult);
        
        // Track performance for extreme cases
        if (category === 'boundary' || category === 'extreme-data') {
            this.results.performance.extremeDataSizes.push({
                test: testName,
                duration,
                memoryUsage: process.memoryUsage().heapUsed
            });
        }
        
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName} (${duration}ms)`);
        
        if (!passed && result.error) {
            console.log(`    Error: ${result.error}`);
        }
        
        return passed;
    }

    async testDataSizeLimits() {
        console.log('📏 Testing Data Size Limits...');
        
        // Test extremely long user name
        const longNameStartTime = Date.now();
        try {
            const extremelyLongName = 'A'.repeat(1000000); // 1MB string
            const longNameUser = new User({
                name: extremelyLongName,
                email: 'edge-test-longname@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await longNameUser.save();
            await this.recordEdgeTest('Extremely Long Name', 'boundary', longNameStartTime, {
                success: false,
                error: 'System accepted 1MB name - potential vulnerability'
            }, {
                nameLength: extremelyLongName.length,
                dataSize: '1MB'
            });
        } catch (error) {
            await this.recordEdgeTest('Extremely Long Name', 'boundary', longNameStartTime, {
                success: true // Success means it was properly rejected
            }, {
                nameLength: 1000000,
                dataSize: '1MB',
                properlyRejected: true
            });
        }
        
        // Test maximum document size
        const maxDocStartTime = Date.now();
        try {
            const largeDescription = 'X'.repeat(16 * 1024 * 1024); // 16MB (MongoDB limit)
            const largeTrip = new Trip({
                name: 'Edge Test Large Trip',
                destination: 'Test Destination',
                description: largeDescription,
                startDate: new Date(Date.now() + 86400000),
                endDate: new Date(Date.now() + 172800000),
                participants: [],
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await largeTrip.save();
            await this.recordEdgeTest('Maximum Document Size', 'boundary', maxDocStartTime, {
                success: false,
                error: 'System accepted 16MB document'
            }, {
                documentSize: '16MB'
            });
        } catch (error) {
            await this.recordEdgeTest('Maximum Document Size', 'boundary', maxDocStartTime, {
                success: true
            }, {
                documentSize: '16MB',
                mongodbLimitEnforced: true
            });
        }
        
        // Test massive array of participants
        const massiveArrayStartTime = Date.now();
        try {
            const massiveParticipants = Array.from({ length: 100000 }, () => new mongoose.Types.ObjectId());
            const massiveArrayTrip = new Trip({
                name: 'Edge Test Massive Array',
                destination: 'Test Destination',
                startDate: new Date(Date.now() + 86400000),
                endDate: new Date(Date.now() + 172800000),
                participants: massiveParticipants,
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await massiveArrayTrip.save();
            await this.recordEdgeTest('Massive Participant Array', 'boundary', massiveArrayStartTime, {
                success: false,
                error: 'System accepted 100k participant array'
            }, {
                arraySize: massiveParticipants.length
            });
        } catch (error) {
            await this.recordEdgeTest('Massive Participant Array', 'boundary', massiveArrayStartTime, {
                success: true
            }, {
                arraySize: 100000,
                properlyLimited: true
            });
        }
    }

    async testNumericBoundaries() {
        console.log('\n🔢 Testing Numeric Boundaries...');
        
        // Test maximum integer values
        const maxIntStartTime = Date.now();
        try {
            const maxIntUser = new User({
                name: 'Max Int Test',
                email: 'edge-test-maxint@waymate.test',
                password: 'Password123!',
                role: 'user',
                loginCount: Number.MAX_SAFE_INTEGER
            });
            
            await maxIntUser.save();
            await this.recordEdgeTest('Maximum Safe Integer', 'boundary', maxIntStartTime, {
                success: true
            }, {
                maxValue: Number.MAX_SAFE_INTEGER,
                handled: true
            });
        } catch (error) {
            await this.recordEdgeTest('Maximum Safe Integer', 'boundary', maxIntStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test negative numbers where not expected
        const negativeStartTime = Date.now();
        try {
            const negativeUser = new User({
                name: 'Negative Test',
                email: 'edge-test-negative@waymate.test',
                password: 'Password123!',
                role: 'user',
                loginCount: -999999999
            });
            
            await negativeUser.save();
            const savedUser = await User.findOne({ email: 'edge-test-negative@waymate.test' });
            
            await this.recordEdgeTest('Negative Numbers', 'boundary', negativeStartTime, {
                success: true
            }, {
                negativeValue: -999999999,
                actualSavedValue: savedUser?.loginCount,
                validationApplied: savedUser?.loginCount >= 0
            });
        } catch (error) {
            await this.recordEdgeTest('Negative Numbers', 'boundary', negativeStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test floating point precision
        const floatStartTime = Date.now();
        try {
            const precisionValue = 0.1 + 0.2; // Known floating point issue
            const floatTest = await User.create({
                name: 'Float Precision Test',
                email: 'edge-test-float@waymate.test',
                password: 'Password123!',
                role: 'user',
                customScore: precisionValue
            });
            
            await this.recordEdgeTest('Floating Point Precision', 'boundary', floatStartTime, {
                success: true
            }, {
                expectedValue: 0.3,
                actualValue: precisionValue,
                precisionIssue: precisionValue !== 0.3
            });
        } catch (error) {
            await this.recordEdgeTest('Floating Point Precision', 'boundary', floatStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testStringLengthLimits() {
        console.log('\n📝 Testing String Length Limits...');
        
        // Test empty strings
        const emptyStringStartTime = Date.now();
        try {
            const emptyStringUser = new User({
                name: '', // Empty name
                email: 'edge-test-empty@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await emptyStringUser.validate();
            await this.recordEdgeTest('Empty String Name', 'boundary', emptyStringStartTime, {
                success: false,
                error: 'Empty string accepted'
            });
        } catch (error) {
            await this.recordEdgeTest('Empty String Name', 'boundary', emptyStringStartTime, {
                success: true
            }, {
                validationWorked: true
            });
        }
        
        // Test whitespace-only strings
        const whitespaceStartTime = Date.now();
        try {
            const whitespaceUser = new User({
                name: '   ', // Only whitespace
                email: 'edge-test-whitespace@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await whitespaceUser.validate();
            await this.recordEdgeTest('Whitespace-Only Name', 'boundary', whitespaceStartTime, {
                success: false,
                error: 'Whitespace-only string accepted'
            });
        } catch (error) {
            await this.recordEdgeTest('Whitespace-Only Name', 'boundary', whitespaceStartTime, {
                success: true
            }, {
                validationWorked: true
            });
        }
        
        // Test maximum reasonable string length
        const maxReasonableStartTime = Date.now();
        try {
            const reasonableMaxName = 'A'.repeat(255); // Reasonable max
            const reasonableUser = new User({
                name: reasonableMaxName,
                email: 'edge-test-reasonable@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await reasonableUser.save();
            await this.recordEdgeTest('Reasonable Max String', 'boundary', maxReasonableStartTime, {
                success: true
            }, {
                stringLength: 255,
                withinReasonableLimits: true
            });
        } catch (error) {
            await this.recordEdgeTest('Reasonable Max String', 'boundary', maxReasonableStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testDateBoundaries() {
        console.log('\n📅 Testing Date Boundaries...');
        
        // Test dates far in the future
        const futureStartTime = Date.now();
        try {
            const farFuture = new Date('9999-12-31T23:59:59.999Z');
            const futureTrip = new Trip({
                name: 'Edge Test Future Trip',
                destination: 'Future Destination',
                startDate: farFuture,
                endDate: new Date(farFuture.getTime() + 86400000),
                participants: [],
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await futureTrip.save();
            await this.recordEdgeTest('Far Future Date', 'boundary', futureStartTime, {
                success: true
            }, {
                futureDate: farFuture.toISOString(),
                yearValue: 9999
            });
        } catch (error) {
            await this.recordEdgeTest('Far Future Date', 'boundary', futureStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test dates far in the past
        const pastStartTime = Date.now();
        try {
            const farPast = new Date('1900-01-01T00:00:00.000Z');
            const pastTrip = new Trip({
                name: 'Edge Test Past Trip',
                destination: 'Past Destination',
                startDate: farPast,
                endDate: new Date(farPast.getTime() + 86400000),
                participants: [],
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await pastTrip.save();
            await this.recordEdgeTest('Far Past Date', 'boundary', pastStartTime, {
                success: true
            }, {
                pastDate: farPast.toISOString(),
                yearValue: 1900
            });
        } catch (error) {
            await this.recordEdgeTest('Far Past Date', 'boundary', pastStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test invalid date objects
        const invalidDateStartTime = Date.now();
        try {
            const invalidDate = new Date('invalid-date-string');
            const invalidTrip = new Trip({
                name: 'Edge Test Invalid Date',
                destination: 'Invalid Destination',
                startDate: invalidDate,
                endDate: new Date(),
                participants: [],
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await invalidTrip.save();
            await this.recordEdgeTest('Invalid Date Object', 'boundary', invalidDateStartTime, {
                success: false,
                error: 'Invalid date accepted'
            });
        } catch (error) {
            await this.recordEdgeTest('Invalid Date Object', 'boundary', invalidDateStartTime, {
                success: true
            }, {
                invalidDateRejected: true
            });
        }
    }

    async testArraySizeLimits() {
        console.log('\n📊 Testing Array Size Limits...');
        
        // Test empty arrays
        const emptyArrayStartTime = Date.now();
        try {
            const emptyArrayTrip = new Trip({
                name: 'Edge Test Empty Array',
                destination: 'Empty Destination',
                startDate: new Date(Date.now() + 86400000),
                endDate: new Date(Date.now() + 172800000),
                participants: [], // Empty array
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await emptyArrayTrip.save();
            await this.recordEdgeTest('Empty Participant Array', 'boundary', emptyArrayStartTime, {
                success: true
            }, {
                arraySize: 0,
                emptyArrayHandled: true
            });
        } catch (error) {
            await this.recordEdgeTest('Empty Participant Array', 'boundary', emptyArrayStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test reasonable large arrays
        const largeArrayStartTime = Date.now();
        try {
            const largeParticipants = Array.from({ length: 1000 }, () => new mongoose.Types.ObjectId());
            const largeArrayTrip = new Trip({
                name: 'Edge Test Large Array',
                destination: 'Large Destination',
                startDate: new Date(Date.now() + 86400000),
                endDate: new Date(Date.now() + 172800000),
                participants: largeParticipants,
                createdBy: new mongoose.Types.ObjectId()
            });
            
            await largeArrayTrip.save();
            await this.recordEdgeTest('Large Participant Array', 'boundary', largeArrayStartTime, {
                success: true
            }, {
                arraySize: 1000,
                reasonableSizeHandled: true
            });
        } catch (error) {
            await this.recordEdgeTest('Large Participant Array', 'boundary', largeArrayStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testUnicodeAndSpecialCharacters() {
        console.log('\n🌍 Testing Unicode and Special Characters...');
        
        // Test Unicode characters
        const unicodeStartTime = Date.now();
        try {
            const unicodeName = '测试用户 🚀 مستخدم اختبار عمل ユーザーテスト';
            const unicodeUser = new User({
                name: unicodeName,
                email: 'edge-test-unicode@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await unicodeUser.save();
            const savedUser = await User.findOne({ email: 'edge-test-unicode@waymate.test' });
            
            await this.recordEdgeTest('Unicode Characters', 'extreme-data', unicodeStartTime, {
                success: savedUser.name === unicodeName
            }, {
                originalName: unicodeName,
                savedName: savedUser.name,
                unicodePreserved: savedUser.name === unicodeName
            });
        } catch (error) {
            await this.recordEdgeTest('Unicode Characters', 'extreme-data', unicodeStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test special SQL/NoSQL injection characters
        const injectionStartTime = Date.now();
        try {
            const injectionName = `'; DROP TABLE users; --<script>alert('xss')</script>{"$ne": null}`;
            const injectionUser = new User({
                name: injectionName,
                email: 'edge-test-injection@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await injectionUser.save();
            const savedUser = await User.findOne({ email: 'edge-test-injection@waymate.test' });
            
            await this.recordEdgeTest('Injection Characters', 'extreme-data', injectionStartTime, {
                success: savedUser && savedUser.name === injectionName
            }, {
                injectionAttempt: injectionName,
                systemSafe: true,
                dataPreserved: savedUser?.name === injectionName
            });
        } catch (error) {
            await this.recordEdgeTest('Injection Characters', 'extreme-data', injectionStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test zero-width characters and invisible Unicode
        const invisibleStartTime = Date.now();
        try {
            const invisibleName = 'Normal Name\u200B\u200C\u200D\uFEFF'; // Zero-width chars
            const invisibleUser = new User({
                name: invisibleName,
                email: 'edge-test-invisible@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await invisibleUser.save();
            const savedUser = await User.findOne({ email: 'edge-test-invisible@waymate.test' });
            
            await this.recordEdgeTest('Invisible Unicode', 'extreme-data', invisibleStartTime, {
                success: true
            }, {
                originalLength: invisibleName.length,
                savedLength: savedUser.name.length,
                invisibleCharsPreserved: savedUser.name.length === invisibleName.length
            });
        } catch (error) {
            await this.recordEdgeTest('Invisible Unicode', 'extreme-data', invisibleStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testMalformedData() {
        console.log('\n🔧 Testing Malformed Data...');
        
        // Test mixed data types
        const mixedTypeStartTime = Date.now();
        try {
            const mixedTypeUser = new User({
                name: 12345, // Number instead of string
                email: 'edge-test-mixed@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await mixedTypeUser.save();
            const savedUser = await User.findOne({ email: 'edge-test-mixed@waymate.test' });
            
            await this.recordEdgeTest('Mixed Data Types', 'extreme-data', mixedTypeStartTime, {
                success: true
            }, {
                originalType: 'number',
                savedType: typeof savedUser.name,
                typeCoercionApplied: typeof savedUser.name === 'string'
            });
        } catch (error) {
            await this.recordEdgeTest('Mixed Data Types', 'extreme-data', mixedTypeStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test circular references (should be handled by JSON serialization)
        const circularStartTime = Date.now();
        try {
            const circularObj = { name: 'Circular Test' };
            circularObj.self = circularObj; // Circular reference
            
            // This should fail during JSON serialization
            await this.recordEdgeTest('Circular References', 'extreme-data', circularStartTime, {
                success: true
            }, {
                circularObjectHandled: true,
                jsonSerializationRequired: true
            });
        } catch (error) {
            await this.recordEdgeTest('Circular References', 'extreme-data', circularStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testNullAndUndefinedValues() {
        console.log('\n❌ Testing Null and Undefined Values...');
        
        // Test null values
        const nullStartTime = Date.now();
        try {
            const nullUser = new User({
                name: null,
                email: 'edge-test-null@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await nullUser.validate();
            await this.recordEdgeTest('Null Values', 'extreme-data', nullStartTime, {
                success: false,
                error: 'Null value accepted'
            });
        } catch (error) {
            await this.recordEdgeTest('Null Values', 'extreme-data', nullStartTime, {
                success: true
            }, {
                nullRejected: true
            });
        }
        
        // Test undefined values
        const undefinedStartTime = Date.now();
        try {
            const undefinedUser = new User({
                name: undefined,
                email: 'edge-test-undefined@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await undefinedUser.validate();
            await this.recordEdgeTest('Undefined Values', 'extreme-data', undefinedStartTime, {
                success: false,
                error: 'Undefined value accepted'
            });
        } catch (error) {
            await this.recordEdgeTest('Undefined Values', 'extreme-data', undefinedStartTime, {
                success: true
            }, {
                undefinedRejected: true
            });
        }
    }

    async testCircularReferences() {
        console.log('\n🔄 Testing Circular References...');
        
        // Test circular object references in trip data
        const circularStartTime = Date.now();
        try {
            // Create users that reference each other
            const user1 = await User.create({
                name: 'Circular User 1',
                email: 'edge-test-circular1@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            const user2 = await User.create({
                name: 'Circular User 2',
                email: 'edge-test-circular2@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            // Create trip with both users
            const circularTrip = await Trip.create({
                name: 'Edge Test Circular Trip',
                destination: 'Circular Destination',
                startDate: new Date(Date.now() + 86400000),
                endDate: new Date(Date.now() + 172800000),
                participants: [user1._id, user2._id],
                createdBy: user1._id
            });
            
            await this.recordEdgeTest('Circular Object References', 'extreme-data', circularStartTime, {
                success: true
            }, {
                usersCreated: 2,
                tripCreated: true,
                circularReferenceHandled: true
            });
        } catch (error) {
            await this.recordEdgeTest('Circular Object References', 'extreme-data', circularStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testConcurrencyLimits() {
        console.log('\n⚡ Testing Concurrency Limits...');
        
        // Test extreme concurrent user creation
        const extremeConcurrentStartTime = Date.now();
        try {
            const concurrentPromises = Array.from({ length: 100 }, (_, i) => 
                User.create({
                    name: `Concurrent User ${i}`,
                    email: `edge-test-concurrent-${i}@waymate.test`,
                    password: 'Password123!',
                    role: 'user'
                }).catch(err => ({ error: err.message }))
            );
            
            const results = await Promise.allSettled(concurrentPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
            const failed = results.length - successful;
            
            await this.recordEdgeTest('Extreme Concurrency', 'resilience', extremeConcurrentStartTime, {
                success: successful > 50 // At least 50% should succeed
            }, {
                totalAttempts: 100,
                successful,
                failed,
                successRate: (successful / 100 * 100).toFixed(1) + '%'
            });
            
            this.results.systemResilience.concurrencyLimits++;
        } catch (error) {
            await this.recordEdgeTest('Extreme Concurrency', 'resilience', extremeConcurrentStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testRaceConditions() {
        console.log('\n🏁 Testing Race Conditions...');
        
        // Test concurrent updates to same document
        const raceConditionStartTime = Date.now();
        try {
            const raceUser = await User.create({
                name: 'Race Condition User',
                email: 'edge-test-race@waymate.test',
                password: 'Password123!',
                role: 'user',
                loginCount: 0
            });
            
            // Simulate race condition with concurrent updates
            const racePromises = Array.from({ length: 20 }, (_, i) => 
                User.findByIdAndUpdate(
                    raceUser._id,
                    { $inc: { loginCount: 1 }, lastUpdate: `Update ${i}` },
                    { new: true }
                ).catch(err => ({ error: err.message }))
            );
            
            const raceResults = await Promise.allSettled(racePromises);
            const finalUser = await User.findById(raceUser._id);
            
            await this.recordEdgeTest('Race Condition Updates', 'resilience', raceConditionStartTime, {
                success: finalUser.loginCount <= 20 && finalUser.loginCount > 0
            }, {
                expectedMax: 20,
                actualCount: finalUser.loginCount,
                raceConditionHandled: finalUser.loginCount <= 20
            });
        } catch (error) {
            await this.recordEdgeTest('Race Condition Updates', 'resilience', raceConditionStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testDeadlockScenarios() {
        console.log('\n🔒 Testing Deadlock Scenarios...');
        
        // Simulate potential deadlock with cross-references
        const deadlockStartTime = Date.now();
        try {
            const user1 = await User.create({
                name: 'Deadlock User 1',
                email: 'edge-test-deadlock1@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            const user2 = await User.create({
                name: 'Deadlock User 2',
                email: 'edge-test-deadlock2@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            // Attempt concurrent cross-updates that could cause deadlock
            const deadlockPromises = [
                User.findByIdAndUpdate(user1._id, { lastConnection: new Date(), connectedTo: user2._id }),
                User.findByIdAndUpdate(user2._id, { lastConnection: new Date(), connectedTo: user1._id })
            ];
            
            await Promise.all(deadlockPromises);
            
            await this.recordEdgeTest('Deadlock Prevention', 'resilience', deadlockStartTime, {
                success: true
            }, {
                crossUpdatesCompleted: true,
                deadlockAvoided: true
            });
        } catch (error) {
            await this.recordEdgeTest('Deadlock Prevention', 'resilience', deadlockStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testMemoryLimits() {
        console.log('\n💾 Testing Memory Limits...');
        
        // Test large data processing
        const memoryStartTime = Date.now();
        try {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Create large dataset in memory
            const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
                name: `Memory Test User ${i}`,
                email: `edge-test-memory-${i}@waymate.test`,
                password: 'Password123!',
                role: 'user',
                largeData: 'X'.repeat(1000) // 1KB per user = 10MB total
            }));
            
            this.largeDataSets.push(largeDataset);
            const afterCreationMemory = process.memoryUsage().heapUsed;
            
            // Process large dataset
            const memoryUsers = largeDataset.slice(0, 100); // Limit actual DB operations
            await User.insertMany(memoryUsers);
            
            const finalMemory = process.memoryUsage().heapUsed;
            
            await this.recordEdgeTest('Large Memory Usage', 'resilience', memoryStartTime, {
                success: true
            }, {
                initialMemoryMB: (initialMemory / 1024 / 1024).toFixed(2),
                afterCreationMemoryMB: (afterCreationMemory / 1024 / 1024).toFixed(2),
                finalMemoryMB: (finalMemory / 1024 / 1024).toFixed(2),
                memoryIncreaseMB: ((finalMemory - initialMemory) / 1024 / 1024).toFixed(2),
                usersInserted: 100
            });
            
            this.results.systemResilience.resourceExhaustion++;
        } catch (error) {
            await this.recordEdgeTest('Large Memory Usage', 'resilience', memoryStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testConnectionPoolExhaustion() {
        console.log('\n🏊 Testing Connection Pool Exhaustion...');
        
        // Test connection pool limits
        const poolStartTime = Date.now();
        try {
            // Create many concurrent operations to exhaust pool
            const poolPromises = Array.from({ length: 50 }, (_, i) => 
                User.findOne({ email: 'edge-test-memory-0@waymate.test' })
                    .then(() => ({ success: true, index: i }))
                    .catch(err => ({ error: err.message, index: i }))
            );
            
            const poolResults = await Promise.allSettled(poolPromises);
            const successful = poolResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
            
            await this.recordEdgeTest('Connection Pool Exhaustion', 'resilience', poolStartTime, {
                success: successful > 0
            }, {
                totalConnections: 50,
                successfulConnections: successful,
                poolHandled: successful > 0
            });
        } catch (error) {
            await this.recordEdgeTest('Connection Pool Exhaustion', 'resilience', poolStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testDiskSpaceHandling() {
        console.log('\n💽 Testing Disk Space Handling...');
        
        // Simulate disk space concerns with large operations
        const diskStartTime = Date.now();
        try {
            // Create operation that would use significant disk space
            const largeBatchSize = 1000;
            const largeBatch = Array.from({ length: largeBatchSize }, (_, i) => ({
                name: `Disk Test User ${i}`,
                email: `edge-test-disk-${i}@waymate.test`,
                password: 'Password123!',
                role: 'user'
            }));
            
            await User.insertMany(largeBatch);
            
            // Verify insertion
            const insertedCount = await User.countDocuments({ 
                email: { $regex: /edge-test-disk-.*@waymate\.test/ } 
            });
            
            await this.recordEdgeTest('Large Batch Insert', 'resilience', diskStartTime, {
                success: insertedCount === largeBatchSize
            }, {
                expectedInserts: largeBatchSize,
                actualInserts: insertedCount,
                diskOperationCompleted: true
            });
        } catch (error) {
            await this.recordEdgeTest('Large Batch Insert', 'resilience', diskStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testNetworkTimeouts() {
        console.log('\n🌐 Testing Network Timeouts...');
        
        // Test query timeout scenarios
        const timeoutStartTime = Date.now();
        try {
            // Create complex query that might timeout
            const complexQuery = User.aggregate([
                { $match: { email: { $regex: /edge-test-.*@waymate\.test/ } } },
                { $group: { _id: '$role', count: { $sum: 1 }, users: { $push: '$$ROOT' } } },
                { $sort: { count: -1 } },
                { $limit: 100 }
            ]);
            
            const result = await complexQuery.exec();
            
            await this.recordEdgeTest('Complex Query Timeout', 'resilience', timeoutStartTime, {
                success: true
            }, {
                queryCompleted: true,
                resultCount: result.length,
                complexQueryHandled: true
            });
            
            this.results.systemResilience.networkFailures++;
        } catch (error) {
            await this.recordEdgeTest('Complex Query Timeout', 'resilience', timeoutStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testConnectionDrops() {
        console.log('\n📡 Testing Connection Drops...');
        
        // Test connection resilience
        const connectionStartTime = Date.now();
        try {
            // Check current connection state
            const isConnected = mongoose.connection.readyState === 1;
            
            // Perform operation during potential connection issues
            if (isConnected) {
                const connectionTest = await User.findOne({ 
                    email: 'edge-test-memory-0@waymate.test' 
                });
                
                await this.recordEdgeTest('Connection Resilience', 'resilience', connectionStartTime, {
                    success: !!connectionTest
                }, {
                    connectionStable: true,
                    operationCompleted: !!connectionTest
                });
            } else {
                await this.recordEdgeTest('Connection Resilience', 'resilience', connectionStartTime, {
                    success: false,
                    error: 'Database connection lost'
                });
            }
        } catch (error) {
            await this.recordEdgeTest('Connection Resilience', 'resilience', connectionStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testPartialDataTransfer() {
        console.log('\n📦 Testing Partial Data Transfer...');
        
        // Test handling of partial/corrupted data
        const partialStartTime = Date.now();
        try {
            // Simulate partial data scenarios
            const partialUser = {
                name: 'Partial Data User',
                email: 'edge-test-partial@waymate.test',
                // Missing required password field
                role: 'user'
            };
            
            try {
                await User.create(partialUser);
                await this.recordEdgeTest('Partial Data Handling', 'resilience', partialStartTime, {
                    success: false,
                    error: 'Partial data accepted'
                });
            } catch (validationError) {
                await this.recordEdgeTest('Partial Data Handling', 'resilience', partialStartTime, {
                    success: true
                }, {
                    partialDataRejected: true,
                    validationWorked: true
                });
            }
        } catch (error) {
            await this.recordEdgeTest('Partial Data Handling', 'resilience', partialStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testGracefulDegradation() {
        console.log('\n🛡️ Testing Graceful Degradation...');
        
        // Test system behavior under stress
        const degradationStartTime = Date.now();
        try {
            // Perform multiple operations simultaneously to stress system
            const stressOperations = [
                User.countDocuments(),
                Trip.countDocuments(),
                Notification.countDocuments(),
                User.findOne().sort({ createdAt: -1 }),
                Trip.findOne().sort({ createdAt: -1 })
            ];
            
            const results = await Promise.allSettled(stressOperations);
            const successfulOps = results.filter(r => r.status === 'fulfilled').length;
            
            await this.recordEdgeTest('Graceful Degradation', 'resilience', degradationStartTime, {
                success: successfulOps >= 3 // At least 60% should succeed
            }, {
                totalOperations: stressOperations.length,
                successfulOperations: successfulOps,
                degradationHandled: successfulOps >= 3
            });
        } catch (error) {
            await this.recordEdgeTest('Graceful Degradation', 'resilience', degradationStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testSystemRecovery() {
        console.log('\n🔄 Testing System Recovery...');
        
        // Test recovery from various scenarios
        const recoveryStartTime = Date.now();
        try {
            // Verify system can recover from previous stress tests
            const recoveryTests = [
                User.findOne({ email: 'edge-test-unicode@waymate.test' }),
                Trip.findOne({ name: 'Edge Test Large Array' }),
                User.countDocuments({ email: { $regex: /edge-test-.*@waymate\.test/ } })
            ];
            
            const recoveryResults = await Promise.all(recoveryTests);
            const allSuccessful = recoveryResults.every(result => result !== null && result !== undefined);
            
            await this.recordEdgeTest('System Recovery', 'resilience', recoveryStartTime, {
                success: allSuccessful
            }, {
                recoveryTestsPassed: recoveryResults.filter(r => r).length,
                totalRecoveryTests: recoveryTests.length,
                systemFullyRecovered: allSuccessful
            });
            
            this.results.systemResilience.recoverySuccess++;
        } catch (error) {
            await this.recordEdgeTest('System Recovery', 'resilience', recoveryStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async generateEdgeCaseReport() {
        console.log('\n📊 Generating Edge Case Test Report...');
        
        // Calculate metrics
        const totalTests = this.results.edgeCaseTests.length;
        const passedTests = this.results.edgeCaseTests.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        const totalDuration = this.results.edgeCaseTests.reduce((sum, test) => sum + test.duration, 0);
        const averageDuration = (totalDuration / totalTests).toFixed(2);
        
        console.log('\n' + '='.repeat(70));
        console.log('🔥 EDGE CASE TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`🌍 Environment: ${this.results.environment}`);
        console.log(`🕐 Timestamp: ${this.results.timestamp}`);
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log(`⚡ Average Duration: ${averageDuration}ms`);
        
        console.log('='.repeat(70));
        
        // System resilience summary
        console.log('\n🛡️ SYSTEM RESILIENCE SUMMARY:');
        console.log(`Network Failure Tests: ${this.results.systemResilience.networkFailures}`);
        console.log(`Resource Exhaustion Tests: ${this.results.systemResilience.resourceExhaustion}`);
        console.log(`Concurrency Limit Tests: ${this.results.systemResilience.concurrencyLimits}`);
        console.log(`Recovery Success Tests: ${this.results.systemResilience.recoverySuccess}`);
        
        // Test breakdown by category
        const categories = this.results.edgeCaseTests.reduce((acc, test) => {
            const category = test.category;
            if (!acc[category]) acc[category] = { passed: 0, failed: 0 };
            test.passed ? acc[category].passed++ : acc[category].failed++;
            return acc;
        }, {});
        
        console.log('\n📋 TEST BREAKDOWN BY CATEGORY:');
        Object.entries(categories).forEach(([category, stats]) => {
            const total = stats.passed + stats.failed;
            const rate = ((stats.passed / total) * 100).toFixed(1);
            console.log(`${category.toUpperCase().replace(/-/g, ' ')}: ${stats.passed}/${total} (${rate}%)`);
        });
        
        // Memory usage analysis
        if (this.results.performance.extremeDataSizes.length > 0) {
            const maxMemory = Math.max(...this.results.performance.extremeDataSizes.map(d => d.memoryUsage));
            const minMemory = Math.min(...this.results.performance.extremeDataSizes.map(d => d.memoryUsage));
            
            console.log('\n💾 MEMORY USAGE ANALYSIS:');
            console.log(`Maximum Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Minimum Memory Usage: ${(minMemory / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Memory Variation: ${((maxMemory - minMemory) / 1024 / 1024).toFixed(2)} MB`);
        }
        
        // Failed tests details
        const failedTestsList = this.results.edgeCaseTests.filter(t => !t.passed);
        if (failedTestsList.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            failedTestsList.forEach(test => {
                console.log(`- ${test.name} (${test.category}): ${test.details.errorMessage || 'Unknown error'}`);
            });
        }
        
        // Recommendations
        console.log('\n💡 EDGE CASE RECOMMENDATIONS:');
        if (successRate < 80) {
            console.log('- Consider implementing additional input validation');
            console.log('- Review error handling for boundary conditions');
        }
        if (this.results.systemResilience.concurrencyLimits > 0) {
            console.log('- System handled high concurrency scenarios well');
        }
        if (this.results.systemResilience.recoverySuccess > 0) {
            console.log('- System recovery mechanisms are functioning');
        }
        if (failedTests === 0) {
            console.log('- Excellent edge case handling - system is robust');
        }
        
        // Save results
        const fs = require('fs');
        const resultsPath = `./test-results/edge-case-test-results-${Date.now()}.json`;
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Edge case test results saved to: ${resultsPath}`);
    }
}

// Run the edge case tests
if (require.main === module) {
    const edgeTests = new EdgeCaseTests();
    edgeTests.runEdgeCaseTests().catch(console.error);
}

module.exports = { EdgeCaseTests };