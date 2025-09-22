require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Quick fix script to enable email development fallback mode
 * This allows the app to work in development while SendPulse SMTP issues are resolved
 */

const envPath = path.join(__dirname, '.env');

try {
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if SENDPULSE_DEV_FALLBACK already exists
  if (envContent.includes('SENDPULSE_DEV_FALLBACK')) {
    console.log('✅ SENDPULSE_DEV_FALLBACK is already configured in .env');
    
    // Check current value
    const match = envContent.match(/SENDPULSE_DEV_FALLBACK=(.+)/);
    if (match) {
      const currentValue = match[1].trim();
      console.log(`   Current value: ${currentValue}`);
      
      if (currentValue !== 'true') {
        // Update to true
        envContent = envContent.replace(/SENDPULSE_DEV_FALLBACK=.+/, 'SENDPULSE_DEV_FALLBACK=true');
        fs.writeFileSync(envPath, envContent);
        console.log('🔄 Updated SENDPULSE_DEV_FALLBACK to true');
      }
    }
  } else {
    // Add the fallback setting
    envContent += '\n# Email Development Fallback (while SendPulse SMTP is being configured)\n';
    envContent += 'SENDPULSE_DEV_FALLBACK=true\n';
    
    fs.writeFileSync(envPath, envContent);
    console.log('➕ Added SENDPULSE_DEV_FALLBACK=true to .env file');
  }
  
  console.log('\n🎯 Development Mode Enabled:');
  console.log('   - Emails will be logged instead of sent');
  console.log('   - Your app will work normally for testing');
  console.log('   - Check server logs to see email content');
  console.log('\n📧 To test email functionality:');
  console.log('   node test_sendpulse.js');
  console.log('\n🔧 To fix SendPulse SMTP:');
  console.log('   - Read SENDPULSE_TROUBLESHOOTING.md');
  console.log('   - Set SENDPULSE_DEV_FALLBACK=false when SMTP is working');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
}