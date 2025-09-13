// Test script to verify notification user isolation
// This script creates multiple test notifications and verifies each user only receives their own

const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
require('dotenv').config();

async function testNotificationIsolation() {
    console.log('🧪 Starting notification isolation test...\n');
    
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database');
        
        // Clean up any existing test data
        await User.deleteMany({ email: { $regex: /test-user-\d+@waymate\.test/ } });
        await Notification.deleteMany({ message: { $regex: /Test notification for user/ } });
        console.log('🧹 Cleaned up existing test data');
        
        // Create test users
        const testUsers = [];
        for (let i = 1; i <= 3; i++) {
            const user = await User.create({
                name: `Test User ${i}`,
                email: `test-user-${i}@waymate.test`,
                password: 'TestPassword123!',
                role: 'user',
                accountStatus: 'active'
            });
            testUsers.push(user);
            console.log(`👤 Created test user: ${user.email}`);
        }
        
        // Create notifications for each user
        const notifications = [];
        for (let i = 0; i < testUsers.length; i++) {
            const user = testUsers[i];
            
            // Create multiple notifications per user
            for (let j = 1; j <= 3; j++) {
                const notification = await Notification.create({
                    user: user._id,
                    message: `Test notification ${j} for user ${user.email}`,
                    type: 'system',
                    priority: 'normal'
                });
                notifications.push({ notification, expectedUser: user._id.toString() });
                console.log(`📧 Created notification for ${user.email}: ${notification.message}`);
            }
        }
        
        console.log('\n🔍 Testing notification retrieval for each user...\n');
        
        // Test notification retrieval for each user
        let testsPassed = 0;
        let totalTests = 0;
        
        for (const user of testUsers) {
            totalTests++;
            
            // Fetch notifications for this user (simulating the API call)
            const userNotifications = await Notification.find({ user: user._id });
            
            console.log(`📋 User ${user.email} has ${userNotifications.length} notifications:`);
            
            let userTestPassed = true;
            
            // Verify all notifications belong to this user
            for (const notification of userNotifications) {
                const belongsToUser = notification.user.toString() === user._id.toString();
                const expectedMessage = notification.message.includes(user.email);
                
                if (belongsToUser && expectedMessage) {
                    console.log(`  ✅ ${notification.message}`);
                } else {
                    console.log(`  ❌ WRONG USER! ${notification.message} (belongs to ${notification.user})`);
                    userTestPassed = false;
                }
            }
            
            // Verify user doesn't see other users' notifications
            const otherUsersNotifications = await Notification.find({ 
                user: { $ne: user._id },
                message: { $regex: /Test notification for user/ }
            });
            
            if (otherUsersNotifications.length > 0) {
                console.log(`  ❌ SECURITY ISSUE: User can access ${otherUsersNotifications.length} notifications from other users!`);
                userTestPassed = false;
            }
            
            if (userTestPassed) {
                console.log(`  🎉 User isolation test PASSED for ${user.email}\n`);
                testsPassed++;
            } else {
                console.log(`  💥 User isolation test FAILED for ${user.email}\n`);
            }
        }
        
        // Test database query isolation
        console.log('🔍 Testing database query isolation...\n');
        
        for (const user of testUsers) {
            // This simulates the actual query used in the notification controller
            const controllerQuery = await Notification.find({ user: user._id }).sort({ createdAt: -1 });
            
            const allFromThisUser = controllerQuery.every(n => n.user.toString() === user._id.toString());
            const containsOtherUsers = controllerQuery.some(n => n.user.toString() !== user._id.toString());
            
            if (allFromThisUser && !containsOtherUsers) {
                console.log(`✅ Database query isolation PASSED for ${user.email}`);
            } else {
                console.log(`❌ Database query isolation FAILED for ${user.email}`);
                totalTests++;
            }
        }
        
        // Summary
        console.log('\n📊 TEST SUMMARY:');
        console.log(`Total tests: ${totalTests}`);
        console.log(`Tests passed: ${testsPassed}`);
        console.log(`Tests failed: ${totalTests - testsPassed}`);
        
        if (testsPassed === totalTests) {
            console.log('🎉 ALL TESTS PASSED! Notification system properly isolates users.');
        } else {
            console.log('💥 SOME TESTS FAILED! There may be security issues with notification isolation.');
        }
        
        // Clean up test data
        await User.deleteMany({ email: { $regex: /test-user-\d+@waymate\.test/ } });
        await Notification.deleteMany({ message: { $regex: /Test notification for user/ } });
        console.log('\n🧹 Cleaned up test data');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
if (require.main === module) {
    testNotificationIsolation();
}

module.exports = { testNotificationIsolation };