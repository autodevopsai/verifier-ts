import { LLMProvider, CompletionOptions } from './provider-factory';
import { DemoFixtures } from '../demo/fixtures';

/**
 * Demo provider that returns realistic mock responses without requiring API keys.
 * Used for demonstrations and testing the CLI experience.
 */
export class DemoProvider implements LLMProvider {
  private fixtures: DemoFixtures;

  constructor() {
    this.fixtures = new DemoFixtures();
  }

  /**
   * Simulates LLM completion with realistic delays and mock responses
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    // Add realistic delay to simulate API call
    await this.simulateDelay();

    // Determine the type of analysis based on prompt content
    const analysisType = this.detectAnalysisType(prompt);
    
    return this.fixtures.getResponse(analysisType, options?.json_mode);
  }

  /**
   * Detects what type of analysis is being requested based on prompt content
   */
  private detectAnalysisType(prompt: string): 'security' | 'lint' | 'coverage' | 'performance' | 'generic' {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('security') || lowerPrompt.includes('vulnerability') || lowerPrompt.includes('vulnerabilities')) {
      return 'security';
    }
    
    if (lowerPrompt.includes('lint') || lowerPrompt.includes('code quality') || lowerPrompt.includes('style')) {
      return 'lint';
    }
    
    if (lowerPrompt.includes('coverage') || lowerPrompt.includes('test')) {
      return 'coverage';
    }
    
    if (lowerPrompt.includes('performance') || lowerPrompt.includes('optimization')) {
      return 'performance';
    }
    
    return 'generic';
  }

  /**
   * Simulates realistic API response delay
   */
  private async simulateDelay(): Promise<void> {
    // Random delay between 800ms and 2000ms to simulate real API calls
    const delay = Math.random() * 1200 + 800;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}