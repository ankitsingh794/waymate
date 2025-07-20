const APP_NAME = process.env.APP_NAME || 'WayMate';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Generates the HTML for the email verification message.
 * @param {string} name - The user's name.
 * @param {string} verificationUrl - The unique URL to verify the email.
 * @returns {string} - The full HTML content for the email.
 */
exports.generateVerificationEmailHTML = (name, verificationUrl) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
            .header h1 { color: #333333; }
            .content { padding: 20px 0; line-height: 1.6; color: #555555; }
            .content p { margin: 0 0 15px; }
            .button-container { text-align: center; padding: 20px 0; }
            .button { background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { text-align: center; font-size: 12px; color: #999999; padding-top: 20px; border-top: 1px solid #eeeeee; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to ${APP_NAME}!</h1>
            </div>
            <div class="content">
                <p>Hi ${name},</p>
                <p>We're excited to have you on board. To complete your registration, please verify your email address by clicking the button below. This link is valid for 10 minutes.</p>
                <div class="button-container">
                    <a href="${verificationUrl}" class="button">Verify My Email</a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p>Thanks,<br/>The ${APP_NAME} Team</p>
            </div>
            <div class="footer">
                <p>If you did not sign up for this account, you can safely ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Generates the HTML for the password reset message.
 * @param {string} name - The user's name.
 * @param {string} resetUrl - The unique URL to reset the password.
 * @returns {string} - The full HTML content for the email.
 */
exports.generatePasswordResetEmailHTML = (name, resetUrl) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
            .header h1 { color: #333333; }
            .content { padding: 20px 0; line-height: 1.6; color: #555555; }
            .content p { margin: 0 0 15px; }
            .button-container { text-align: center; padding: 20px 0; }
            .button { background-color: #dc3545; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { text-align: center; font-size: 12px; color: #999999; padding-top: 20px; border-top: 1px solid #eeeeee; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hi ${name},</p>
                <p>We received a request to reset the password for your ${APP_NAME} account. Please click the button below to set a new password. This link is valid for 10 minutes.</p>
                <div class="button-container">
                    <a href="${resetUrl}" class="button">Reset My Password</a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>Thanks,<br/>The ${APP_NAME} Team</p>
            </div>
            <div class="footer">
                <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};
