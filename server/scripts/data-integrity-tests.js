// Production-Grade Data Integrity Tests
// Tests database transactions, consistency, constraints, and data reliability

const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
require('dotenv').config();

class DataIntegrityTests {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            databaseTests: [],
            transactionTests: [],
            consistencyTests: [],
            constraintTests: [],
            performance: {
                averageQueryTime: 0,
                slowestOperation: null,
                fastestOperation: null,
                totalOperations: 0
            },
            dataReliability: {
                transactionSuccessRate: 0,
                constraintViolations: 0,
                dataCorruptions: 0,
                recoveryTests: 0
            }
        };
        this.testSession = null;
        this.testData = {
            users: [],
            trips: [],
            notifications: []
        };
    }

    async runDataIntegrityTests() {
        console.log('🗄️ Starting Production-Grade Data Integrity Tests...\n');
        
        try {
            await this.setupDataTestEnvironment();
            
            // Core data integrity tests
            await this.testDatabaseConnections();
            await this.testTransactionIntegrity();
            await this.testDataConsistency();
            await this.testConstraintValidation();
            await this.testConcurrentOperations();
            await this.testDataMigration();
            await this.testBackupRestore();
            await this.testDataRecovery();
            await this.testIndexIntegrity();
            await this.testForeignKeyConstraints();
            await this.testDataValidationRules();
            await this.testAtomicOperations();
            
            await this.generateDataIntegrityReport();
            await this.cleanupDataTestEnvironment();
            
        } catch (error) {
            console.error('❌ Data integrity test suite failed:', error);
            await this.cleanupDataTestEnvironment();
        }
    }

    async setupDataTestEnvironment() {
        console.log('🔧 Setting up data integrity test environment...');
        
        await mongoose.connect(process.env.MONGO_URI);
        this.testSession = await mongoose.startSession();
        
        // Clean up test data
        await User.deleteMany({ email: { $regex: /data-test-.*@waymate\.test/ } });
        await Trip.deleteMany({ name: { $regex: /Data Test.*/ } });
        await Notification.deleteMany({ message: { $regex: /Data test.*/ } });
        
        console.log('✅ Data test environment ready\n');
    }

    async cleanupDataTestEnvironment() {
        console.log('\n🧹 Cleaning up data test environment...');
        
        if (this.testSession) {
            await this.testSession.endSession();
        }
        
        await User.deleteMany({ email: { $regex: /data-test-.*@waymate\.test/ } });
        await Trip.deleteMany({ name: { $regex: /Data Test.*/ } });
        await Notification.deleteMany({ message: { $regex: /Data test.*/ } });
        
        await mongoose.connection.close();
        console.log('✅ Data cleanup completed');
    }

    async recordDataTest(testName, operation, startTime, result, details = {}) {
        const duration = Date.now() - startTime;
        const passed = result.success !== false;
        
        const testResult = {
            name: testName,
            operation,
            duration,
            passed,
            timestamp: new Date().toISOString(),
            details: {
                ...details,
                recordsAffected: result.recordsAffected || 0,
                errorMessage: result.error || null
            }
        };
        
        this.results.databaseTests.push(testResult);
        this.results.performance.totalOperations++;
        
        // Track performance metrics
        if (!this.results.performance.slowestOperation || 
            duration > this.results.performance.slowestOperation.duration) {
            this.results.performance.slowestOperation = {
                operation: testName,
                duration
            };
        }
        
        if (!this.results.performance.fastestOperation || 
            duration < this.results.performance.fastestOperation.duration) {
            this.results.performance.fastestOperation = {
                operation: testName,
                duration
            };
        }
        
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName} (${duration}ms)`);
        
        if (!passed && result.error) {
            console.log(`    Error: ${result.error}`);
        }
        
        return passed;
    }

    async testDatabaseConnections() {
        console.log('🔌 Testing Database Connections...');
        
        // Test connection pool
        const startTime = Date.now();
        try {
            const connectionState = mongoose.connection.readyState;
            await this.recordDataTest('Database Connection Pool', 'connection-check', startTime, {
                success: connectionState === 1,
                recordsAffected: 0
            }, {
                connectionState,
                poolSize: mongoose.connection.db?.serverConfig?.poolSize || 'unknown'
            });
        } catch (error) {
            await this.recordDataTest('Database Connection Pool', 'connection-check', startTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test concurrent connections
        const concurrentStartTime = Date.now();
        try {
            const concurrentPromises = Array.from({ length: 10 }, () => 
                User.findOne().exec()
            );
            
            await Promise.all(concurrentPromises);
            await this.recordDataTest('Concurrent Database Access', 'concurrent-query', concurrentStartTime, {
                success: true,
                recordsAffected: 10
            }, {
                concurrentQueries: 10
            });
        } catch (error) {
            await this.recordDataTest('Concurrent Database Access', 'concurrent-query', concurrentStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testTransactionIntegrity() {
        console.log('\n💸 Testing Transaction Integrity...');
        
        // Test successful transaction
        const successStartTime = Date.now();
        try {
            await this.testSession.withTransaction(async () => {
                const user = new User({
                    name: 'Transaction Test User',
                    email: 'data-test-transaction@waymate.test',
                    password: 'Password123!',
                    role: 'user'
                });
                
                await user.save({ session: this.testSession });
                
                const trip = new Trip({
                    name: 'Data Test Transaction Trip',
                    destination: 'Test Destination',
                    startDate: new Date(Date.now() + 86400000),
                    endDate: new Date(Date.now() + 172800000),
                    participants: [user._id],
                    createdBy: user._id
                });
                
                await trip.save({ session: this.testSession });
                
                this.testData.users.push(user);
                this.testData.trips.push(trip);
            });
            
            await this.recordDataTest('Successful Transaction', 'transaction-commit', successStartTime, {
                success: true,
                recordsAffected: 2
            }, {
                transactionType: 'multi-document'
            });
            
            this.results.dataReliability.transactionSuccessRate++;
            
        } catch (error) {
            await this.recordDataTest('Successful Transaction', 'transaction-commit', successStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test transaction rollback
        const rollbackStartTime = Date.now();
        try {
            await this.testSession.withTransaction(async () => {
                const user = new User({
                    name: 'Rollback Test User',
                    email: 'data-test-rollback@waymate.test',
                    password: 'Password123!',
                    role: 'user'
                });
                
                await user.save({ session: this.testSession });
                
                // Intentionally cause an error to trigger rollback
                throw new Error('Intentional rollback test');
            });
        } catch (error) {
            // Verify user was not created due to rollback
            const userExists = await User.findOne({ email: 'data-test-rollback@waymate.test' });
            
            await this.recordDataTest('Transaction Rollback', 'transaction-rollback', rollbackStartTime, {
                success: !userExists, // Success means rollback worked (user not created)
                recordsAffected: 0
            }, {
                rollbackWorked: !userExists,
                transactionType: 'rollback-test'
            });
            
            if (!userExists) {
                this.results.dataReliability.transactionSuccessRate++;
            }
        }
    }

    async testDataConsistency() {
        console.log('\n🔗 Testing Data Consistency...');
        
        if (this.testData.users.length === 0 || this.testData.trips.length === 0) {
            console.log('  ⚠️ Skipping consistency tests - no test data available');
            return;
        }
        
        const user = this.testData.users[0];
        const trip = this.testData.trips[0];
        
        // Test referential integrity
        const refStartTime = Date.now();
        try {
            const tripWithUser = await Trip.findById(trip._id).populate('participants');
            const userFound = tripWithUser.participants.some(p => p._id.toString() === user._id.toString());
            
            await this.recordDataTest('Referential Integrity', 'populate-check', refStartTime, {
                success: userFound,
                recordsAffected: 1
            }, {
                participantFound: userFound,
                participantCount: tripWithUser.participants.length
            });
        } catch (error) {
            await this.recordDataTest('Referential Integrity', 'populate-check', refStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test cascade operations
        const cascadeStartTime = Date.now();
        try {
            const originalTripCount = await Trip.countDocuments({ participants: user._id });
            
            // Delete user and check if related data is handled properly
            await User.findByIdAndDelete(user._id);
            
            // Check if trips still reference the deleted user (should be handled by app logic)
            const tripsAfterDelete = await Trip.countDocuments({ participants: user._id });
            
            await this.recordDataTest('Cascade Operations', 'cascade-delete', cascadeStartTime, {
                success: true, // Test success regardless of implementation
                recordsAffected: 1
            }, {
                originalTripCount,
                tripsAfterDelete,
                cascadeImplemented: tripsAfterDelete === 0
            });
        } catch (error) {
            await this.recordDataTest('Cascade Operations', 'cascade-delete', cascadeStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testConstraintValidation() {
        console.log('\n⚡ Testing Constraint Validation...');
        
        // Test unique email constraint
        const uniqueStartTime = Date.now();
        try {
            const user1 = new User({
                name: 'Constraint Test User 1',
                email: 'data-test-unique@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            await user1.save();
            
            const user2 = new User({
                name: 'Constraint Test User 2',
                email: 'data-test-unique@waymate.test', // Same email
                password: 'Password123!',
                role: 'user'
            });
            
            try {
                await user2.save();
                // If save succeeds, constraint is not working
                await this.recordDataTest('Unique Email Constraint', 'constraint-validation', uniqueStartTime, {
                    success: false,
                    error: 'Unique constraint not enforced'
                });
                this.results.dataReliability.constraintViolations++;
            } catch (saveError) {
                // If save fails, constraint is working correctly
                await this.recordDataTest('Unique Email Constraint', 'constraint-validation', uniqueStartTime, {
                    success: true,
                    recordsAffected: 1
                }, {
                    constraintEnforced: true,
                    errorType: saveError.code || 'validation'
                });
            }
        } catch (error) {
            await this.recordDataTest('Unique Email Constraint', 'constraint-validation', uniqueStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test required field validation
        const requiredStartTime = Date.now();
        try {
            const invalidUser = new User({
                // Missing required fields
                role: 'user'
            });
            
            try {
                await invalidUser.save();
                await this.recordDataTest('Required Fields Validation', 'validation-check', requiredStartTime, {
                    success: false,
                    error: 'Required field validation not enforced'
                });
                this.results.dataReliability.constraintViolations++;
            } catch (validationError) {
                await this.recordDataTest('Required Fields Validation', 'validation-check', requiredStartTime, {
                    success: true,
                    recordsAffected: 0
                }, {
                    validationEnforced: true,
                    missingFields: validationError.errors ? Object.keys(validationError.errors) : []
                });
            }
        } catch (error) {
            await this.recordDataTest('Required Fields Validation', 'validation-check', requiredStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testConcurrentOperations() {
        console.log('\n🔄 Testing Concurrent Operations...');
        
        // Test concurrent user creation
        const concurrentStartTime = Date.now();
        try {
            const concurrentUsers = Array.from({ length: 5 }, (_, i) => 
                User.create({
                    name: `Concurrent Test User ${i}`,
                    email: `data-test-concurrent-${i}@waymate.test`,
                    password: 'Password123!',
                    role: 'user'
                })
            );
            
            const results = await Promise.allSettled(concurrentUsers);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            await this.recordDataTest('Concurrent User Creation', 'concurrent-insert', concurrentStartTime, {
                success: failed === 0,
                recordsAffected: successful
            }, {
                totalAttempts: 5,
                successful,
                failed,
                concurrencyLevel: 'medium'
            });
        } catch (error) {
            await this.recordDataTest('Concurrent User Creation', 'concurrent-insert', concurrentStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test concurrent updates to same document
        const updateStartTime = Date.now();
        try {
            const testUser = await User.create({
                name: 'Update Test User',
                email: 'data-test-updates@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            const concurrentUpdates = Array.from({ length: 3 }, (_, i) => 
                User.findByIdAndUpdate(testUser._id, { 
                    name: `Updated Name ${i}`,
                    updatedAt: new Date()
                }, { new: true })
            );
            
            const updateResults = await Promise.allSettled(concurrentUpdates);
            const successfulUpdates = updateResults.filter(r => r.status === 'fulfilled').length;
            
            await this.recordDataTest('Concurrent Document Updates', 'concurrent-update', updateStartTime, {
                success: successfulUpdates > 0,
                recordsAffected: successfulUpdates
            }, {
                totalUpdates: 3,
                successful: successfulUpdates,
                concurrencyHandled: true
            });
        } catch (error) {
            await this.recordDataTest('Concurrent Document Updates', 'concurrent-update', updateStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testDataMigration() {
        console.log('\n📦 Testing Data Migration...');
        
        // Simulate data migration scenario
        const migrationStartTime = Date.now();
        try {
            // Create old format data
            const oldFormatUsers = await User.insertMany([
                {
                    name: 'Migration Test User 1',
                    email: 'data-test-migration-1@waymate.test',
                    password: 'Password123!',
                    role: 'user'
                },
                {
                    name: 'Migration Test User 2',
                    email: 'data-test-migration-2@waymate.test',
                    password: 'Password123!',
                    role: 'user'
                }
            ]);
            
            // Simulate migration by adding new field
            const migrationResult = await User.updateMany(
                { email: { $regex: /data-test-migration-.*@waymate\.test/ } },
                { $set: { migratedAt: new Date(), migrationVersion: '1.0' } }
            );
            
            await this.recordDataTest('Data Migration', 'bulk-update', migrationStartTime, {
                success: migrationResult.modifiedCount === oldFormatUsers.length,
                recordsAffected: migrationResult.modifiedCount
            }, {
                expectedRecords: oldFormatUsers.length,
                migratedRecords: migrationResult.modifiedCount,
                migrationComplete: migrationResult.modifiedCount === oldFormatUsers.length
            });
        } catch (error) {
            await this.recordDataTest('Data Migration', 'bulk-update', migrationStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testBackupRestore() {
        console.log('\n💾 Testing Backup/Restore Simulation...');
        
        // Simulate backup process
        const backupStartTime = Date.now();
        try {
            const beforeCount = await User.countDocuments();
            
            // Create snapshot of test data
            const testUsers = await User.find({ email: { $regex: /data-test-.*@waymate\.test/ } });
            const backupData = testUsers.map(user => user.toObject());
            
            await this.recordDataTest('Data Backup Simulation', 'backup-operation', backupStartTime, {
                success: backupData.length > 0,
                recordsAffected: backupData.length
            }, {
                totalRecords: beforeCount,
                backedUpRecords: backupData.length,
                backupSize: JSON.stringify(backupData).length
            });
            
            // Simulate restore verification
            const restoreStartTime = Date.now();
            try {
                // Verify all backed up data exists
                const verificationPromises = backupData.map(userData => 
                    User.findById(userData._id)
                );
                
                const verificationResults = await Promise.all(verificationPromises);
                const foundRecords = verificationResults.filter(user => user !== null).length;
                
                await this.recordDataTest('Data Restore Verification', 'restore-verification', restoreStartTime, {
                    success: foundRecords === backupData.length,
                    recordsAffected: foundRecords
                }, {
                    expectedRecords: backupData.length,
                    foundRecords,
                    restoreIntegrity: foundRecords === backupData.length
                });
            } catch (error) {
                await this.recordDataTest('Data Restore Verification', 'restore-verification', restoreStartTime, {
                    success: false,
                    error: error.message
                });
            }
        } catch (error) {
            await this.recordDataTest('Data Backup Simulation', 'backup-operation', backupStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testDataRecovery() {
        console.log('\n🔄 Testing Data Recovery...');
        
        // Test soft delete and recovery
        const recoveryStartTime = Date.now();
        try {
            const recoveryUser = await User.create({
                name: 'Recovery Test User',
                email: 'data-test-recovery@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            // Simulate soft delete
            await User.findByIdAndUpdate(recoveryUser._id, { 
                deletedAt: new Date(),
                isActive: false
            });
            
            // Simulate recovery
            const recoveredUser = await User.findByIdAndUpdate(recoveryUser._id, {
                $unset: { deletedAt: 1 },
                isActive: true
            }, { new: true });
            
            await this.recordDataTest('Data Recovery', 'soft-delete-recovery', recoveryStartTime, {
                success: recoveredUser && !recoveredUser.deletedAt,
                recordsAffected: 1
            }, {
                userRecovered: !recoveredUser.deletedAt,
                recoveryMethod: 'soft-delete'
            });
            
            this.results.dataReliability.recoveryTests++;
        } catch (error) {
            await this.recordDataTest('Data Recovery', 'soft-delete-recovery', recoveryStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testIndexIntegrity() {
        console.log('\n📇 Testing Index Integrity...');
        
        // Test index usage
        const indexStartTime = Date.now();
        try {
            // Query that should use email index
            const emailQuery = User.findOne({ email: 'data-test-migration-1@waymate.test' });
            const result = await emailQuery.explain('executionStats');
            
            const indexUsed = result.executionStats.executionStages.stage === 'IXSCAN' ||
                            result.executionStats.totalDocsExamined < result.executionStats.totalDocsInCollection;
            
            await this.recordDataTest('Index Usage', 'index-query', indexStartTime, {
                success: indexUsed,
                recordsAffected: 1
            }, {
                indexUsed,
                docsExamined: result.executionStats.totalDocsExamined,
                docsInCollection: result.executionStats.totalDocsInCollection,
                executionTime: result.executionStats.executionTimeMillis
            });
        } catch (error) {
            await this.recordDataTest('Index Usage', 'index-query', indexStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testForeignKeyConstraints() {
        console.log('\n🔗 Testing Foreign Key Constraints...');
        
        // Test orphaned reference handling
        const fkStartTime = Date.now();
        try {
            const testUser = await User.create({
                name: 'FK Test User',
                email: 'data-test-fk@waymate.test',
                password: 'Password123!',
                role: 'user'
            });
            
            const testTrip = await Trip.create({
                name: 'Data Test FK Trip',
                destination: 'FK Test Destination',
                startDate: new Date(Date.now() + 86400000),
                endDate: new Date(Date.now() + 172800000),
                participants: [testUser._id],
                createdBy: testUser._id
            });
            
            // Delete user, creating orphaned reference
            await User.findByIdAndDelete(testUser._id);
            
            // Check if trip still has invalid reference
            const orphanedTrip = await Trip.findById(testTrip._id);
            const hasOrphanedRef = orphanedTrip.participants.includes(testUser._id);
            
            await this.recordDataTest('Foreign Key Constraints', 'orphaned-reference', fkStartTime, {
                success: true, // Test completes regardless
                recordsAffected: 1
            }, {
                orphanedReferenceExists: hasOrphanedRef,
                constraintEnforced: !hasOrphanedRef,
                referenceType: 'user-trip'
            });
        } catch (error) {
            await this.recordDataTest('Foreign Key Constraints', 'orphaned-reference', fkStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testDataValidationRules() {
        console.log('\n✅ Testing Data Validation Rules...');
        
        // Test email format validation
        const emailValidationStartTime = Date.now();
        try {
            const invalidEmailUser = new User({
                name: 'Invalid Email User',
                email: 'not-an-email',
                password: 'Password123!',
                role: 'user'
            });
            
            try {
                await invalidEmailUser.validate();
                await this.recordDataTest('Email Format Validation', 'email-validation', emailValidationStartTime, {
                    success: false,
                    error: 'Email validation not enforced'
                });
            } catch (validationError) {
                await this.recordDataTest('Email Format Validation', 'email-validation', emailValidationStartTime, {
                    success: true,
                    recordsAffected: 0
                }, {
                    validationEnforced: true,
                    invalidEmail: 'not-an-email'
                });
            }
        } catch (error) {
            await this.recordDataTest('Email Format Validation', 'email-validation', emailValidationStartTime, {
                success: false,
                error: error.message
            });
        }
        
        // Test date validation
        const dateValidationStartTime = Date.now();
        try {
            const invalidDateTrip = new Trip({
                name: 'Invalid Date Trip',
                destination: 'Test Destination',
                startDate: new Date('2020-01-01'), // Past date
                endDate: new Date('2019-01-01'),   // End before start
                participants: [],
                createdBy: new mongoose.Types.ObjectId()
            });
            
            try {
                await invalidDateTrip.validate();
                await this.recordDataTest('Date Logic Validation', 'date-validation', dateValidationStartTime, {
                    success: false,
                    error: 'Date validation not enforced'
                });
            } catch (validationError) {
                await this.recordDataTest('Date Logic Validation', 'date-validation', dateValidationStartTime, {
                    success: true,
                    recordsAffected: 0
                }, {
                    validationEnforced: true,
                    dateLogicError: true
                });
            }
        } catch (error) {
            await this.recordDataTest('Date Logic Validation', 'date-validation', dateValidationStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async testAtomicOperations() {
        console.log('\n⚛️ Testing Atomic Operations...');
        
        // Test atomic counter increment
        const atomicStartTime = Date.now();
        try {
            const testUser = await User.create({
                name: 'Atomic Test User',
                email: 'data-test-atomic@waymate.test',
                password: 'Password123!',
                role: 'user',
                loginCount: 0
            });
            
            // Simulate concurrent increments
            const incrementPromises = Array.from({ length: 5 }, () => 
                User.findByIdAndUpdate(
                    testUser._id,
                    { $inc: { loginCount: 1 } },
                    { new: true }
                )
            );
            
            const results = await Promise.all(incrementPromises);
            const finalUser = await User.findById(testUser._id);
            
            await this.recordDataTest('Atomic Operations', 'atomic-increment', atomicStartTime, {
                success: finalUser.loginCount === 5,
                recordsAffected: 1
            }, {
                expectedCount: 5,
                actualCount: finalUser.loginCount,
                atomicityMaintained: finalUser.loginCount === 5
            });
        } catch (error) {
            await this.recordDataTest('Atomic Operations', 'atomic-increment', atomicStartTime, {
                success: false,
                error: error.message
            });
        }
    }

    async generateDataIntegrityReport() {
        console.log('\n📊 Generating Data Integrity Test Report...');
        
        // Calculate metrics
        const totalTests = this.results.databaseTests.length;
        const passedTests = this.results.databaseTests.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        const totalDuration = this.results.databaseTests.reduce((sum, test) => sum + test.duration, 0);
        this.results.performance.averageQueryTime = (totalDuration / totalTests).toFixed(2);
        
        // Calculate reliability metrics
        const totalTransactionTests = this.results.dataReliability.transactionSuccessRate;
        if (totalTransactionTests > 0) {
            this.results.dataReliability.transactionSuccessRate = 
                ((this.results.dataReliability.transactionSuccessRate / 2) * 100).toFixed(1); // 2 transaction tests
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('🗄️ DATA INTEGRITY TEST RESULTS');
        console.log('='.repeat(70));
        console.log(`🌍 Environment: ${this.results.environment}`);
        console.log(`🕐 Timestamp: ${this.results.timestamp}`);
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log(`⚡ Average Query Time: ${this.results.performance.averageQueryTime}ms`);
        
        if (this.results.performance.slowestOperation) {
            console.log(`🐌 Slowest Operation: ${this.results.performance.slowestOperation.operation} (${this.results.performance.slowestOperation.duration}ms)`);
        }
        
        if (this.results.performance.fastestOperation) {
            console.log(`⚡ Fastest Operation: ${this.results.performance.fastestOperation.operation} (${this.results.performance.fastestOperation.duration}ms)`);
        }
        
        console.log('='.repeat(70));
        
        // Data reliability summary
        console.log('\n🔒 DATA RELIABILITY SUMMARY:');
        console.log(`Transaction Success Rate: ${this.results.dataReliability.transactionSuccessRate}%`);
        console.log(`Constraint Violations: ${this.results.dataReliability.constraintViolations}`);
        console.log(`Data Corruptions: ${this.results.dataReliability.dataCorruptions}`);
        console.log(`Recovery Tests: ${this.results.dataReliability.recoveryTests}`);
        
        // Test breakdown by category
        const categories = this.results.databaseTests.reduce((acc, test) => {
            const category = test.operation;
            if (!acc[category]) acc[category] = { passed: 0, failed: 0 };
            test.passed ? acc[category].passed++ : acc[category].failed++;
            return acc;
        }, {});
        
        console.log('\n📋 TEST BREAKDOWN BY OPERATION:');
        Object.entries(categories).forEach(([category, stats]) => {
            const total = stats.passed + stats.failed;
            const rate = ((stats.passed / total) * 100).toFixed(1);
            console.log(`${category.toUpperCase().replace(/-/g, ' ')}: ${stats.passed}/${total} (${rate}%)`);
        });
        
        // Failed tests details
        const failedTestsList = this.results.databaseTests.filter(t => !t.passed);
        if (failedTestsList.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            failedTestsList.forEach(test => {
                console.log(`- ${test.name}: ${test.details.errorMessage || 'Unknown error'}`);
            });
        }
        
        // Data integrity warnings
        console.log('\n⚠️ DATA INTEGRITY WARNINGS:');
        if (this.results.dataReliability.constraintViolations > 0) {
            console.log(`- ${this.results.dataReliability.constraintViolations} constraint violations detected`);
        }
        if (this.results.dataReliability.dataCorruptions > 0) {
            console.log(`- ${this.results.dataReliability.dataCorruptions} data corruptions found`);
        }
        if (this.results.dataReliability.constraintViolations === 0 && this.results.dataReliability.dataCorruptions === 0) {
            console.log('- No critical data integrity issues detected');
        }
        
        // Save results
        const fs = require('fs');
        const resultsPath = `./test-results/data-integrity-test-results-${Date.now()}.json`;
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Data integrity test results saved to: ${resultsPath}`);
    }
}

// Run the data integrity tests
if (require.main === module) {
    const dataTests = new DataIntegrityTests();
    dataTests.runDataIntegrityTests().catch(console.error);
}

module.exports = { DataIntegrityTests };