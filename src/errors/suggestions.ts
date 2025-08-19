/**
 * Intelligent suggestion system for error handling
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find the most similar string from a list of options
 */
export function findBestMatch(input: string, options: string[], threshold = 3): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  
  for (const option of options) {
    const distance = levenshteinDistance(input.toLowerCase(), option.toLowerCase());
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = option;
    }
  }
  
  return bestMatch;
}

/**
 * Find multiple similar suggestions
 */
export function findSimilarOptions(input: string, options: string[], maxSuggestions = 3, threshold = 3): string[] {
  const suggestions: Array<{ option: string; distance: number }> = [];
  
  for (const option of options) {
    const distance = levenshteinDistance(input.toLowerCase(), option.toLowerCase());
    if (distance <= threshold) {
      suggestions.push({ option, distance });
    }
  }
  
  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(s => s.option);
}

/**
 * Available CLI commands for suggestions
 */
export const AVAILABLE_COMMANDS = [
  'init',
  'run',
  'doctor',
  'token-usage',
  'config',
  'list',
  'help',
  'version'
];

/**
 * Available agents for suggestions
 */
export const AVAILABLE_AGENTS = [
  'lint',
  'security-scan',
  'test-coverage',
  'performance',
  'accessibility',
  'seo',
  'bundle-size'
];

/**
 * Available configuration options
 */
export const CONFIG_OPTIONS = [
  'models.primary',
  'models.fallback',
  'providers.openai.api_key',
  'providers.anthropic.api_key',
  'budgets.daily_tokens',
  'budgets.per_commit_tokens',
  'budgets.monthly_cost',
  'thresholds.drift_score',
  'thresholds.security_risk',
  'thresholds.coverage_delta'
];

/**
 * Available CLI flags and options
 */
export const CLI_FLAGS = [
  '--help',
  '--version',
  '--verbose',
  '--force',
  '--files',
  '--format',
  '--period',
  '--key',
  '--budget',
  '--timeout',
  '--memory-limit',
  '--delay',
  '--fallback'
];

/**
 * Environment variables that users commonly need
 */
export const ENV_VARIABLES = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'VERIFIER_LOG_LEVEL',
  'VERIFIER_TIMEOUT',
  'VERIFIER_MEMORY_LIMIT'
];

/**
 * Generate contextual suggestions based on error type
 */
export interface SuggestionContext {
  errorCode: string;
  userInput?: string;
  availableOptions?: string[];
  commandContext?: string;
}

export function generateContextualSuggestions(context: SuggestionContext): string[] {
  const { errorCode, userInput, availableOptions, commandContext } = context;
  const suggestions: string[] = [];

  switch (errorCode) {
    case 'AGENT_NOT_FOUND':
      if (userInput) {
        const agentSuggestions = findSimilarOptions(userInput, AVAILABLE_AGENTS);
        suggestions.push(...agentSuggestions.map(agent => `Did you mean: verifier run ${agent}`));
      }
      suggestions.push('List all available agents: verifier list');
      break;

    case 'CONFIG_NOT_FOUND':
      suggestions.push('Initialize verifier: verifier init');
      suggestions.push('Check if you\'re in the right directory');
      suggestions.push('Verify setup: verifier doctor');
      break;

    case 'MISSING_API_KEY':
      suggestions.push('Get free API key: https://console.anthropic.com/');
      suggestions.push('Set API key: verifier config --key YOUR_KEY');
      suggestions.push('Try demo mode: verifier demo');
      break;

    case 'BUDGET_EXCEEDED':
      suggestions.push('Check usage: verifier token-usage');
      suggestions.push('Increase budget: verifier config --budget 200');
      suggestions.push('Reset budget: verifier config --reset-budget');
      break;

    case 'NOT_GIT_REPO':
      suggestions.push('Initialize git: git init');
      suggestions.push('Clone repository: git clone <url>');
      suggestions.push('Navigate to git repo: cd <repo-directory>');
      break;

    case 'NETWORK_ERROR':
      suggestions.push('Check internet connection');
      suggestions.push('Test connectivity: verifier doctor');
      suggestions.push('Try again in a moment');
      break;

    case 'PERMISSION_DENIED':
      suggestions.push('Fix permissions: chmod +x .verifier/');
      suggestions.push('Run with sudo: sudo verifier');
      suggestions.push('Check file ownership: ls -la .verifier/');
      break;

    default:
      if (userInput && availableOptions) {
        const matches = findSimilarOptions(userInput, availableOptions);
        suggestions.push(...matches.map(match => `Did you mean: ${match}`));
      }
      suggestions.push('Run diagnostics: verifier doctor');
      suggestions.push('Get help: verifier --help');
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Generate quick fix commands based on error
 */
export function generateQuickFix(errorCode: string, context?: Record<string, any>): string | null {
  switch (errorCode) {
    case 'CONFIG_NOT_FOUND':
      return 'verifier init';
    
    case 'MISSING_API_KEY':
      return 'verifier config --key YOUR_API_KEY';
    
    case 'BUDGET_EXCEEDED':
      return 'verifier config --budget 200';
    
    case 'AGENT_NOT_FOUND':
      return 'verifier list';
    
    case 'NOT_GIT_REPO':
      return 'git init';
    
    case 'GIT_DIRTY':
      return 'git status';
    
    case 'CONFIG_INVALID':
      return 'verifier init --force';
    
    case 'PERMISSION_DENIED':
      return 'chmod +x .verifier/';
    
    case 'NETWORK_ERROR':
      return 'verifier doctor';
    
    default:
      return null;
  }
}

/**
 * Generate help URLs based on error
 */
export function generateHelpUrl(errorCode: string): string {
  const baseUrl = 'https://autodevops.ai/docs/cli';
  
  switch (errorCode) {
    case 'CONFIG_NOT_FOUND':
    case 'CONFIG_INVALID':
      return `${baseUrl}/configuration`;
    
    case 'MISSING_API_KEY':
    case 'INVALID_API_KEY':
      return `${baseUrl}/authentication`;
    
    case 'AGENT_NOT_FOUND':
    case 'AGENT_LOAD_FAILED':
      return `${baseUrl}/agents`;
    
    case 'BUDGET_EXCEEDED':
      return `${baseUrl}/budgets`;
    
    case 'NOT_GIT_REPO':
    case 'GIT_DIRTY':
      return `${baseUrl}/git-integration`;
    
    case 'NETWORK_ERROR':
    case 'RATE_LIMITED':
    case 'PROVIDER_UNAVAILABLE':
      return `${baseUrl}/troubleshooting`;
    
    case 'PERMISSION_DENIED':
    case 'FILE_NOT_FOUND':
      return `${baseUrl}/permissions`;
    
    default:
      return `${baseUrl}/troubleshooting`;
  }
}