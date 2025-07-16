const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;

// Custom log format for console
const consoleFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Define custom levels (including HTTP)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Create logger
const logger = createLogger({
  levels,
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // file logs in JSON for structured logging
  ),
  transports: [
    // Error logs
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Combined logs
    new transports.File({ filename: 'logs/combined.log' }),
    // HTTP logs for API requests
    new transports.File({ filename: 'logs/access.log', level: 'http' })
  ]
});

// Add colorized console logging only for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }));
}

module.exports = logger;
