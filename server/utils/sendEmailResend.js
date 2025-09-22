const { Resend } = require('resend');
const logger = require('./logger');

/**
 * Sends an email using Resend API - a reliable, developer-friendly email service
 * Perfect for Render deployments as it doesn't use SMTP ports
 * @param {object} options - Email options.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text body.
 * @param {string} [options.html] - HTML body (optional).
 * @returns {Promise<object>} Resend response object.
 */
const sendEmailViaResend = async ({ to, subject, text, html }) => {
  
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email parameters: to, subject, and body are required.');
    }

    // Development fallback: Log emails instead of sending when in dev mode
    if (process.env.NODE_ENV === 'development' && process.env.EMAIL_DEV_FALLBACK === 'true') {
      logger.info('📧 [DEV MODE] Email would be sent via Resend:', {
        to: to,
        subject: subject,
        hasHtml: !!html,
        hasText: !!text,
        preview: (html || text).substring(0, 100) + '...'
      });
      return { 
        success: true, 
        dev: true, 
        messageId: 'dev-resend-' + Date.now(),
        note: 'Email logged in development mode - not actually sent'
      };
    }

    // Initialize Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.SENDPULSE_FROM_EMAIL || process.env.SMTP_FROM;
    const FROM_NAME = process.env.APP_NAME || 'WayMate';

    if (!RESEND_API_KEY) {
      throw new Error('Resend API key is not configured. Please set RESEND_API_KEY environment variable.');
    }

    if (!FROM_EMAIL) {
      throw new Error('FROM_EMAIL is not configured. Please set RESEND_FROM_EMAIL environment variable.');
    }

    const resend = new Resend(RESEND_API_KEY);

    // Prepare email data for Resend
    const emailData = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: subject,
      text: text,
      html: html
    };

    logger.info('📤 Sending email via Resend:', {
      to: to,
      from: FROM_EMAIL,
      subject: subject,
      hasHtml: !!html,
      hasText: !!text
    });

    // Send email using Resend
    const result = await resend.emails.send(emailData);

    if (result.data && result.data.id) {
      logger.info(`📧 Email sent successfully to ${to} with subject "${subject}"`, { 
        messageId: result.data.id,
        provider: 'Resend'
      });
      return {
        success: true,
        messageId: result.data.id,
        provider: 'Resend',
        data: result.data
      };
    } else {
      const errorMsg = result.error?.message || 'Unknown error from Resend';
      logger.error('❌ Resend email sending failed:', {
        error: errorMsg,
        to: to,
        subject: subject,
        fullResponse: result
      });
      throw new Error(`Resend API error: ${errorMsg}`);
    }

  } catch (error) {
    logger.error('❌ Error sending email via Resend:', {
      error: error.message,
      to,
      subject,
    });

    // If it's an API key error in development, suggest fallback mode
    if (process.env.NODE_ENV === 'development' && error.message.includes('API key')) {
      logger.warn('💡 Suggestion: Enable development fallback mode by setting EMAIL_DEV_FALLBACK=true in your .env file');
      logger.warn('📖 Sign up for free at https://resend.com to get your API key');
    }

    throw new Error('The email could not be sent at this time.');
  }
};

module.exports = sendEmailViaResend;