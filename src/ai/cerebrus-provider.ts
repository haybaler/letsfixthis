import { ConsoleLog } from '../types';
import { BaseAIProvider, AIAnalysis } from './ai-provider';

import { KeyResolver } from './key-resolver';

export class CerebrusProvider extends BaseAIProvider {
  name = 'cerebrus';
  private cerebrusApiKey?: string;
  private cerebrusEndpoint?: string;

  constructor() {
    super();
    const cfg = KeyResolver.getCerebrusConfig();
    this.cerebrusApiKey = cfg.apiKey;
    this.cerebrusEndpoint = cfg.endpoint;
  }

  isAvailable(): boolean {
    return !!this.cerebrusApiKey;
  }

  async analyze(logs: ConsoleLog[]): Promise<AIAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('Cerebrus API key not configured');
    }

    try {
      // Cerebrus-specific analysis focusing on debugging and code fixes
      const analysis = await this.analyzeWithCerebrus(logs);
      return analysis;
    } catch (error) {
      console.error('Cerebrus analysis failed:', error);
      return super.analyze(logs);
    }
  }

  private async analyzeWithCerebrus(logs: ConsoleLog[]): Promise<AIAnalysis> {
    const errors = logs.filter(log => log.level === 'error');
    const warnings = logs.filter(log => log.level === 'warn');
    const networkErrors = logs.filter(log => log.type === 'network');

    // Cerebrus-specific prompt for debugging focus
    const prompt = this.buildCerebrusPrompt(logs, errors, warnings, networkErrors);

    try {
      const response = await this.callCerebrusAPI(prompt);
      return this.parseCerebrusResponse(response);
    } catch (error) {
      console.error('Cerebrus API call failed:', error);
      return this.generateFallbackAnalysis(logs, errors, warnings, networkErrors);
    }
  }

  private buildCerebrusPrompt(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): string {
    return `You are Cerebrus, an AI specialized in debugging and code analysis. Analyze these browser console logs and provide debugging insights:

CONTEXT: Browser Console Debugging Session
TOTAL LOGS: ${logs.length}
ERRORS: ${errors.length}
WARNINGS: ${warnings.length}
NETWORK ISSUES: ${networkErrors.length}

ERROR ANALYSIS:
${errors.map((log, index) => `${index + 1}. ${log.message}
   Source: ${log.url || 'unknown'}:${log.lineNumber || '?'}:${log.columnNumber || '?'}
   ${log.stack ? `Stack: ${log.stack.split('\n')[0]}` : ''}`).join('\n\n')}

WARNING ANALYSIS:
${warnings.map((log, index) => `${index + 1}. ${log.message}
   Source: ${log.url || 'unknown'}:${log.lineNumber || '?'}:${log.columnNumber || '?'}`).join('\n\n')}

NETWORK ISSUES:
${networkErrors.map((log, index) => `${index + 1}. ${log.message}`).join('\n\n')}

As Cerebrus, provide a structured debugging analysis in JSON format:
{
  "summary": "Brief debugging summary",
  "suggestions": ["debugging step 1", "debugging step 2"],
  "priority": "low|medium|high|critical",
  "codeFixes": ["specific code fix with explanation", "another fix"],
  "explanations": ["why this error occurs", "how to prevent it"],
  "confidence": 0.9,
  "debuggingSteps": ["step 1: check variable scope", "step 2: verify API endpoints"],
  "commonPatterns": ["pattern 1", "pattern 2"]
}`;
  }

  private async callCerebrusAPI(prompt: string): Promise<any> {
    // Placeholder for Cerebrus API integration
    // This would be replaced with actual Cerebrus API calls when available
    const response = await fetch(`${this.cerebrusEndpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.cerebrusApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        context: 'browser_console_debugging',
        model: 'cerebrus-debug',
        maxTokens: 1500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Cerebrus API error: ${response.status}`);
    }

    return await response.json();
  }

  public async analyzeCodeReview(params: {
    summaries?: Array<{ filePath: string; imports?: string[]; exports?: string[]; size?: number; hash?: string }>;
    diff?: string;
    plan?: string;
  }): Promise<{ summary: string; risks: string[]; mitigations: string[]; risk_score: number }>
  {
    if (!this.isAvailable()) {
      throw new Error('Cerebrus API key not configured');
    }

    const { summaries = [], diff = '', plan = '' } = params;
    const prompt = `You are Cerebrus, a product-owner grade reviewer. Review the following repository changes and plan.

CODE SUMMARIES (changed files):\n${summaries.map(s => `- ${s.filePath} (size=${s.size})\n  imports: ${(s.imports||[]).join(', ')}\n  exports: ${(s.exports||[]).join(', ')}`).join('\n')}

DIFF (unified):\n${diff.slice(0, 200000)}

PLAN (if any):\n${plan}

Return JSON: { "summary": string, "risks": string[], "mitigations": string[], "risk_score": number (0-1)}.`;

    const response = await this.callCerebrusAPI(prompt);
    try {
      const text = response.content || response.choices?.[0]?.message?.content || JSON.stringify(response);
      const parsed = typeof text === 'string' ? JSON.parse(text) : text;
      return {
        summary: parsed.summary || 'Cerebrus review complete',
        risks: parsed.risks || [],
        mitigations: parsed.mitigations || [],
        risk_score: typeof parsed.risk_score === 'number' ? parsed.risk_score : 0.3
      };
    } catch (e) {
      // Fallback heuristic
      const risks: string[] = [];
      if (/console\.log\(/.test(diff)) risks.push('Debug statements present');
      if (/any\b/.test(diff)) risks.push('TypeScript any usage');
      if (/DROP\s+TABLE|DELETE\s+FROM/i.test(diff)) risks.push('Potential destructive DB operation');
      const score = Math.min(1, risks.length * 0.2);
      return { summary: 'Heuristic review', risks, mitigations: [], risk_score: score };
    }
  }

  private parseCerebrusResponse(response: any): AIAnalysis {
    try {
      const data = response.choices?.[0]?.message?.content || response.content || response;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      return {
        summary: parsed.summary || 'Cerebrus debugging analysis completed',
        suggestions: parsed.suggestions || [],
        priority: parsed.priority || 'medium',
        codeFixes: parsed.codeFixes || [],
        explanations: parsed.explanations || [],
        confidence: parsed.confidence || 0.9
      };
    } catch (error) {
      console.error('Failed to parse Cerebrus response:', error);
      throw error;
    }
  }

  private generateFallbackAnalysis(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): AIAnalysis {
    const summary = `Cerebrus fallback analysis: ${logs.length} logs with ${errors.length} errors, ${warnings.length} warnings, ${networkErrors.length} network issues.`;
    
    const suggestions = [
      'Focus on resolving JavaScript runtime errors first',
      'Check for undefined variables and missing imports',
      'Verify API endpoints and network connectivity',
      'Review browser compatibility issues'
    ];

    const codeFixes = errors.map(error => {
      if (error.message.includes('Cannot read property')) {
        return 'Add null checks before accessing object properties';
      }
      if (error.message.includes('is not defined')) {
        return 'Check variable scope and import statements';
      }
      return 'Review the error context and add appropriate error handling';
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
    
    // Enhance with Cerebrus-specific debugging information
    const enhanced = {
      ...JSON.parse(baseFormat),
      ai_provider: 'cerebrus',
      debugging_focused: true,
      specialized_in: ['javascript_debugging', 'runtime_analysis', 'code_fixes'],
      analysis_depth: 'deep'
    };

    return JSON.stringify(enhanced, null, 2);
  }

  protected generateSummary(logs: ConsoleLog[], errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): string {
    return `Cerebrus debugging analysis: ${logs.length} console entries with ${errors.length} errors requiring attention, ${warnings.length} warnings to review, and ${networkErrors.length} network connectivity issues.`;
  }

  protected determinePriority(errors: ConsoleLog[], warnings: ConsoleLog[], networkErrors: ConsoleLog[]): 'low' | 'medium' | 'high' | 'critical' {
    // Cerebrus-specific priority logic focused on debugging impact
    if (errors.some(e => e.message.includes('Cannot read property') || e.message.includes('is not defined'))) {
      return 'critical';
    }
    if (errors.length > 3 || networkErrors.length > 2) return 'high';
    if (errors.length > 0 || warnings.length > 8) return 'medium';
    return 'low';
  }
}
