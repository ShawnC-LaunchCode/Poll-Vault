import pino from 'pino';

/**
 * Logger Configuration
 *
 * Uses Pino for structured logging with:
 * - Development: Pretty formatting for readability
 * - Production: JSON format for log aggregation/analysis
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  // Redact sensitive information from logs
  redact: {
    paths: [
      'token',
      'idToken',
      'password',
      'credential',
      'SESSION_SECRET',
      'GOOGLE_CLIENT_ID',
      'DATABASE_URL',
      '*.password',
      '*.token',
      '*.secret',
    ],
    remove: true,
  },
  // Base context for all logs
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context
 * @param context - Additional context to add to all logs
 */
export const createLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Express middleware for request logging
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Add request ID to request object for tracing
  req.id = requestId;
  req.log = logger.child({ requestId, method: req.method, url: req.url });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.log.info(
      {
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
      `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

export default logger;
