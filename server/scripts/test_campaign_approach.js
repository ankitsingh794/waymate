require('dotenv').config();
const sendpulse = require('sendpulse-api');
const logger = require('../utils/logger');

/**
 * Alternative SendPulse implementation using Campaign API instead of SMTP
 * This might work better for accounts that don't have SMTP enabled
 */
const sendEmailViaCampaign = async ({ to, subject, text, html }) => {
  
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email parameters: to, subject, and body are required.');
    }

    const API_USER_ID = process.env.SENDPULSE_API_USER_ID;
    const API_SECRET = process.env.SENDPULSE_API_SECRET;
    const FROM_EMAIL = process.env.SENDPULSE_FROM_EMAIL;
    const FROM_NAME = process.env.APP_NAME || 'WayMate';

    if (!API_USER_ID || !API_SECRET) {
      throw new Error('SendPulse API credentials are not configured.');
    }

    return new Promise((resolve, reject) => {
      sendpulse.init(API_USER_ID, API_SECRET, '/tmp/', (token) => {
        if (!token) {
          return reject(new Error('Failed to authenticate with SendPulse API'));
        }

        console.log('✅ Authentication successful, checking available methods...');
        
        // First, let's try to create a simple address book and campaign
        const bookName = `temp_book_${Date.now()}`;
        
        sendpulse.createAddressBook(bookName, (bookResult) => {
          console.log('📖 Address book creation result:', bookResult);
          
          if (bookResult && bookResult.id) {
            // Add email to address book
            const emailData = [{
              email: to,
              variables: {
                name: 'User'
              }
            }];
            
            sendpulse.addEmails(bookResult.id, emailData, (addResult) => {
              console.log('👤 Add email result:', addResult);
              
              // Create and send campaign
              const campaignData = {
                list_id: bookResult.id,
                template_id: null, // We'll send HTML directly
                from: {
                  name: FROM_NAME,
                  email: FROM_EMAIL
                },
                subject: subject,
                body: html || text,
                send_date: 'now'
              };
              
              sendpulse.createCampaign(campaignData, (campaignResult) => {
                console.log('📧 Campaign result:', campaignResult);
                
                // Clean up - remove the temporary address book
                setTimeout(() => {
                  sendpulse.removeAddressBook(bookResult.id, () => {
                    console.log('🗑️ Temporary address book cleaned up');
                  });
                }, 5000);
                
                if (campaignResult && campaignResult.id) {
                  resolve({
                    success: true,
                    campaignId: campaignResult.id,
                    message: 'Email sent via campaign'
                  });
                } else {
                  reject(new Error(`Campaign creation failed: ${JSON.stringify(campaignResult)}`));
                }
              });
            });
          } else {
            reject(new Error(`Address book creation failed: ${JSON.stringify(bookResult)}`));
          }
        });
      });
    });

  } catch (error) {
    logger.error('❌ Error sending email via campaign:', {
      error: error.message,
      to,
      subject,
    });
    throw error;
  }
};

// Test the campaign-based approach
async function testCampaignApproach() {
  console.log('🧪 Testing SendPulse Campaign API approach\n');
  
  try {
    const result = await sendEmailViaCampaign({
      to: process.env.SENDPULSE_FROM_EMAIL, // Send to verified sender email
      subject: 'Test Email via Campaign API',
      html: '<h1>Hello from WayMate!</h1><p>This email was sent using SendPulse Campaign API instead of SMTP.</p>'
    });
    
    console.log('✅ Campaign approach successful:', result);
    
  } catch (error) {
    console.error('❌ Campaign approach failed:', error.message);
  }
}

testCampaignApproach();