const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Send email using Nodemailer
 * @param {Object} options
 * @param {string} options.to - Recipient email(s), comma-separated if multiple
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content (optional)
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // ✅ Validate required fields
    if (!to || !subject || (!text && !html)) {
      logger.error('❌ Missing email parameters', { to, subject });
      throw new Error('Missing required email parameters');
    }

    // ✅ Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // Use TLS if port is 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Verify SMTP connection (optional, but good for debugging)
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
      logger.info('✅ SMTP connection verified');
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'WayMate'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info(`📧 Email sent successfully`, {
      messageId: info.messageId,
      to,
      subject,
    });

    return info;
  } catch (error) {
    logger.error('❌ Error sending email', {
      error: error.message,
      stack: error.stack,
      to,
      subject,
    });
    throw new Error('Email could not be sent. Please try again later.');
  }
};

module.exports = sendEmail;
