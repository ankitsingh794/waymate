require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Quick setup script for Resend email service
 * Adds necessary environment variables for Resend integration
 */

const envPath = path.join(__dirname, '.env');

console.log('🚀 Setting up Resend Email Service\n');

try {
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if Resend config already exists
  if (envContent.includes('RESEND_API_KEY')) {
    console.log('✅ Resend configuration already exists in .env file');
    
    // Show current values
    const apiKeyMatch = envContent.match(/RESEND_API_KEY=(.+)/);
    const fromEmailMatch = envContent.match(/RESEND_FROM_EMAIL=(.+)/);
    
    console.log('\n📋 Current Resend Configuration:');
    if (apiKeyMatch) {
      const apiKey = apiKeyMatch[1].trim();
      console.log(`   API Key: ${apiKey.substr(0, 8)}...`);
    } else {
      console.log('   API Key: Not set');
    }
    
    if (fromEmailMatch) {
      console.log(`   From Email: ${fromEmailMatch[1].trim()}`);
    } else {
      console.log('   From Email: Not set');
    }
  } else {
    // Add Resend configuration
    envContent += '\n# Resend Email Service Configuration (Primary - Render Compatible)\n';
    envContent += '# Get your API key from: https://resend.com/api-keys\n';
    envContent += 'RESEND_API_KEY=re_your_api_key_here\n';
    envContent += 'RESEND_FROM_EMAIL=onboarding@resend.dev\n';
    envContent += '\n# Email Development Fallback\n';
    envContent += 'EMAIL_DEV_FALLBACK=true\n';
    
    fs.writeFileSync(envPath, envContent);
    console.log('➕ Added Resend configuration to .env file');
  }
  
  // Check if dev fallback is enabled
  if (!envContent.includes('EMAIL_DEV_FALLBACK')) {
    envContent += '\nEMAIL_DEV_FALLBACK=true\n';
    fs.writeFileSync(envPath, envContent);
    console.log('➕ Added EMAIL_DEV_FALLBACK=true for development');
  }
  
  console.log('\n🎯 Setup Instructions:');
  console.log('1. 📧 Sign up at https://resend.com (free)');
  console.log('2. 🔑 Get your API key from the dashboard');
  console.log('3. ✏️  Update RESEND_API_KEY in .env file');
  console.log('4. 📨 Update RESEND_FROM_EMAIL (or use onboarding@resend.dev for testing)');
  console.log('5. 🧪 Test with: node test_resend.js');
  
  console.log('\n✅ Benefits:');
  console.log('   - ✅ Works with Render (no SMTP ports)');
  console.log('   - ✅ 3,000 free emails/month');
  console.log('   - ✅ High deliverability');
  console.log('   - ✅ Intelligent fallback to SendPulse');
  
  console.log('\n📅 Urgent: Render blocks SMTP ports on September 26th!');
  console.log('   Your app is now ready for this change. 🚀');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
}