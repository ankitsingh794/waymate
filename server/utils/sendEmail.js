const sendpulse = require('sendpulse-api');
const logger = require('./logger');

// Import Resend as primary email service
const sendEmailViaResend = require('./sendEmailResend');

/**
 * Main email service with intelligent fallback system
 * Primary: Resend (reliable, Render-friendly, no SMTP ports)
 * Fallback: SendPulse (if Resend fails)
 * Dev Mode: Logging (for development)
 * 
 * @param {object} options - Email options.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text body.
 * @param {string} [options.html] - HTML body (optional).
 * @returns {Promise<object>} Email service response object.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email parameters: to, subject, and body are required.');
    }

    // Strategy 1: Try Resend first (recommended for Render)
    if (process.env.RESEND_API_KEY) {
      try {
        logger.info('📧 Attempting to send email via Resend (primary service)');
        const result = await sendEmailViaResend({ to, subject, text, html });
        return result;
      } catch (resendError) {
        logger.warn('⚠️ Resend failed, trying SendPulse fallback:', resendError.message);
        // Continue to SendPulse fallback
      }
    } else {
      logger.info('📧 Resend not configured, using SendPulse');
    }

    // Strategy 2: SendPulse fallback (existing implementation)
    return await sendEmailViaSendPulse({ to, subject, text, html });

  } catch (error) {
    logger.error('❌ All email services failed:', {
      error: error.message,
      to,
      subject,
    });
    throw new Error('The email could not be sent at this time.');
  }
};

/**
 * SendPulse email implementation (fallback service)
 */
const sendEmailViaSendPulse = async ({ to, subject, text, html }) => {
  try {
    // Development fallback: Log emails instead of sending when SMTP fails
    if (process.env.NODE_ENV === 'development' && process.env.SENDPULSE_DEV_FALLBACK === 'true') {
      logger.info('📧 [DEV MODE] Email would be sent via SendPulse:', {
        to: to,
        subject: subject,
        hasHtml: !!html,
        hasText: !!text,
        preview: (html || text).substring(0, 100) + '...'
      });
      return { 
        success: true, 
        dev: true, 
        messageId: 'dev-sendpulse-' + Date.now(),
        note: 'Email logged in development mode - not actually sent'
      };
    }

    // Initialize SendPulse API
    const API_USER_ID = process.env.SENDPULSE_API_USER_ID;
    const API_SECRET = process.env.SENDPULSE_API_SECRET;
    const FROM_EMAIL = process.env.SENDPULSE_FROM_EMAIL || process.env.SMTP_FROM;
    const FROM_NAME = process.env.APP_NAME || 'WayMate';

    if (!API_USER_ID || !API_SECRET) {
      throw new Error('SendPulse API credentials are not configured. Please set SENDPULSE_API_USER_ID and SENDPULSE_API_SECRET environment variables.');
    }

    if (!FROM_EMAIL) {
      throw new Error('FROM_EMAIL is not configured. Please set SENDPULSE_FROM_EMAIL or SMTP_FROM environment variable.');
    }

    // Return a promise to handle SendPulse callback-based API
    return new Promise((resolve, reject) => {
      
      // Initialize SendPulse with credentials
      sendpulse.init(API_USER_ID, API_SECRET, '/tmp/', (token) => {
        logger.info('🔐 SendPulse authentication result:', { 
          hasToken: !!token,
          tokenType: typeof token
        });

        if (!token) {
          const authError = 'Failed to authenticate with SendPulse API. Check your API credentials.';
          logger.error('❌ SendPulse authentication failed:', {
            apiUserId: API_USER_ID ? `${API_USER_ID.substr(0, 8)}...` : 'missing',
            apiSecret: API_SECRET ? `${API_SECRET.substr(0, 8)}...` : 'missing'
          });
          return reject(new Error(authError));
        }

        // Prepare email data for SendPulse
        const emailData = {
          html: html || text,
          text: text || '',
          subject: subject,
          from: {
            name: FROM_NAME,
            email: FROM_EMAIL
          },
          to: [
            {
              email: to
            }
          ]
        };

        logger.info('📤 Sending email via SendPulse:', {
          to: to,
          from: FROM_EMAIL,
          subject: subject,
          hasHtml: !!html,
          hasText: !!text
        });

        // Send email using SendPulse SMTP
        sendpulse.smtpSendMail((data) => {
          logger.info('📨 SendPulse API Response:', { 
            response: data,
            success: data && data.result === true 
          });

          if (data && data.result === true) {
            logger.info(`📧 Email sent successfully to ${to} with subject "${subject}"`, { 
              messageId: data.id || 'unknown',
              provider: 'SendPulse'
            });
            resolve(data);
          } else {
            const errorMsg = data && data.message ? data.message : 'Unknown error from SendPulse';
            const fullError = data && data.error_text ? data.error_text : errorMsg;
            
            logger.error('❌ SendPulse email sending failed:', {
              error: fullError,
              to: to,
              subject: subject,
              fullResponse: data
            });
            reject(new Error(`SendPulse API error: ${fullError}`));
          }
        }, emailData);

      });
    });

  } catch (error) {
    logger.error('❌ Error sending email:', {
      error: error.message,
      to,
      subject,
    });

    // If it's an unauthorized error in development, suggest fallback mode
    if (process.env.NODE_ENV === 'development' && error.message.includes('Unauthorized')) {
      logger.warn('💡 Suggestion: Enable development fallback mode by setting SENDPULSE_DEV_FALLBACK=true in your .env file');
      logger.warn('📖 Check SENDPULSE_TROUBLESHOOTING.md for SendPulse SMTP setup instructions');
    }

    throw error;
  }
};

module.exports = sendEmail;