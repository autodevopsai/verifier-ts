import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import chalk from 'chalk';
import { VerifierError } from '../errors/error-handler';

const logsDir = path.join(process.cwd(), '.verifier', 'logs');

function ensureLogsDir(): void {
  try {
    fs.ensureDirSync(logsDir);
  } catch {
    // ignore
  }
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

export interface LogContext {
  command?: string;
  agent?: string;
  file?: string;
  duration?: number;
  [key: string]: any;
}

export class Logger {
  private logger: winston.Logger;
  private scope: string;
  private static isVerbose = false;

  constructor(scope: string) {
    this.scope = scope;
    ensureLogsDir();
    
    this.logger = winston.createLogger({
      level: process.env.VERIFIER_LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
          const { timestamp, level, message, stack, ...meta } = info as any;
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          const base = `${timestamp} [${scope}] ${level}: ${message}`;
          return stack ? `${base}\n${stack}${metaStr}` : `${base}${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          level: Logger.isVerbose ? 'debug' : 'info',
          format: winston.format.combine(
            winston.format.colorize(), 
            winston.format.simple()
          ),
        }),
        new winston.transports.File({ 
          filename: path.join(logsDir, 'verifier.log'),
          level: 'debug' // Always log debug to file
        }),
      ],
    });
  }

  /**
   * Set verbose mode for enhanced logging
   */
  public static setVerbose(verbose: boolean): void {
    Logger.isVerbose = verbose;
  }

  /**
   * Log info message with emoji and color
   */
  info(message: string, context?: LogContext): void {
    const formattedMessage = this.formatConsoleMessage('info', message, context);
    console.log(formattedMessage);
    this.logger.info(message, context);
  }

  /**
   * Log warning message with emoji and color
   */
  warn(message: string, context?: LogContext): void {
    const formattedMessage = this.formatConsoleMessage('warn', message, context);
    console.log(formattedMessage);
    this.logger.warn(message, context);
  }

  /**
   * Log error message with enhanced formatting
   */
  error(message: string, error?: unknown | string, context?: LogContext): void {
    if (error instanceof VerifierError) {
      // Let VerifierError handle its own formatting
      console.error(error.format(Logger.isVerbose));
      this.logger.error(message, { ...context, code: error.code, severity: error.severity });
    } else {
      const formattedMessage = this.formatConsoleMessage('error', message, context);
      console.error(formattedMessage);
      
      if (error instanceof Error) {
        this.logger.error(message, { 
          ...context,
          stack: error.stack, 
          name: error.name, 
          message: error.message 
        });
      } else if (typeof error === 'string') {
        this.logger.error(`${message} - ${error}`, context);
      } else if (error) {
        this.logger.error(message, { ...context, error: error as any });
      } else {
        this.logger.error(message, context);
      }
    }
  }

  /**
   * Log debug message (only shown in verbose mode)
   */
  debug(message: string, context?: LogContext): void {
    if (Logger.isVerbose) {
      const formattedMessage = this.formatConsoleMessage('debug', message, context);
      console.log(formattedMessage);
    }
    this.logger.debug(message, context);
  }

  /**
   * Log verbose message (only shown in verbose mode)
   */
  verbose(message: string, context?: LogContext): void {
    if (Logger.isVerbose) {
      const formattedMessage = this.formatConsoleMessage('verbose', message, context);
      console.log(formattedMessage);
    }
    this.logger.verbose(message, context);
  }

  /**
   * Log success message with green checkmark
   */
  success(message: string, context?: LogContext): void {
    const formattedMessage = chalk.green(`✅ ${message}`);
    console.log(formattedMessage);
    this.logger.info(`SUCCESS: ${message}`, context);
  }

  /**
   * Log progress message with spinner-like emoji
   */
  progress(message: string, context?: LogContext): void {
    const formattedMessage = chalk.blue(`🔄 ${message}`);
    console.log(formattedMessage);
    this.logger.info(`PROGRESS: ${message}`, context);
  }

  /**
   * Format console messages with emojis and colors
   */
  private formatConsoleMessage(level: string, message: string, context?: LogContext): string {
    let emoji = '';
    let colorFn = chalk.white;
    
    switch (level) {
      case 'error':
        emoji = '❌';
        colorFn = chalk.red;
        break;
      case 'warn':
        emoji = '⚠️';
        colorFn = chalk.yellow;
        break;
      case 'info':
        emoji = 'ℹ️';
        colorFn = chalk.blue;
        break;
      case 'debug':
        emoji = '🔍';
        colorFn = chalk.gray;
        break;
      case 'verbose':
        emoji = '📝';
        colorFn = chalk.magenta;
        break;
    }

    let formattedMessage = colorFn(`${emoji} ${message}`);
    
    // Add context information if provided and in verbose mode
    if (context && Logger.isVerbose) {
      const contextStr = Object.entries(context)
        .filter(([key, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      
      if (contextStr) {
        formattedMessage += chalk.gray(` (${contextStr})`);
      }
    }
    
    return formattedMessage;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalScope: string, context?: LogContext): Logger {
    const childLogger = new Logger(`${this.scope}:${additionalScope}`);
    
    // Pre-populate context if provided
    if (context) {
      const originalInfo = childLogger.info.bind(childLogger);
      const originalWarn = childLogger.warn.bind(childLogger);
      const originalError = childLogger.error.bind(childLogger);
      const originalDebug = childLogger.debug.bind(childLogger);
      
      childLogger.info = (message: string, childContext?: LogContext) => 
        originalInfo(message, { ...context, ...childContext });
      childLogger.warn = (message: string, childContext?: LogContext) => 
        originalWarn(message, { ...context, ...childContext });
      childLogger.error = (message: string, error?: unknown, childContext?: LogContext) => 
        originalError(message, error, { ...context, ...childContext });
      childLogger.debug = (message: string, childContext?: LogContext) => 
        originalDebug(message, { ...context, ...childContext });
    }
    
    return childLogger;
  }
}


