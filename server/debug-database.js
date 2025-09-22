const mongoose = require('mongoose');
const Trip = require('./models/Trip');
const User = require('./models/User');
const ConsentLog = require('./models/ConsentLog');

async function debugDatabaseState() {
    try {
        // Use Atlas connection string
        const mongoUri = 'mongodb+srv://ankitsinghrjt794:p8QRCji7eQNy0NWp@waymate.ii9ylky.mongodb.net/WayMate?retryWrites=true&w=majority';
        await mongoose.connect(mongoUri);
        console.log('📊 DATABASE STATE DEBUGGING (Atlas Cloud Database)');
        console.log('=' .repeat(50));
        
        // Check total users
        const totalUsers = await User.countDocuments();
        console.log(`👥 Total users in database: ${totalUsers}`);
        
        // Check consent status
        const passiveTrackingConsents = await ConsentLog.aggregate([
            { $match: { consentType: 'passive_tracking' } },
            { $sort: { userId: 1, createdAt: -1 } },
            { $group: { _id: '$userId', latestConsent: { $first: '$status' } } },
            { $group: { _id: '$latestConsent', count: { $sum: 1 } } }
        ]);
        
        console.log('\n🔐 Passive Tracking Consent Status:');
        passiveTrackingConsents.forEach(consent => {
            console.log(`  ${consent._id}: ${consent.count} users`);
        });
        
        // Check trips
        const totalTrips = await Trip.countDocuments();
        const passiveTrips = await Trip.countDocuments({ 
            source: { $in: ['passive_detection', 'passive_detection_v2_ml', 'passive_detection_v3_ml'] } 
        });
        const userCreatedTrips = await Trip.countDocuments({ source: 'user_created' });
        
        console.log(`\n🚗 Trip Statistics:`);
        console.log(`  Total trips: ${totalTrips}`);
        console.log(`  Passive tracking trips: ${passiveTrips}`);
        console.log(`  User created trips: ${userCreatedTrips}`);
        
        // Check trip statuses
        const tripStatuses = await Trip.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        console.log('\n📈 Trip Status Breakdown:');
        tripStatuses.forEach(status => {
            console.log(`  ${status._id}: ${status.count}`);
        });
        
        // Sample recent trips
        const recentTrips = await Trip.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('destination source status createdAt rawDataPoints.length');
            
        console.log('\n📋 Recent Trips (last 5):');
        if (recentTrips.length === 0) {
            console.log('  ⚠️  No trips found in database!');
        } else {
            recentTrips.forEach(trip => {
                console.log(`  - ${trip.destination} (${trip.source}) - ${trip.status} - ${trip.createdAt.toISOString().split('T')[0]} - ${trip.rawDataPoints?.length || 0} data points`);
            });
        }
        
        // Check for users with active consent but no trips
        const usersWithConsent = await ConsentLog.aggregate([
            { $match: { consentType: 'passive_tracking' } },
            { $sort: { userId: 1, createdAt: -1 } },
            { $group: { _id: '$userId', latestConsent: { $first: '$status' } } },
            { $match: { latestConsent: 'granted' } }
        ]);
        
        console.log(`\n🔍 Users with granted passive tracking consent: ${usersWithConsent.length}`);
        
        for (const userConsent of usersWithConsent.slice(0, 3)) { // Check first 3 users
            const userTrips = await Trip.countDocuments({ 
                'group.members.userId': userConsent._id,
                source: { $in: ['passive_detection', 'passive_detection_v2_ml', 'passive_detection_v3_ml'] }
            });
            const user = await User.findById(userConsent._id).select('email');
            console.log(`  ${user?.email || 'Unknown'}: ${userTrips} passive trips`);
        }
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Database debugging error:', error);
        process.exit(1);
    }
}

debugDatabaseState();