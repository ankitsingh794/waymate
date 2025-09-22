require('dotenv').config();
const sendEmailViaResend = require('../utils/sendEmailResend');

/**
 * Test script for Resend email integration
 * Run with: node test_resend.js
 */
async function testResendEmail() {
  console.log('🧪 Testing Resend Email Integration\n');
  
  // Check if required environment variables are set
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.SENDPULSE_FROM_EMAIL;
  
  if (!RESEND_API_KEY) {
    console.error('❌ Missing RESEND_API_KEY environment variable');
    console.error('\n📖 Setup Instructions:');
    console.error('1. Sign up at https://resend.com');
    console.error('2. Get your API key from the dashboard');
    console.error('3. Add RESEND_API_KEY=re_xxxxxx to your .env file');
    console.error('4. Add RESEND_FROM_EMAIL=noreply@yourdomain.com');
    console.error('\n💡 For quick testing, you can use: onboarding@resend.dev');
    return;
  }
  
  if (!FROM_EMAIL) {
    console.error('❌ Missing sender email configuration');
    console.error('Add RESEND_FROM_EMAIL=noreply@yourdomain.com to your .env file');
    console.error('Or use onboarding@resend.dev for testing');
    return;
  }
  
  console.log('📋 Configuration:');
  console.log(`   API Key: ${RESEND_API_KEY.substr(0, 8)}...`);
  console.log(`   From Email: ${FROM_EMAIL}`);
  console.log('');
  
  // Test email data
  const testEmail = {
    to: process.env.TEST_EMAIL || FROM_EMAIL, // Send to self for testing
    subject: 'Resend Test Email - WayMate',
    text: 'This is a test email to verify Resend integration.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ Resend Integration Test</h2>
        <p>Hello!</p>
        <p>This is a test email to verify that WayMate's Resend email integration is working correctly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Service: Resend API</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
          <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
          <li>Render Compatible: ✅ No SMTP ports used</li>
        </ul>
        <p>If you received this email, the integration is working! 🎉</p>
        <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #0066cc; margin: 0 0 10px 0;">🚀 Ready for Render Deployment</h3>
          <p style="margin: 0;">This email service will work perfectly on Render since it uses HTTPS API instead of SMTP ports.</p>
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated test email from WayMate application using Resend.
        </p>
      </div>
    `
  };
  
  try {
    console.log(`📧 Sending test email to: ${testEmail.to}`);
    console.log(`📝 Subject: ${testEmail.subject}\n`);
    
    const result = await sendEmailViaResend(testEmail);
    
    if (result.dev) {
      console.log('🛠️ Development Mode Active:');
      console.log('   - Email was logged, not actually sent');
      console.log('   - Set EMAIL_DEV_FALLBACK=false to send real emails');
      console.log('   - Check server logs for email content\n');
    }
    
    console.log('✅ Email sent successfully!');
    console.log('📋 Resend Response:', {
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
      dev: result.dev,
      note: result.note
    });
    
    if (!result.dev) {
      console.log('\n🎉 Success! Your Resend integration is working perfectly.');
      console.log('📧 Check your inbox for the test email.');
      console.log('🚀 Ready for Render deployment without SMTP restrictions!');
    }
    
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n💡 Troubleshooting:');
      console.error('1. Check your RESEND_API_KEY is correct');
      console.error('2. Ensure the API key starts with "re_"');
      console.error('3. Verify the API key is active in Resend dashboard');
    }
    
    if (error.message.includes('domain')) {
      console.error('\n💡 Domain Issues:');
      console.error('1. For testing, use: RESEND_FROM_EMAIL=onboarding@resend.dev');
      console.error('2. For production, add and verify your domain in Resend');
    }
  }
}

// Run the test
testResendEmail();