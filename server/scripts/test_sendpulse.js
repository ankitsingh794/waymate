require('dotenv').config();
const sendEmail = require('../utils/sendEmail');

/**
 * Test script for SendPulse email integration
 * Run with: node test_sendpulse.js
 */
async function testSendPulseEmail() {
  console.log('🧪 Testing SendPulse Email Integration\n');
  
  // Check if required environment variables are set
  const requiredVars = ['SENDPULSE_API_USER_ID', 'SENDPULSE_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file and add the SendPulse credentials.');
    console.error('Refer to .env.sendpulse.example for setup instructions.');
    return;
  }
  
  // Test email data
  const testEmail = {
    to: process.env.TEST_EMAIL || 'abc5fede@gmail.com', // Use the verified sender email for testing
    subject: 'SendPulse Test Email - WayMate',
    text: 'This is a test email to verify SendPulse integration.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ SendPulse Integration Test</h2>
        <p>Hello!</p>
        <p>This is a test email to verify that WayMate's SendPulse email integration is working correctly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Service: SendPulse SMTP API</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
          <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
        </ul>
        <p>If you received this email, the integration is working! 🎉</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated test email from WayMate application.
        </p>
      </div>
    `
  };
  
  try {
    console.log(`📧 Sending test email to: ${testEmail.to}`);
    console.log(`📝 Subject: ${testEmail.subject}\n`);
    
    const result = await sendEmail(testEmail);
    
    console.log('✅ Email sent successfully!');
    console.log('📋 Response:', {
      success: result.success,
      messageId: result.messageId || result.id,
      dev: result.dev,
      note: result.note
    });
    
    if (result.dev) {
      console.log('\n🛠️  Development Mode Active:');
      console.log('   - Email was logged, not actually sent');
      console.log('   - Check server logs for email content');
      console.log('   - To enable real sending, fix SendPulse SMTP and set SENDPULSE_DEV_FALLBACK=false');
    }
    
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('credentials')) {
      console.error('\n💡 Tip: Make sure you have set up your SendPulse API credentials correctly.');
      console.error('Check .env.sendpulse.example for setup instructions.');
    }
  }
}

// Run the test
testSendPulseEmail();