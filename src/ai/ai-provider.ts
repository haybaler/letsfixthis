import { ConsoleLog } from '../types';
import { generateSuggestions } from '../suggestions';

export interface AIAnalysis {
  summary: string;
  suggestions: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  codeFixes?: string[];
  explanations: string[];
  confidence: number;
}

export interface AIProvider {
  name: string;
  analyze(logs: ConsoleLog[]): Promise<AIAnalysis>;
  formatForAgent(logs: ConsoleLog[], agent: string): Promise<string>;
  isAvailable(): boolean;
}

export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.isAvailable())
      .map(provider => provider.name);
  }

  async analyzeWithAll(logs: ConsoleLog[]): Promise<Map<string, AIAnalysis>> {
    const results = new Map<string, AIAnalysis>();
    
    for (const [name, provider] of this.providers) {
      if (provider.isAvailable()) {
        try {
          const analysis = await provider.analyze(logs);
          results.set(name, analysis);
        } catch (error) {
          console.error(`Error analyzing with ${name}:`, error);
        }
      }
    }
    
    return results;
  }

  async getBestAnalysis(logs: ConsoleLog[]): Promise<AIAnalysis | null> {
    const analyses = await this.analyzeWithAll(logs);
    
    if (analyses.size === 0) return null;
    
    // Return the analysis with highest confidence
    let bestAnalysis: AIAnalysis | null = null;
    let highestConfidence = 0;
    
    for (const analysis of analyses.values()) {
      if (analysis.confidence > highestConfidence) {
        highestConfidence = analysis.confidence;
        bestAnalysis = analysis;
      }
    }
    
    return bestAnalysis;
  }
}

// Base class for common AI provider functionality
export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  
  async analyze(logs: ConsoleLog[]): Promise<AIAnalysis> {
    const errors = logs.filter(log => log.level === 'error');
    const warnings = logs.filter(log => log.level === 'warn');
    const networkErrors = logs.filter(log => log.type === 'network');
    
    // Default analysis logic
    const summary = this.generateSummary(logs, errors, warnings, networkErrors);
    const suggestions = generateSuggestions(logs);
    const priority = this.determinePriority(errors, warnings, networkErrors);
    const explanations = this.generateExplanations(logs);
    
    return {
      summary,
      suggestions,
      priority,
      explanations,
      confidence: this.calculateConfidence(logs)
    };
  }
  
  async formatForAgent(logs: ConsoleLog[], agent: string): Promise<string> {
    // Default formatting - can be overridden by specific providers
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      agent,
      provider: this.name,
      console_data: {
        errors: logs.filter(log => log.level === 'error'),
        warnings: logs.filter(log => log.level === 'warn'),
        logs: logs.filter(log => log.level === 'log'),
        network_errors: logs.filter(log => log.type === 'network'),
        stack_traces: logs.filter(log => log.stack).map(log => log.stack)
      },
      suggestions: generateSuggestions(logs)
    }, null, 2);
  }
  
  abstract isAvailable(): boolean;
  
  protected generateSummary(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): string {
    return `Found ${logs.length} console entries with ${errors.length} errors, ${warnings.length} warnings, and ${networkErrors.length} network issues.`;
  }
  
  protected determinePriority(errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.length > 5 || networkErrors.length > 3) return 'critical';
    if (errors.length > 2 || warnings.length > 10) return 'high';
    if (errors.length > 0 || warnings.length > 5) return 'medium';
    return 'low';
  }
  
  protected generateExplanations(logs: ConsoleLog[]): string[] {
    const explanations: string[] = [];
    
    const errors = logs.filter(log => log.level === 'error');
    if (errors.length > 0) {
      explanations.push(`${errors.length} JavaScript errors detected that may cause runtime issues`);
    }
    
    const networkErrors = logs.filter(log => log.type === 'network');
    if (networkErrors.length > 0) {
      explanations.push(`${networkErrors.length} network request failures that may indicate API or connectivity issues`);
    }
    
    return explanations;
  }
  
  protected calculateConfidence(logs: ConsoleLog[]): number {
    // Simple confidence calculation based on log quality
    const hasErrors = logs.some(log => log.level === 'error');
    const hasStackTraces = logs.some(log => log.stack);
    const hasNetworkInfo = logs.some(log => log.type === 'network');
    
    let confidence = 0.5; // Base confidence
    
    if (hasErrors) confidence += 0.2;
    if (hasStackTraces) confidence += 0.2;
    if (hasNetworkInfo) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}
