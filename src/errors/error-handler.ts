/**
 * Centralized error handling system for Verifier CLI
 */

import chalk from 'chalk';
import { 
  ErrorDefinition, 
  getErrorDefinition, 
  ErrorSeverity, 
  ErrorCategory 
} from './error-codes';
import { 
  generateContextualSuggestions, 
  generateQuickFix, 
  generateHelpUrl,
  SuggestionContext 
} from './suggestions';

export interface VerifierErrorOptions {
  code: string;
  message?: string;
  cause?: Error | string;
  suggestion?: string;
  quickFix?: string;
  helpUrl?: string;
  alternatives?: string[];
  context?: Record<string, any>;
  showStack?: boolean;
}

export class VerifierError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly suggestion?: string;
  public readonly quickFix?: string;
  public readonly helpUrl: string;
  public readonly alternatives: string[];
  public readonly context: Record<string, any>;
  public readonly cause?: Error | string;
  public readonly showStack: boolean;

  constructor(options: VerifierErrorOptions) {
    const definition = getErrorDefinition(options.code);
    const message = options.message || definition?.defaultMessage || 'An error occurred';
    
    super(message);
    
    this.name = 'VerifierError';
    this.code = options.code;
    this.category = definition?.category || ErrorCategory.SYSTEM;
    this.severity = definition?.severity || ErrorSeverity.MEDIUM;
    this.cause = options.cause;
    this.context = options.context || {};
    this.showStack = options.showStack || false;
    
    // Generate intelligent suggestions
    this.suggestion = options.suggestion || this.generateSuggestion(definition);
    this.quickFix = options.quickFix || generateQuickFix(this.code, this.context) || undefined;
    this.helpUrl = options.helpUrl || generateHelpUrl(this.code);
    this.alternatives = options.alternatives || this.generateAlternatives(definition);
  }

  private generateSuggestion(definition?: ErrorDefinition): string {
    if (definition?.commonCauses?.length) {
      return `Common causes: ${definition.commonCauses[0]}`;
    }
    
    const suggestions = generateContextualSuggestions({
      errorCode: this.code,
      userInput: this.context.userInput,
      availableOptions: this.context.availableOptions,
      commandContext: this.context.commandContext
    });
    
    return suggestions[0] || 'Check the documentation for more information';
  }

  private generateAlternatives(definition?: ErrorDefinition): string[] {
    const alternatives: string[] = [];
    
    if (definition?.relatedCommands?.length) {
      alternatives.push(...definition.relatedCommands);
    }
    
    const contextSuggestions = generateContextualSuggestions({
      errorCode: this.code,
      userInput: this.context.userInput,
      availableOptions: this.context.availableOptions
    });
    
    alternatives.push(...contextSuggestions.slice(1, 3));
    
    return alternatives.filter((alt, index, arr) => arr.indexOf(alt) === index);
  }

  /**
   * Format the error for console output
   */
  public format(verbose = false): string {
    const lines: string[] = [];
    
    // Error header with emoji and color coding
    const emoji = this.getEmoji();
    const colorFn = this.getColorFunction();
    
    lines.push(colorFn(`${emoji} Error ${this.code}: ${this.message}`));
    
    // Add cause if present
    if (this.cause) {
      const causeMessage = this.cause instanceof Error ? this.cause.message : String(this.cause);
      lines.push(chalk.gray(`   Caused by: ${causeMessage}`));
    }
    
    // Add suggestion
    if (this.suggestion) {
      lines.push(chalk.cyan(`   💡 ${this.suggestion}`));
    }
    
    // Add quick fix
    if (this.quickFix) {
      lines.push(chalk.green(`   🔧 Quick fix: ${chalk.bold(this.quickFix)}`));
    }
    
    // Add alternatives
    if (this.alternatives.length > 0) {
      lines.push(chalk.yellow('   📋 You can also try:'));
      this.alternatives.slice(0, 2).forEach(alt => {
        lines.push(chalk.yellow(`      • ${alt}`));
      });
    }
    
    // Add help URL
    lines.push(chalk.blue(`   📚 Help: ${this.helpUrl}`));
    
    // Add stack trace in verbose mode
    if (verbose && (this.showStack || this.stack)) {
      lines.push('');
      lines.push(chalk.gray('Stack trace:'));
      if (this.stack) {
        lines.push(chalk.gray(this.stack));
      }
    }
    
    return lines.join('\n');
  }

  private getEmoji(): string {
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
        return '🚨';
      case ErrorSeverity.HIGH:
        return '❌';
      case ErrorSeverity.MEDIUM:
        return '⚠️';
      case ErrorSeverity.LOW:
        return '⚡';
      default:
        return '❓';
    }
  }

  private getColorFunction(): (text: string) => string {
    switch (this.severity) {
      case ErrorSeverity.CRITICAL:
        return chalk.red.bold;
      case ErrorSeverity.HIGH:
        return chalk.red;
      case ErrorSeverity.MEDIUM:
        return chalk.yellow;
      case ErrorSeverity.LOW:
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }
}

