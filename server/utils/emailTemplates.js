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
        .button { background-color: #0d6efd; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
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
        <p>Thanks for signing up! Please verify your email address by clicking the button below. This link is valid for 10 minutes.</p>
        <div class="button-container">
            <a href="${mobileVerifyURL}" class="button">📱 Open in WayMate App</a>
            <a href="${webVerifyURL}" class="button" style="background-color: #4CAF50;">🌐 Verify in Browser</a>
        </div>
        <p>If the buttons don't work, copy and paste this link into your browser:<br/><a href="${webVerifyURL}">${webVerifyURL}</a></p>
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
            <a href="${resetUrl}" class="button" style="background-color: #dc3545;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
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