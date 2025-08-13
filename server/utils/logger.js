const winston = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(logColors);

const isDevelopment = process.env.NODE_ENV === 'development';

// Define different formats for development (readable) and production (JSON)
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  isDevelopment ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
  winston.format.splat(),
  winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

const prodJsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  levels: logLevels,
  format: prodJsonFormat, 
  transports: [
    new DailyRotateFile({
      filename: path.join('logs', 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, 
      maxSize: '20m',      
      maxFiles: '14d',     
    }),
    new DailyRotateFile({
      level: 'error',
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({ filename: path.join('logs', 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({ filename: path.join('logs', 'rejections.log') }),
  ],
  exitOnError: false, 
});

logger.add(new winston.transports.Console({
  format: isDevelopment ? format : winston.format.simple(),
  handleExceptions: true,
}));

module.exports = logger;