/**
 * Centralized error codes and classifications for the Verifier CLI
 */

export enum ErrorCategory {
  CONFIGURATION = 'CONFIGURATION',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  EXECUTION = 'EXECUTION',
  NETWORK = 'NETWORK',
  FILE_SYSTEM = 'FILE_SYSTEM',
  USER_INPUT = 'USER_INPUT',
  SYSTEM = 'SYSTEM'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDefinition {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  defaultMessage: string;
  docsUrl?: string;
  commonCauses?: string[];
  relatedCommands?: string[];
}

export const ERROR_DEFINITIONS: Record<string, ErrorDefinition> = {
  // Configuration Errors
  CONFIG_NOT_FOUND: {
    code: 'CONFIG_NOT_FOUND',
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'Verifier configuration not found',
    docsUrl: 'https://autodevops.ai/docs/cli/configuration',
    commonCauses: [
      'Project not initialized with verifier',
      'Config file deleted or moved',
      'Running from wrong directory'
    ],
    relatedCommands: ['verifier init', 'verifier doctor']
  },

  CONFIG_INVALID: {
    code: 'CONFIG_INVALID',
    category: ErrorCategory.CONFIGURATION,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'Invalid configuration format',
    docsUrl: 'https://autodevops.ai/docs/cli/configuration',
    commonCauses: [
      'YAML syntax errors',
      'Missing required fields',
      'Invalid field values'
    ],
    relatedCommands: ['verifier init --force', 'verifier doctor']
  },

  // Authentication Errors
  MISSING_API_KEY: {
    code: 'MISSING_API_KEY',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.CRITICAL,
    defaultMessage: 'API key not found',
    docsUrl: 'https://autodevops.ai/docs/cli/authentication',
    commonCauses: [
      'API key not set in .verifier/.env',
      'Environment variable not exported',
      'API key for wrong provider'
    ],
    relatedCommands: ['verifier init', 'verifier config --key']
  },

  INVALID_API_KEY: {
    code: 'INVALID_API_KEY',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.CRITICAL,
    defaultMessage: 'API key is invalid or expired',
    docsUrl: 'https://autodevops.ai/docs/cli/authentication',
    commonCauses: [
      'API key has expired',
      'API key is malformed',
      'Wrong provider API key'
    ],
    relatedCommands: ['verifier init', 'verifier config --key']
  },

  // Agent Errors
  AGENT_NOT_FOUND: {
    code: 'AGENT_NOT_FOUND',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'Agent not found',
    docsUrl: 'https://autodevops.ai/docs/cli/agents',
    commonCauses: [
      'Typo in agent name',
      'Agent not installed',
      'Custom agent path incorrect'
    ],
    relatedCommands: ['verifier list', 'verifier doctor']
  },

  AGENT_LOAD_FAILED: {
    code: 'AGENT_LOAD_FAILED',
    category: ErrorCategory.EXECUTION,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'Failed to load agent',
    docsUrl: 'https://autodevops.ai/docs/cli/agents',
    commonCauses: [
      'Agent file corrupted',
      'Missing dependencies',
      'Syntax errors in agent code'
    ],
    relatedCommands: ['verifier doctor', 'verifier reinstall']
  },

  // Budget/Token Errors
  BUDGET_EXCEEDED: {
    code: 'BUDGET_EXCEEDED',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'Token budget exceeded',
    docsUrl: 'https://autodevops.ai/docs/cli/budgets',
    commonCauses: [
      'Daily token limit reached',
      'Monthly cost limit reached',
      'Per-commit token limit exceeded'
    ],
    relatedCommands: ['verifier token-usage', 'verifier config --budget']
  },

  // Network Errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'Network request failed',
    docsUrl: 'https://autodevops.ai/docs/cli/troubleshooting',
    commonCauses: [
      'No internet connection',
      'API endpoint unreachable',
      'Firewall blocking requests'
    ],
    relatedCommands: ['verifier doctor', 'verifier ping']
  },

  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'API rate limit exceeded',
    docsUrl: 'https://autodevops.ai/docs/cli/rate-limits',
    commonCauses: [
      'Too many requests in short time',
      'Shared API key usage',
      'Provider rate limits'
    ],
    relatedCommands: ['verifier token-usage', 'verifier config --delay']
  },

  // File System Errors
  FILE_NOT_FOUND: {
    code: 'FILE_NOT_FOUND',
    category: ErrorCategory.FILE_SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'File or directory not found',
    docsUrl: 'https://autodevops.ai/docs/cli/file-handling',
    commonCauses: [
      'File path is incorrect',
      'File was deleted or moved',
      'Insufficient permissions'
    ],
    relatedCommands: ['verifier doctor', 'ls -la']
  },

  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    category: ErrorCategory.FILE_SYSTEM,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'Permission denied',
    docsUrl: 'https://autodevops.ai/docs/cli/permissions',
    commonCauses: [
      'Insufficient file permissions',
      'Protected system directory',
      'File locked by another process'
    ],
    relatedCommands: ['chmod +x', 'sudo verifier']
  },

  // Git Errors
  NOT_GIT_REPO: {
    code: 'NOT_GIT_REPO',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'Not a git repository',
    docsUrl: 'https://autodevops.ai/docs/cli/git-integration',
    commonCauses: [
      'No .git directory found',
      'Running outside git repo',
      'Git repository corrupted'
    ],
    relatedCommands: ['git init', 'cd <repo-directory>']
  },

  GIT_DIRTY: {
    code: 'GIT_DIRTY',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    defaultMessage: 'Git working directory is dirty',
    docsUrl: 'https://autodevops.ai/docs/cli/git-integration',
    commonCauses: [
      'Uncommitted changes',
      'Untracked files',
      'Staged changes'
    ],
    relatedCommands: ['git status', 'git commit', 'git stash']
  },

  // Provider Errors
  PROVIDER_UNAVAILABLE: {
    code: 'PROVIDER_UNAVAILABLE',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'AI provider is unavailable',
    docsUrl: 'https://autodevops.ai/docs/cli/providers',
    commonCauses: [
      'Provider API is down',
      'Service maintenance',
      'Regional outage'
    ],
    relatedCommands: ['verifier doctor', 'verifier config --fallback']
  },

  // System Errors
  INSUFFICIENT_MEMORY: {
    code: 'INSUFFICIENT_MEMORY',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'Insufficient system memory',
    docsUrl: 'https://autodevops.ai/docs/cli/system-requirements',
    commonCauses: [
      'Large file processing',
      'Memory leak in agent',
      'System low on RAM'
    ],
    relatedCommands: ['verifier config --memory-limit', 'free -h']
  },

  TIMEOUT: {
    code: 'TIMEOUT',
    category: ErrorCategory.EXECUTION,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'Operation timed out',
    docsUrl: 'https://autodevops.ai/docs/cli/timeouts',
    commonCauses: [
      'Large file processing',
      'Slow network connection',
      'Provider API delays'
    ],
    relatedCommands: ['verifier config --timeout', 'verifier doctor']
  },

  // Generic Errors
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'An unexpected error occurred',
    docsUrl: 'https://autodevops.ai/docs/cli/troubleshooting',
    commonCauses: [
      'Unhandled exception',
      'System incompatibility',
      'Software bug'
    ],
    relatedCommands: ['verifier doctor', 'verifier --verbose']
  }
};

/**
 * Get error definition by code
 */
export function getErrorDefinition(code: string): ErrorDefinition | undefined {
  return ERROR_DEFINITIONS[code];
}

/**
 * Get all error codes for a category
 */
export function getErrorCodesByCategory(category: ErrorCategory): string[] {
  return Object.entries(ERROR_DEFINITIONS)
    .filter(([, def]) => def.category === category)
    .map(([code]) => code);
}

/**
 * Get all error codes by severity
 */
export function getErrorCodesBySeverity(severity: ErrorSeverity): string[] {
  return Object.entries(ERROR_DEFINITIONS)
    .filter(([, def]) => def.severity === severity)
    .map(([code]) => code);
}