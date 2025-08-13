const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Sends an email using a configured transport.
 * Best for transactional emails like password resets, welcome messages, etc.
 * @param {object} options - Email options.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text body.
 * @param {string} [options.html] - HTML body (optional).
 * @returns {Promise<object>} Nodemailer response object.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email parameters: to, subject, and body are required.');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
      logger.info('✅ SMTP connection verified successfully.');
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'WayMate'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`📧 Email sent to ${to} with subject "${subject}"`, { messageId: info.messageId });
    return info;

  } catch (error) {
    logger.error('❌ Error sending email:', {
      error: error.message,
      to,
      subject,
    });
    throw new Error('The email could not be sent at this time.');
  }
};

module.exports = sendEmail;