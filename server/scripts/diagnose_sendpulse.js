require('dotenv').config();
const sendpulse = require('sendpulse-api');

/**
 * Diagnostic script to check SendPulse account status and sender verification
 */
async function diagnoseSendPulse() {
  console.log('🔍 SendPulse Account Diagnostics\n');
  
  const API_USER_ID = process.env.SENDPULSE_API_USER_ID;
  const API_SECRET = process.env.SENDPULSE_API_SECRET;
  const FROM_EMAIL = process.env.SENDPULSE_FROM_EMAIL;
  
  console.log('📋 Configuration:');
  console.log(`   API User ID: ${API_USER_ID ? `${API_USER_ID.substr(0, 8)}...` : 'MISSING'}`);
  console.log(`   API Secret: ${API_SECRET ? `${API_SECRET.substr(0, 8)}...` : 'MISSING'}`);
  console.log(`   From Email: ${FROM_EMAIL || 'MISSING'}`);
  console.log('');
  
  return new Promise((resolve, reject) => {
    sendpulse.init(API_USER_ID, API_SECRET, '/tmp/', (token) => {
      if (!token) {
        console.error('❌ Authentication failed!');
        console.error('   - Check your API credentials in SendPulse dashboard');
        console.error('   - Make sure REST API is enabled');
        return reject(new Error('Authentication failed'));
      }
      
      console.log('✅ Authentication successful!');
      console.log('');
      
      // Check account balance
      sendpulse.getBalance((balanceData) => {
        console.log('💰 Account Balance:');
        if (balanceData && typeof balanceData === 'object') {
          console.log('   Balance info:', balanceData);
        } else {
          console.log('   Unable to retrieve balance or no balance data');
        }
        console.log('');
        
        // List sender emails
        sendpulse.smtpListEmails((emailsData) => {
          console.log('📧 Sender Emails:');
          if (emailsData && Array.isArray(emailsData)) {
            emailsData.forEach((email, index) => {
              const status = email.status === 'active' ? '✅' : '❌';
              console.log(`   ${index + 1}. ${status} ${email.email} (${email.status})`);
            });
          } else {
            console.log('   Sender emails response:', emailsData);
            if (!emailsData || emailsData.length === 0) {
              console.log('   ⚠️  You need to add and verify sender emails in SendPulse dashboard');
            }
          }
          console.log('');
          
          // Test with a simple call to check SMTP functionality
          console.log('🧪 Testing SMTP capability...');
          
          const testData = {
            subject: 'Test Subject',
            html: '<h1>Test</h1>',
            from: {
              name: 'WayMate Test',
              email: FROM_EMAIL
            },
            to: [
              {
                email: FROM_EMAIL // Send to self for testing
              }
            ]
          };
          
          sendpulse.smtpSendMail((data) => {
            console.log('📨 SMTP Test Result:', data);
            
            if (data && data.result === true) {
              console.log('✅ SMTP functionality is working!');
            } else if (data && data.message) {
              console.log(`❌ SMTP test failed: ${data.message}`);
              
              if (data.message.includes('Unauthorized')) {
                console.log('');
                console.log('🔧 Troubleshooting Tips:');
                console.log('   1. Verify sender email in SendPulse dashboard');
                console.log('   2. Check if SMTP service is enabled in your plan');
                console.log('   3. Ensure account has sufficient balance');
                console.log('   4. Check if account is suspended');
              }
            }
            
            resolve();
          }, testData);
        });
      });
    });
  });
}

diagnoseSendPulse().catch(console.error);