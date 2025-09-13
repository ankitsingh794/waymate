const APP_NAME = process.env.APP_NAME || 'WayMate';

const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(
        /[&<>'"]/g,
        (tag) =>
        ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
        }[tag] || tag)
    );
};

const createEmailLayout = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f2f5; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e9ecef; }
        .header h1 { color: #343a40; }
        .content { padding: 25px 0; line-height: 1.7; color: #495057; }
        .content p { margin: 0 0 18px; }
        .button-container { text-align: center; padding: 20px 0; }
        .button { 
            background-color: #0d6efd; 
            color: #ffffff !important; 
            padding: 14px 28px; 
            text-decoration: none !important; 
            border-radius: 8px; 
            font-weight: 600; 
            display: inline-block; 
            margin: 8px 10px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            line-height: 1.2;
            text-align: center;
            box-shadow: 0 2px 6px rgba(13, 110, 253, 0.3);
        }
        .button:hover { background-color: #0a58ca !important; }
        .mobile-button { background-color: #198754 !important; }
        .mobile-button:hover { background-color: #146c43 !important; }
        .web-button { background-color: #0d6efd !important; }
        .web-button:hover { background-color: #0a58ca !important; }
        .footer { text-align: center; font-size: 13px; color: #6c757d; padding-top: 20px; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>${escapeHTML(APP_NAME)}</h1></div>
        <div class="content">${content}</div>
        <div class="footer"><p>If you did not request this, you can safely ignore this email.</p></div>
    </div>
</body>
</html>
`;

exports.generateVerificationEmailHTML = (name, mobileVerifyURL, webVerifyURL) => {
    const safeName = escapeHTML(name);
    const content = `
        <p>Hi ${safeName},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the verification button below. This link is valid for 10 minutes.</p>
        
        <!-- Primary Web Verification Button (works in all email clients) -->
        <div class="button-container">
            <a href="${webVerifyURL}" class="button web-button" style="background-color: #0d6efd !important; color: #ffffff !important; text-decoration: none !important;">✅ Verify Your Email</a>
        </div>
        
        <p style="text-align: center; color: #6c757d; font-size: 14px; margin: 20px 0;">
            <strong>Have the WayMate mobile app?</strong><br/>
            <a href="${mobileVerifyURL}" style="color: #198754; text-decoration: underline;">Tap here to open in the app</a>
        </p>
        
        <hr style="border: none; height: 1px; background-color: #e9ecef; margin: 30px 0;">
        
        <p><strong>Having trouble?</strong><br/>
        Copy and paste this link into your browser:<br/>
        <a href="${webVerifyURL}" style="color: #0d6efd; word-break: break-all; font-size: 13px;">${webVerifyURL}</a></p>
        
        <p style="color: #6c757d; font-size: 13px;">
        <strong>Mobile app users:</strong> If the app link doesn't work, copy this instead:<br/>
        <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #495057;">${mobileVerifyURL}</code>
        </p>
        
        <p>Thanks,<br/>The ${escapeHTML(APP_NAME)} Team</p>
    `;
    return createEmailLayout('Verify Your Email', content);
};

exports.generatePasswordResetEmailHTML = (name, resetUrl) => {
    const safeName = escapeHTML(name);
    const content = `
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one. This link is valid for 10 minutes.</p>
        
        <div class="button-container">
            <a href="${resetUrl}" class="button" style="background-color: #dc3545 !important; color: #ffffff !important; text-decoration: none !important;">🔐 Reset Password</a>
        </div>
        
        <p><strong>Prefer to copy/paste?</strong><br/>
        <a href="${resetUrl}" style="color: #dc3545; word-break: break-all;">${resetUrl}</a></p>
        
        <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        
        <p>Thanks,<br/>The ${escapeHTML(APP_NAME)} Team</p>
    `;
    return createEmailLayout('Reset Your Password', content);
};

exports.generateTripReadyEmailHTML = (name, tripSummary) => {
    const safeName = escapeHTML(name);
    const content = `
        <p>Hi ${safeName},</p>
        <p>Your personalized itinerary for <strong>${escapeHTML(tripSummary.destinationName)}</strong> is ready! You can view it now in the app.</p>
        <div class="button-container">
            <a href="${process.env.CLIENT_URL || '#'}" class="button">View My Trip</a>
        </div>
        <p>We hope you have an amazing journey!</p>
        <p>Thanks,<br/>The ${escapeHTML(APP_NAME)} Team</p>
    `;
    return createEmailLayout(`Your Trip to ${escapeHTML(tripSummary.destinationName)} is Ready!`, content);
};