const mongoose = require('mongoose');
const Trip = require('./models/Trip');
const User = require('./models/User');
const ConsentLog = require('./models/ConsentLog');

async function debugPassiveTrackingIssues() {
    try {
        // Use Atlas connection string
        const mongoUri = 'mongodb+srv://ankitsinghrjt794:p8QRCji7eQNy0NWp@waymate.ii9ylky.mongodb.net/WayMate?retryWrites=true&w=majority';
        await mongoose.connect(mongoUri);
        console.log('🔍 PASSIVE TRACKING ISSUE DEBUGGING');
        console.log('=' .repeat(50));
        
        // Find the user with consent
        const userWithConsent = await ConsentLog.findOne({ 
            consentType: 'passive_tracking', 
            status: 'granted' 
        }).populate('userId');
        
        if (userWithConsent) {
            console.log(`👤 User with consent: ${userWithConsent.userId.email}`);
            console.log(`📅 Consent granted on: ${userWithConsent.createdAt}`);
            
            // Check all consent types for this user
            const allConsents = await ConsentLog.find({ 
                userId: userWithConsent.userId._id 
            }).sort({ createdAt: -1 });
            
            console.log('\n🔐 All consent records for this user:');
            allConsents.forEach(consent => {
                console.log(`  ${consent.consentType}: ${consent.status} (${consent.createdAt.toISOString().split('T')[0]})`);
            });
            
            // Check for any trips from this user
            const userTrips = await Trip.find({ 
                'group.members.userId': userWithConsent.userId._id 
            }).sort({ createdAt: -1 });
            
            console.log(`\n🚗 All trips from this user: ${userTrips.length}`);
            userTrips.forEach(trip => {
                console.log(`  - ${trip.destination} (${trip.source}) - ${trip.status} - ${trip.createdAt.toISOString().split('T')[0]}`);
            });
        }
        
        // Check for any trips with rawDataPoints (indicating attempted passive tracking)
        const tripsWithData = await Trip.find({ 
            $or: [
                { 'rawDataPoints.0': { $exists: true } },
                { 'segments.0': { $exists: true } }
            ]
        });
        
        console.log(`\n📊 Trips with sensor data: ${tripsWithData.length}`);
        
        // Check for any incomplete/in-progress trips that might indicate tracking attempts
        const inProgressTrips = await Trip.find({ 
            status: { $in: ['in_progress', 'unconfirmed', 'pending_confirmation'] }
        });
        
        console.log(`\n⏳ In-progress/pending trips: ${inProgressTrips.length}`);
        
        // Check if there are any error logs or failed trip attempts
        const suspiciousTrips = await Trip.find({
            $or: [
                { destination: { $regex: /trip on/i } }, // Auto-generated destinations
                { source: { $in: ['passive_detection', 'passive_detection_v2_ml', 'passive_detection_v3_ml'] } }
            ]
        });
        
        console.log(`\n🔍 Trips that look like passive tracking attempts: ${suspiciousTrips.length}`);
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Debugging error:', error);
        process.exit(1);
    }
}

debugPassiveTrackingIssues();