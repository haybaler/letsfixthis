import { streamText } from 'ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { KeyResolver } from './key-resolver';
import { ConsoleLog } from '../types';
import { BaseAIProvider, AIAnalysis } from './ai-provider';

export class VercelAIProvider extends BaseAIProvider {
  name = 'vercel-ai';
  private openaiApiKey?: string;
  private openaiBaseURL?: string;
  private anthropicApiKey?: string;

  constructor() {
    super();
    const openaiCfg = KeyResolver.getOpenAIConfig('vercel-ai');
    this.openaiApiKey = openaiCfg.apiKey;
    this.openaiBaseURL = openaiCfg.baseURL;
    const anthropicCfg = KeyResolver.getAnthropicConfig('vercel-ai');
    this.anthropicApiKey = anthropicCfg.apiKey;
  }

  isAvailable(): boolean {
    return !!(this.openaiApiKey || this.anthropicApiKey);
  }

  async analyze(logs: ConsoleLog[]): Promise<AIAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('No AI API keys configured');
    }

    const prompt = this.buildAnalysisPrompt(logs);
    
    try {
      if (this.openaiApiKey) {
        return await this.analyzeWithOpenAI(prompt);
      } else if (this.anthropicApiKey) {
        return await this.analyzeWithAnthropic(prompt);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    }

    // Fallback to base analysis
    return super.analyze(logs);
  }

  private buildAnalysisPrompt(logs: ConsoleLog[]): string {
    const errors = logs.filter(log => log.level === 'error');
    const warnings = logs.filter(log => log.level === 'warn');
    const networkErrors = logs.filter(log => log.type === 'network');

    return `Analyze these browser console logs and provide a structured analysis:

Console Logs Summary:
- Total logs: ${logs.length}
- Errors: ${errors.length}
- Warnings: ${warnings.length}
- Network errors: ${networkErrors.length}

Error Details:
${errors.map(log => `- ${log.message}${log.stack ? `\n  Stack: ${log.stack.split('\n')[0]}` : ''}`).join('\n')}

Warning Details:
${warnings.map(log => `- ${log.message}`).join('\n')}

Network Error Details:
${networkErrors.map(log => `- ${log.message}`).join('\n')}

Please provide a JSON response with the following structure:
{
  "summary": "Brief summary of the issues",
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"],
  "priority": "low|medium|high|critical",
  "codeFixes": ["specific code fix 1", "specific code fix 2"],
  "explanations": ["explanation 1", "explanation 2"],
  "confidence": 0.85
}`;
  }

  private async analyzeWithOpenAI(prompt: string): Promise<AIAnalysis> {
    const openaiClient = new OpenAI({
      apiKey: this.openaiApiKey,
      baseURL: this.openaiBaseURL,
    });

    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes browser console logs and provides structured debugging insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'Analysis completed',
        suggestions: parsed.suggestions || [],
        priority: parsed.priority || 'medium',
        codeFixes: parsed.codeFixes || [],
        explanations: parsed.explanations || [],
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return super.analyze([]);
    }
  }

  private async analyzeWithAnthropic(prompt: string): Promise<AIAnalysis> {
    const anthropicClient = new Anthropic({
      apiKey: this.anthropicApiKey,
    });

    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('No content in Anthropic response');
      }

      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'Analysis completed',
        suggestions: parsed.suggestions || [],
        priority: parsed.priority || 'medium',
        codeFixes: parsed.codeFixes || [],
        explanations: parsed.explanations || [],
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      console.error('Failed to parse Anthropic response:', error);
      return super.analyze([]);
    }
  }

  async formatForAgent(logs: ConsoleLog[], agent: string): Promise<string> {
    const baseFormat = await super.formatForAgent(logs, agent);
    
    // Enhance with Vercel AI specific formatting
    const enhanced = {
      ...JSON.parse(baseFormat),
      ai_provider: 'vercel-ai',
      available_models: this.getAvailableModels(),
      analysis_quality: 'enhanced'
    };

    return JSON.stringify(enhanced, null, 2);
  }

  private getAvailableModels(): string[] {
    const models: string[] = [];
    if (this.openaiApiKey) models.push('gpt-4', 'gpt-3.5-turbo');
    if (this.anthropicApiKey) models.push('claude-3-sonnet', 'claude-3-haiku');
    return models;
  }
}
