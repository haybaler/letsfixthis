import { ConsoleLog } from '../types';
import { BaseAIProvider, AIAnalysis } from './ai-provider';

import { KeyResolver } from './key-resolver';

export class OpenAIDevProvider extends BaseAIProvider {
  name = 'openai-dev';
  private openaiApiKey?: string;
  private openaiEndpoint?: string;

  constructor() {
    super();
    const cfg = KeyResolver.getOpenAIConfig('openai-dev');
    this.openaiApiKey = cfg.apiKey;
    this.openaiEndpoint = cfg.baseURL || 'https://api.openai.com/v1';
  }

  isAvailable(): boolean {
    return !!this.openaiApiKey;
  }

  async analyze(logs: ConsoleLog[]): Promise<AIAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // OpenAI Dev Tools specific analysis
      const analysis = await this.analyzeWithOpenAIDevTools(logs);
      return analysis;
    } catch (error) {
      console.error('OpenAI Dev Tools analysis failed:', error);
      return super.analyze(logs);
    }
  }

  private async analyzeWithOpenAIDevTools(logs: ConsoleLog[]): Promise<AIAnalysis> {
    const errors = logs.filter(log => log.level === 'error');
    const warnings = logs.filter(log => log.level === 'warn');
    const networkErrors = logs.filter(log => log.type === 'network');

    // OpenAI Dev Tools specific prompt
    const prompt = this.buildOpenAIDevPrompt(logs, errors, warnings, networkErrors);

    try {
      const response = await this.callOpenAIDevAPI(prompt);
      return this.parseOpenAIDevResponse(response);
    } catch (error) {
      console.error('OpenAI Dev Tools API call failed:', error);
      return this.generateFallbackAnalysis(logs, errors, warnings, networkErrors);
    }
  }

  private buildOpenAIDevPrompt(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): string {
    return `You are an AI developer assistant using OpenAI's developer tools. Analyze these browser console logs and provide development-focused insights:

DEVELOPMENT CONTEXT: Browser Console Analysis
TOTAL LOGS: ${logs.length}
ERRORS: ${errors.length}
WARNINGS: ${warnings.length}
NETWORK ISSUES: ${networkErrors.length}

ERROR ANALYSIS:
${errors.map((log, index) => `${index + 1}. ${log.message}
   Location: ${log.url || 'unknown'}:${log.lineNumber || '?'}:${log.columnNumber || '?'}
   ${log.stack ? `Stack Trace: ${log.stack.split('\n')[0]}` : ''}`).join('\n\n')}

WARNING ANALYSIS:
${warnings.map((log, index) => `${index + 1}. ${log.message}
   Location: ${log.url || 'unknown'}:${log.lineNumber || '?'}:${log.columnNumber || '?'}`).join('\n\n')}

NETWORK ISSUES:
${networkErrors.map((log, index) => `${index + 1}. ${log.message}`).join('\n\n')}

As an OpenAI developer assistant, provide a structured analysis in JSON format:
{
  "summary": "Development-focused summary",
  "suggestions": ["development action 1", "development action 2"],
  "priority": "low|medium|high|critical",
  "codeFixes": ["specific code fix with context", "another fix"],
  "explanations": ["why this happens in development", "how to fix it"],
  "confidence": 0.85,
  "developmentSteps": ["step 1: check imports", "step 2: verify dependencies"],
  "bestPractices": ["practice 1", "practice 2"],
  "testingRecommendations": ["test 1", "test 2"]
}`;
  }

  private async callOpenAIDevAPI(prompt: string): Promise<any> {
    // OpenAI Dev Tools API call
    const response = await fetch(`${this.openaiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Dev-Tools': 'true' // Custom header for dev tools
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an AI developer assistant using OpenAI\'s developer tools. Focus on practical development solutions and code improvements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.1,
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_console_logs',
              description: 'Analyze browser console logs for development insights',
              parameters: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  suggestions: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  codeFixes: { type: 'array', items: { type: 'string' } },
                  explanations: { type: 'array', items: { type: 'string' } },
                  confidence: { type: 'number' },
                  developmentSteps: { type: 'array', items: { type: 'string' } },
                  bestPractices: { type: 'array', items: { type: 'string' } },
                  testingRecommendations: { type: 'array', items: { type: 'string' } }
                },
                required: ['summary', 'suggestions', 'priority', 'confidence']
              }
            }
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Dev Tools API error: ${response.status}`);
    }

    return await response.json();
  }

  private parseOpenAIDevResponse(response: any): AIAnalysis {
    try {
      const message = response.choices?.[0]?.message;
      const toolCall = message?.tool_calls?.[0];
      
      if (toolCall && toolCall.function?.name === 'analyze_console_logs') {
        const parsed = JSON.parse(toolCall.function.arguments);
        return {
          summary: parsed.summary || 'OpenAI Dev Tools analysis completed',
          suggestions: parsed.suggestions || [],
          priority: parsed.priority || 'medium',
          codeFixes: parsed.codeFixes || [],
          explanations: parsed.explanations || [],
          confidence: parsed.confidence || 0.85
        };
      }

      // Fallback to content parsing
      const content = message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || 'OpenAI Dev Tools analysis completed',
          suggestions: parsed.suggestions || [],
          priority: parsed.priority || 'medium',
          codeFixes: parsed.codeFixes || [],
          explanations: parsed.explanations || [],
          confidence: parsed.confidence || 0.85
        };
      }

      throw new Error('Invalid response format from OpenAI Dev Tools');
    } catch (error) {
      console.error('Failed to parse OpenAI Dev Tools response:', error);
      throw error;
    }
  }

  private generateFallbackAnalysis(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): AIAnalysis {
    const summary = `OpenAI Dev Tools fallback analysis: ${logs.length} logs with ${errors.length} errors, ${warnings.length} warnings, ${networkErrors.length} network issues.`;
    
    const suggestions = [
      'Review JavaScript syntax and runtime errors',
      'Check for missing dependencies and imports',
      'Verify API endpoints and network requests',
      'Implement proper error handling and logging'
    ];

    const codeFixes = errors.map(error => {
      if (error.message.includes('Cannot read property')) {
        return 'Add optional chaining (?.) or null checks before property access';
      }
      if (error.message.includes('is not defined')) {
        return 'Check import statements and variable scope';
      }
      if (error.message.includes('Unexpected token')) {
        return 'Review syntax and check for missing brackets/parentheses';
      }
      return 'Add try-catch blocks and proper error handling';
    });

    return {
      summary,
      suggestions,
      priority: this.determinePriority(errors, warnings, networkErrors),
      codeFixes,
      explanations: this.generateExplanations(logs),
      confidence: 0.7
    };
  }

  async formatForAgent(logs: ConsoleLog[], agent: string): Promise<string> {
    const baseFormat = await super.formatForAgent(logs, agent);
    
    // Enhance with OpenAI Dev Tools specific information
    const enhanced = {
      ...JSON.parse(baseFormat),
      ai_provider: 'openai-dev',
      development_focused: true,
      specialized_in: ['javascript_development', 'code_analysis', 'best_practices'],
      tools_used: ['openai_dev_tools', 'function_calling', 'structured_analysis']
    };

    return JSON.stringify(enhanced, null, 2);
  }

  protected generateSummary(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): string {
    return `OpenAI Dev Tools analysis: ${logs.length} console entries with ${errors.length} development issues, ${warnings.length} code quality concerns, and ${networkErrors.length} integration problems.`;
  }

  protected determinePriority(errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): 'low' | 'medium' | 'high' | 'critical' {
    // OpenAI Dev Tools specific priority logic
    if (errors.some(e => e.message.includes('Unexpected token') || e.message.includes('Cannot read property'))) {
      return 'critical';
    }
    if (errors.length > 2 || networkErrors.length > 1) return 'high';
    if (errors.length > 0 || warnings.length > 5) return 'medium';
    return 'low';
  }
}
