// Enhanced Stress Testing Suite for WayMate Server
// Tests server under high load, concurrent users, and extreme scenarios

const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Trip = require('../models/Trip');
const Message = require('../models/Message');
require('dotenv').config();

class StressTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            stressTests: [],
            performance: {
                peakMemoryUsage: 0,
                averageResponseTime: 0,
                maxConcurrentUsers: 0,
                databaseConnections: 0,
                totalQueries: 0
            },
            reliability: {
                uptime: 0,
                errorRate: 0,
                throughput: 0
            }
        };
        this.startTime = Date.now();
    }

    async runStressTests() {
        console.log('🔥 Starting WayMate Server Stress Testing Suite...\n');
        
        try {
            await this.setupStressEnvironment();
            
            await this.testHighVolumeUserCreation();
            await this.testConcurrentDatabaseOperations();
            await this.testMassiveNotificationDelivery();
            await this.testLongRunningQueries();
            await this.testMemoryLeakDetection();
            await this.testDatabaseConnectionPooling();
            await this.testExtremeDataVolumes();
            
            await this.generateStressReport();
            await this.cleanupStressEnvironment();
            
        } catch (error) {
            console.error('❌ Stress test suite failed:', error);
            await this.cleanupStressEnvironment();
        }
    }

    async setupStressEnvironment() {
        console.log('🔧 Setting up stress test environment...');
        
        await mongoose.connect(process.env.MONGO_URI);
        
        // Clean up any existing stress test data
        await User.deleteMany({ email: { $regex: /stress-test-.*@waymate\.test/ } });
        await Notification.deleteMany({ message: { $regex: /Stress test.*/ } });
        await Trip.deleteMany({ name: { $regex: /Stress.*/ } });
        
        console.log('✅ Stress environment ready\n');
    }

    async cleanupStressEnvironment() {
        console.log('\n🧹 Cleaning up stress test data...');
        
        await User.deleteMany({ email: { $regex: /stress-test-.*@waymate\.test/ } });
        await Notification.deleteMany({ message: { $regex: /Stress test.*/ } });
        await Trip.deleteMany({ name: { $regex: /Stress.*/ } });
        
        await mongoose.connection.close();
        console.log('✅ Stress cleanup completed');
    }

    async recordStressTest(testName, duration, details, success = true) {
        const result = {
            name: testName,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            success,
            details,
            memoryUsage: process.memoryUsage()
        };
        
        this.results.stressTests.push(result);
        this.results.performance.peakMemoryUsage = Math.max(
            this.results.performance.peakMemoryUsage, 
            process.memoryUsage().heapUsed
        );
        
        const status = success ? '✅' : '❌';
        console.log(`  ${status} ${testName} (${duration}ms)`);
        if (details.recordsProcessed) {
            console.log(`    📊 Processed: ${details.recordsProcessed} records`);
        }
        if (details.throughput) {
            console.log(`    ⚡ Throughput: ${details.throughput} ops/sec`);
        }
    }

    async testHighVolumeUserCreation() {
        console.log('👥 Testing High Volume User Creation...');
        
        const userCount = 5000;
        const batchSize = 100;
        const startTime = Date.now();
        
        try {
            let totalUsers = 0;
            
            for (let batch = 0; batch < userCount / batchSize; batch++) {
                const users = [];
                for (let i = 0; i < batchSize; i++) {
                    const userIndex = batch * batchSize + i;
                    users.push({
                        name: `Stress User ${userIndex}`,
                        email: `stress-test-${userIndex}@waymate.test`,
                        password: 'StressTest123!',
                        role: 'user'
                    });
                }
                
                await User.insertMany(users);
                totalUsers += batchSize;
                
                if (batch % 10 === 0) {
                    console.log(`    Progress: ${totalUsers}/${userCount} users created`);
                }
            }
            
            const duration = Date.now() - startTime;
            const throughput = Math.round((userCount / duration) * 1000);
            
            await this.recordStressTest('High Volume User Creation', duration, {
                recordsProcessed: userCount,
                batchSize,
                throughput: `${throughput} users/sec`
            });
            
        } catch (error) {
            await this.recordStressTest('High Volume User Creation', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async testConcurrentDatabaseOperations() {
        console.log('\n🔄 Testing Concurrent Database Operations...');
        
        const concurrency = 50;
        const operationsPerWorker = 100;
        const startTime = Date.now();
        
        try {
            // Get some test users
            const users = await User.find({ email: { $regex: /stress-test-.*@waymate\.test/ } }).limit(100);
            
            const workers = Array.from({ length: concurrency }, async (_, workerIndex) => {
                const operations = [];
                
                for (let i = 0; i < operationsPerWorker; i++) {
                    const user = users[Math.floor(Math.random() * users.length)];
                    
                    // Mix of different operations
                    if (i % 3 === 0) {
                        // Create notification
                        operations.push(Notification.create({
                            user: user._id,
                            message: `Stress test notification ${workerIndex}-${i}`,
                            type: 'system'
                        }));
                    } else if (i % 3 === 1) {
                        // Query notifications
                        operations.push(Notification.find({ user: user._id }).limit(5));
                    } else {
                        // Update user
                        operations.push(User.findByIdAndUpdate(user._id, { 
                            lastActive: new Date() 
                        }));
                    }
                }
                
                return Promise.all(operations);
            });
            
            await Promise.all(workers);
            
            const duration = Date.now() - startTime;
            const totalOperations = concurrency * operationsPerWorker;
            const throughput = Math.round((totalOperations / duration) * 1000);
            
            await this.recordStressTest('Concurrent Database Operations', duration, {
                concurrentWorkers: concurrency,
                operationsPerWorker,
                totalOperations,
                throughput: `${throughput} ops/sec`
            });
            
        } catch (error) {
            await this.recordStressTest('Concurrent Database Operations', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async testMassiveNotificationDelivery() {
        console.log('\n📢 Testing Massive Notification Delivery...');
        
        const notificationCount = 10000;
        const startTime = Date.now();
        
        try {
            const users = await User.find({ email: { $regex: /stress-test-.*@waymate\.test/ } }).limit(1000);
            
            // Create notifications in batches
            const batchSize = 500;
            let totalNotifications = 0;
            
            for (let batch = 0; batch < notificationCount / batchSize; batch++) {
                const notifications = [];
                
                for (let i = 0; i < batchSize; i++) {
                    const user = users[Math.floor(Math.random() * users.length)];
                    notifications.push({
                        user: user._id,
                        message: `Stress test mass notification ${batch * batchSize + i}`,
                        type: 'system',
                        priority: Math.random() > 0.5 ? 'normal' : 'high'
                    });
                }
                
                await Notification.insertMany(notifications);
                totalNotifications += batchSize;
                
                if (batch % 5 === 0) {
                    console.log(`    Progress: ${totalNotifications}/${notificationCount} notifications created`);
                }
            }
            
            // Test querying these notifications
            const queryStart = Date.now();
            const sampleUser = users[0];
            const userNotifications = await Notification.find({ user: sampleUser._id })
                .sort({ createdAt: -1 })
                .limit(50);
            const queryDuration = Date.now() - queryStart;
            
            const duration = Date.now() - startTime;
            const throughput = Math.round((notificationCount / duration) * 1000);
            
            await this.recordStressTest('Massive Notification Delivery', duration, {
                recordsProcessed: notificationCount,
                queryDuration: `${queryDuration}ms`,
                sampleQueryResults: userNotifications.length,
                throughput: `${throughput} notifications/sec`
            });
            
        } catch (error) {
            await this.recordStressTest('Massive Notification Delivery', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async testLongRunningQueries() {
        console.log('\n🐌 Testing Long Running Queries...');
        
        const startTime = Date.now();
        
        try {
            // Complex aggregation query
            const aggregationStart = Date.now();
            const userStats = await User.aggregate([
                {
                    $lookup: {
                        from: 'notifications',
                        localField: '_id',
                        foreignField: 'user',
                        as: 'notifications'
                    }
                },
                {
                    $addFields: {
                        notificationCount: { $size: '$notifications' },
                        unreadCount: {
                            $size: {
                                $filter: {
                                    input: '$notifications',
                                    cond: { $eq: ['$$this.read', false] }
                                }
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$role',
                        totalUsers: { $sum: 1 },
                        avgNotifications: { $avg: '$notificationCount' },
                        totalNotifications: { $sum: '$notificationCount' }
                    }
                }
            ]);
            const aggregationDuration = Date.now() - aggregationStart;
            
            // Text search simulation
            const searchStart = Date.now();
            const searchResults = await User.find({
                $or: [
                    { name: { $regex: /stress/i } },
                    { email: { $regex: /stress/i } }
                ]
            }).limit(100);
            const searchDuration = Date.now() - searchStart;
            
            // Complex notification query
            const complexQueryStart = Date.now();
            const complexResults = await Notification.find({
                $and: [
                    { type: 'system' },
                    { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                    { priority: { $in: ['normal', 'high'] } }
                ]
            }).populate('user').sort({ createdAt: -1 }).limit(200);
            const complexQueryDuration = Date.now() - complexQueryStart;
            
            const duration = Date.now() - startTime;
            
            await this.recordStressTest('Long Running Queries', duration, {
                aggregationTime: `${aggregationDuration}ms`,
                aggregationResults: userStats.length,
                searchTime: `${searchDuration}ms`,
                searchResults: searchResults.length,
                complexQueryTime: `${complexQueryDuration}ms`,
                complexQueryResults: complexResults.length
            });
            
        } catch (error) {
            await this.recordStressTest('Long Running Queries', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async testMemoryLeakDetection() {
        console.log('\n🧠 Testing Memory Leak Detection...');
        
        const startTime = Date.now();
        const initialMemory = process.memoryUsage();
        
        try {
            // Simulate memory-intensive operations
            const iterations = 1000;
            const memorySnapshots = [];
            
            for (let i = 0; i < iterations; i++) {
                // Create and immediately query large datasets
                const users = await User.find({}).limit(100);
                const notifications = await Notification.find({}).limit(200);
                
                // Force garbage collection check every 100 iterations
                if (i % 100 === 0) {
                    const currentMemory = process.memoryUsage();
                    memorySnapshots.push({
                        iteration: i,
                        heapUsed: currentMemory.heapUsed,
                        heapTotal: currentMemory.heapTotal,
                        external: currentMemory.external
                    });
                    
                    if (global.gc) {
                        global.gc();
                    }
                }
                
                // Clear references
                users.length = 0;
                notifications.length = 0;
            }
            
            const finalMemory = process.memoryUsage();
            const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            const duration = Date.now() - startTime;
            
            await this.recordStressTest('Memory Leak Detection', duration, {
                iterations,
                initialMemory: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
                finalMemory: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
                memoryGrowth: `${Math.round(memoryGrowth / 1024 / 1024)}MB`,
                snapshots: memorySnapshots.length,
                leakDetected: memoryGrowth > 100 * 1024 * 1024 // Flag if >100MB growth
            });
            
        } catch (error) {
            await this.recordStressTest('Memory Leak Detection', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async testDatabaseConnectionPooling() {
        console.log('\n🏊 Testing Database Connection Pooling...');
        
        const startTime = Date.now();
        
        try {
            // Get connection pool stats
            const db = mongoose.connection.db;
            const admin = db.admin();
            
            // Test rapid connection creation/destruction simulation
            const rapidQueries = Array.from({ length: 200 }, async (_, i) => {
                // Random delay to simulate real-world usage
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                
                // Mix of different query types
                if (i % 3 === 0) {
                    return User.findOne({}).lean();
                } else if (i % 3 === 1) {
                    return Notification.countDocuments({});
                } else {
                    return User.find({}).limit(5).lean();
                }
            });
            
            const queryStart = Date.now();
            await Promise.all(rapidQueries);
            const queryDuration = Date.now() - queryStart;
            
            // Get final connection stats
            const serverStatus = await admin.serverStatus();
            const duration = Date.now() - startTime;
            
            await this.recordStressTest('Database Connection Pooling', duration, {
                rapidQueries: rapidQueries.length,
                queryDuration: `${queryDuration}ms`,
                connections: serverStatus.connections?.current || 'N/A',
                availableConnections: serverStatus.connections?.available || 'N/A',
                totalCreated: serverStatus.connections?.totalCreated || 'N/A'
            });
            
        } catch (error) {
            await this.recordStressTest('Database Connection Pooling', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async testExtremeDataVolumes() {
        console.log('\n📊 Testing Extreme Data Volumes...');
        
        const startTime = Date.now();
        
        try {
            // Test with extreme pagination
            const pageSize = 1000;
            const totalPages = 10;
            let totalRecords = 0;
            
            for (let page = 0; page < totalPages; page++) {
                const skip = page * pageSize;
                const paginationStart = Date.now();
                
                const records = await Notification.find({})
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .lean(); // Use lean for better performance
                
                const paginationDuration = Date.now() - paginationStart;
                totalRecords += records.length;
                
                console.log(`    Page ${page + 1}/${totalPages}: ${records.length} records (${paginationDuration}ms)`);
                
                if (records.length === 0) break; // No more records
            }
            
            // Test sorting performance on large dataset
            const sortStart = Date.now();
            const sortedResults = await Notification.find({})
                .sort({ createdAt: -1, priority: 1 })
                .limit(100)
                .lean();
            const sortDuration = Date.now() - sortStart;
            
            // Test count operation performance
            const countStart = Date.now();
            const totalCount = await Notification.countDocuments({});
            const countDuration = Date.now() - countStart;
            
            const duration = Date.now() - startTime;
            
            await this.recordStressTest('Extreme Data Volumes', duration, {
                paginatedRecords: totalRecords,
                totalPages: totalPages,
                sortPerformance: `${sortDuration}ms`,
                sortedResults: sortedResults.length,
                countPerformance: `${countDuration}ms`,
                totalRecordsInDB: totalCount
            });
            
        } catch (error) {
            await this.recordStressTest('Extreme Data Volumes', Date.now() - startTime, {
                error: error.message
            }, false);
        }
    }

    async generateStressReport() {
        console.log('\n📊 Generating Stress Test Report...');
        
        const totalDuration = Date.now() - this.startTime;
        const successfulTests = this.results.stressTests.filter(t => t.success).length;
        const failedTests = this.results.stressTests.length - successfulTests;
        
        // Calculate performance metrics
        const totalOperations = this.results.stressTests.reduce((sum, test) => {
            return sum + (test.details.recordsProcessed || 0);
        }, 0);
        
        this.results.performance.totalQueries = totalOperations;
        this.results.performance.averageResponseTime = totalDuration / this.results.stressTests.length;
        this.results.reliability.uptime = totalDuration;
        this.results.reliability.errorRate = (failedTests / this.results.stressTests.length) * 100;
        this.results.reliability.throughput = Math.round((totalOperations / totalDuration) * 1000);
        
        console.log('\n' + '='.repeat(70));
        console.log('🔥 WAYMATE SERVER STRESS TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`🕐 Total Duration: ${totalDuration}ms`);
        console.log(`📊 Tests Executed: ${this.results.stressTests.length}`);
        console.log(`✅ Successful: ${successfulTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`🎯 Success Rate: ${((successfulTests / this.results.stressTests.length) * 100).toFixed(1)}%`);
        console.log(`🧠 Peak Memory: ${Math.round(this.results.performance.peakMemoryUsage / 1024 / 1024)}MB`);
        console.log(`⚡ Total Operations: ${totalOperations}`);
        console.log(`🚀 Throughput: ${this.results.reliability.throughput} ops/sec`);
        console.log('='.repeat(70));
        
        // Detailed test results
        this.results.stressTests.forEach((test, index) => {
            const status = test.success ? '✅' : '❌';
            console.log(`\n${index + 1}. ${status} ${test.name} (${test.duration})`);
            
            if (test.details) {
                Object.entries(test.details).forEach(([key, value]) => {
                    if (key !== 'error') {
                        console.log(`   ${key}: ${value}`);
                    }
                });
            }
            
            if (!test.success && test.details.error) {
                console.log(`   Error: ${test.details.error}`);
            }
        });
        
        // Performance analysis
        console.log('\n' + '='.repeat(70));
        console.log('📈 PERFORMANCE ANALYSIS');
        console.log('='.repeat(70));
        console.log(`Average Response Time: ${this.results.performance.averageResponseTime.toFixed(2)}ms`);
        console.log(`Error Rate: ${this.results.reliability.errorRate.toFixed(2)}%`);
        console.log(`System Throughput: ${this.results.reliability.throughput} operations/second`);
        
        if (this.results.reliability.errorRate > 10) {
            console.log('⚠️ High error rate detected - system may be under excessive stress');
        }
        
        if (this.results.performance.peakMemoryUsage > 500 * 1024 * 1024) {
            console.log('⚠️ High memory usage detected - monitor for potential memory leaks');
        }
        
        // Save detailed results
        const fs = require('fs');
        const resultsPath = `./test-results/stress-test-results-${Date.now()}.json`;
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Stress test results saved to: ${resultsPath}`);
    }
}

// Run the stress test suite
if (require.main === module) {
    const stressTestSuite = new StressTestSuite();
    stressTestSuite.runStressTests().catch(console.error);
}

module.exports = { StressTestSuite };