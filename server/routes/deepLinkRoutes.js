// server/routes/deepLinkRoutes.js

const express = require('express');
const router = express.Router();

/**
 * Universal deep link handler that works in all email clients
 * This creates a web page that attempts to open the app, then falls back to web
 */
router.get('/app-redirect', (req, res) => {
    const { action, token, email } = req.query;
    
    // Generate the deep link URL
    let deepLinkUrl = '';
    let webFallbackUrl = '';
    
    switch (action) {
        case 'verify-email':
            deepLinkUrl = `waymate://verify-email?token=${token}&email=${encodeURIComponent(email || '')}`;
            webFallbackUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}&email=${encodeURIComponent(email || '')}`;
            break;
        case 'reset-password':
            deepLinkUrl = `waymate://reset-password?token=${token}`;
            webFallbackUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
            break;
        default:
            return res.status(400).send('Invalid action');
    }

    // Create an HTML page that attempts app deep link, then fallback
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening WayMate...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: white;
        }
        .container {
            background: rgba(255,255,255,0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            color: #333;
            max-width: 400px;
            width: 100%;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            background: #667eea;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }
        .hidden { display: none; }
        .step { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Opening WayMate</h1>
        
        <div id="loading" class="step">
            <div class="spinner"></div>
            <p>Attempting to open WayMate app...</p>
        </div>
        
        <div id="fallback" class="step hidden">
            <h2>📱 App Not Installed?</h2>
            <p>If the WayMate app didn't open automatically:</p>
            <a href="${webFallbackUrl}" class="btn">Continue in Browser</a>
            <br><br>
            <p style="font-size: 14px; color: #666;">
                Or install the WayMate app and try again.
            </p>
        </div>
        
        <div id="manual" class="step hidden">
            <h2>🔗 Manual Options</h2>
            <a href="${deepLinkUrl}" class="btn">Try App Again</a>
            <a href="${webFallbackUrl}" class="btn">Use Browser</a>
        </div>
    </div>

    <script>
        // Attempt to open the app immediately
        window.location.href = '${deepLinkUrl}';
        
        // Show fallback options after 3 seconds
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('fallback').classList.remove('hidden');
        }, 3000);
        
        // Show manual options after 8 seconds
        setTimeout(() => {
            document.getElementById('fallback').classList.add('hidden');
            document.getElementById('manual').classList.remove('hidden');
        }, 8000);
        
        // Handle page visibility change (when user returns from app)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // User came back, app might not have opened
                setTimeout(() => {
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('fallback').classList.remove('hidden');
                }, 1000);
            }
        });
    </script>
</body>
</html>
    `;
    
    res.send(html);
});

module.exports = router;