const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const sanitizeInput = require('./middlewares/sanitizeMiddleware'); // Replaces xss-clean
const hpp = require('hpp');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const messageRoutes = require('./routes/messageRoutes');
const chatRoutes = require('./routes/chatRoutes');
const findPlacesRoutes = require('./routes/findPlacesRoutes');

const app = express();

// --- Trust Proxy ---
// Essential for rate limiting and correct IP logging behind a reverse proxy
app.set('trust proxy', 1);

// --- CORS Setup ---
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://localhost:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --- Security Middleware ---
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Sanitize request body and query to prevent XSS attacks
app.use(sanitizeInput);

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp({
    // whitelist: ['duration', 'ratingsAverage'] // Example
}));

// --- Other Middleware ---
app.use(cookieParser());
app.use(globalLimiter);

// --- Logging ---
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', {
        stream: { write: (message) => logger.http(message.trim()) },
    }));
}

// --- API Routes ---
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/trips', tripRoutes);
apiRouter.use('/messages', messageRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/find-places', findPlacesRoutes);

app.use('/api/v1', apiRouter);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'WayMate API',
    timestamp: new Date(),
  });
});

// --- Error Handling ---
app.all('*', (req, res, next) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find ${req.originalUrl} on this server!`
    });
});
app.use(errorHandler);

module.exports = app;