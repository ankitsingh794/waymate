// server/routes/deepLinkRoutes.js

const express = require('express');
const router = express.Router();

/**
 * Helper to safely escape characters for HTML contexts
 */
const escapeHtml = (str = '') => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Universal deep link handler that works in all email clients.
 * Hardened against Reflected XSS, Open Redirects, and Script Injections.
 */
router.get('/app-redirect', (req, res) => {
  const { action, token, email } = req.query;

  // Strict token validation: Must be alphanumeric token / hex / base64url string
  const tokenRegex = /^[a-zA-Z0-9_-]{16,256}$/;
  if (!token || typeof token !== 'string' || !tokenRegex.test(token)) {
    return res.status(400).send('Invalid or malformed verification token.');
  }

  // Safe email sanitization
  const safeEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : '';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  let deepLinkUrl = '';
  let webFallbackUrl = '';

  switch (action) {
    case 'verify-email': {
      const emailParam = safeEmail ? `&email=${encodeURIComponent(safeEmail)}` : '';
      deepLinkUrl = `waymate://verify-email?token=${encodeURIComponent(token)}${emailParam}`;
      webFallbackUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(token)}${emailParam}`;
      break;
    }
    case 'reset-password': {
      deepLinkUrl = `waymate://reset-password?token=${encodeURIComponent(token)}`;
      webFallbackUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
      break;
    }
    default:
      return res.status(400).send('Invalid redirect action requested.');
  }

  // Safe HTML attribute escaping
  const safeDeepLink = escapeHtml(deepLinkUrl);
  const safeWebFallback = escapeHtml(webFallbackUrl);
  // Safe JS string literal serialization
  const serializedDeepLink = JSON.stringify(deepLinkUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening WayMate...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #0b1712;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: #fffdf8;
        }
        .container {
            background: rgba(23, 51, 40, 0.75);
            border: 1px solid rgba(215, 188, 156, 0.25);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            color: #fffdf8;
            max-width: 400px;
            width: 100%;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(215, 188, 156, 0.2);
            border-top: 4px solid #d7bc9c;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .btn {
            background: linear-gradient(135deg, #d7bc9c, #c9a87e);
            color: #0b1712;
            padding: 14px 28px;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.2s ease;
        }
        .btn:hover {
            background: #e3cbb0;
            transform: translateY(-2px);
        }
        .hidden { display: none; }
        .step { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧭 WayMate</h1>
        
        <div id="loading" class="step">
            <div class="spinner"></div>
            <p>Opening WayMate app...</p>
        </div>
        
        <div id="fallback" class="step hidden">
            <h2>📱 App Not Installed?</h2>
            <p>If the WayMate app didn't open automatically:</p>
            <a href="${safeWebFallback}" class="btn">Continue in Browser</a>
        </div>
        
        <div id="manual" class="step hidden">
            <h2>🔗 Alternate Options</h2>
            <a href="${safeDeepLink}" class="btn">Try App Again</a>
            <a href="${safeWebFallback}" class="btn">Use Browser</a>
        </div>
    </div>

    <script>
        (function() {
            var targetDeepLink = ${serializedDeepLink};
            try {
                window.location.href = targetDeepLink;
            } catch (e) {}

            setTimeout(function() {
                var loading = document.getElementById('loading');
                var fallback = document.getElementById('fallback');
                if (loading) loading.classList.add('hidden');
                if (fallback) fallback.classList.remove('hidden');
            }, 3000);

            setTimeout(function() {
                var fallback = document.getElementById('fallback');
                var manual = document.getElementById('manual');
                if (fallback) fallback.classList.add('hidden');
                if (manual) manual.classList.remove('hidden');
            }, 8000);
        })();
    </script>
</body>
</html>`;

  res.send(html);
});

module.exports = router;
