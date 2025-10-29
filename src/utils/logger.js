const { createLogger, format, transports } = require('winston');

const isTest = process.env.NODE_ENV === 'test';
const logger = createLogger({
  level: isTest ? process.env.LOG_LEVEL || 'error' : process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ timestamp, level, message, stack /*, ...meta */ }) => {
      const base = `${timestamp} [${level}] ${message}`;
      return stack ? `${base}\n${stack}` : base;
    })
  ),
  transports: [
    new transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

module.exports = logger;