/**
 * Global error handler for unhandled exceptions
 */
export class ErrorHandler {
  private static isVerbose = false;

  /**
   * Set verbose mode for error reporting
   */
  public static setVerbose(verbose: boolean): void {
    this.isVerbose = verbose;
  }

  /**
   * Handle a VerifierError and exit with appropriate code
   */
  public static handle(error: VerifierError): never {
    console.error(error.format(this.isVerbose));
    
    const exitCode = this.getExitCode(error.severity);
    process.exit(exitCode);
  }

  /**
   * Handle any error and convert to VerifierError if needed
   */
  public static handleAny(error: unknown, context?: Record<string, any>): never {
    let verifierError: VerifierError;
    
    if (error instanceof VerifierError) {
      verifierError = error;
    } else if (error instanceof Error) {
      verifierError = new VerifierError({
        code: 'UNKNOWN_ERROR',
        message: error.message,
        cause: error,
        context,
        showStack: true
      });
    } else {
      verifierError = new VerifierError({
        code: 'UNKNOWN_ERROR',
        message: String(error),
        context,
        showStack: false
      });
    }
    
    this.handle(verifierError);
  }

  /**
   * Setup global error handlers
   */
  public static setupGlobalHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      console.error(chalk.red('\n🚨 Uncaught Exception:'));
      this.handleAny(error, { type: 'uncaughtException' });
    });

    process.on('unhandledRejection', (reason: unknown) => {
      console.error(chalk.red('\n🚨 Unhandled Promise Rejection:'));
      this.handleAny(reason, { type: 'unhandledRejection' });
    });
  }

  private static getExitCode(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 2;
      case ErrorSeverity.HIGH:
        return 1;
      case ErrorSeverity.MEDIUM:
        return 1;
      case ErrorSeverity.LOW:
        return 0;
      default:
        return 1;
    }
  }
}

/**
 * Utility functions for creating common errors
 */
export const createError = {
  configNotFound: (path?: string) => new VerifierError({
    code: 'CONFIG_NOT_FOUND',
    context: { path },
    quickFix: 'verifier init'
  }),

  missingApiKey: (provider: string) => new VerifierError({
    code: 'MISSING_API_KEY',
    message: `Missing API key for ${provider}`,
    context: { provider },
    suggestion: `Get a free API key at https://console.${provider.toLowerCase()}.com/`,
    quickFix: 'verifier config --key YOUR_KEY'
  }),

  agentNotFound: (agentId: string, availableAgents: string[]) => new VerifierError({
    code: 'AGENT_NOT_FOUND',
    message: `Agent '${agentId}' not found`,
    context: { userInput: agentId, availableOptions: availableAgents },
    quickFix: 'verifier list'
  }),

  budgetExceeded: (type: 'daily' | 'monthly' | 'commit', current: number, limit: number) => new VerifierError({
    code: 'BUDGET_EXCEEDED',
    message: `${type} budget exceeded: ${current}/${limit}`,
    context: { type, current, limit },
    quickFix: 'verifier token-usage'
  }),

  notGitRepo: () => new VerifierError({
    code: 'NOT_GIT_REPO',
    quickFix: 'git init'
  }),

  networkError: (details?: string) => new VerifierError({
    code: 'NETWORK_ERROR',
    message: details ? `Network error: ${details}` : undefined,
    context: { details },
    quickFix: 'verifier doctor'
  }),

  fileNotFound: (filePath: string) => new VerifierError({
    code: 'FILE_NOT_FOUND',
    message: `File not found: ${filePath}`,
    context: { filePath }
  }),

  permissionDenied: (path: string) => new VerifierError({
    code: 'PERMISSION_DENIED',
    message: `Permission denied: ${path}`,
    context: { path },
    quickFix: `chmod +x ${path}`
  })
};