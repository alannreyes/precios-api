import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json, printf, colorize } = format;

// Formato para desarrollo (más legible)
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return `${timestamp} [${level}]: ${stack || message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
});

// Formato para producción (JSON estructurado)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    devFormat
  ),
  defaultMeta: {
    service: 'precios-api',
    version: process.env.API_VERSION || 'v1',
  },
  transports: [
    // Consola
    new transports.Console({
      stderrLevels: ['error'],
    }),
    
    // Archivo de errores
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Archivo general
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ],
});

// Crear directorio de logs si no existe
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('logs')) {
  mkdirSync('logs');
} 