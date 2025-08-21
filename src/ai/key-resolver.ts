import * as fs from 'fs';
import * as path from 'path';

// NOTE: we keep the legacy `cerebrus` identifier for backwards-compatibility,
// but the canonical provider id moving forward is `cerebras`.
type ProviderName = 'vercel-ai' | 'openai-dev' | 'cerebras' | 'cerebrus';

interface KeysConfig {
  providers?: Record<string, any>;
}

let cachedConfig: KeysConfig | null = null;

function loadConfig(): KeysConfig {
  if (cachedConfig) return cachedConfig as KeysConfig;
  const configPath = path.join(process.cwd(), '.letsfixthis.keys.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      cachedConfig = JSON.parse(raw);
      return cachedConfig as KeysConfig;
    }
  } catch {
    // ignore
  }
  cachedConfig = {};
  return cachedConfig as KeysConfig;
}

export interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
}

export interface AnthropicConfig {
  apiKey?: string;
}

export interface CerebrusConfig {
  apiKey?: string;
  endpoint?: string;
}

export class KeyResolver {
  static getOpenAIConfig(provider: ProviderName): OpenAIConfig {
    const cfg = loadConfig();
    const fromFile = cfg.providers?.[provider]?.openai || cfg.providers?.[provider] || {};

    // Provider-specific env vars
    const prefix = provider.toUpperCase().replace(/[-]/g, '_'); // e.g., VERCEL_AI, OPENAI_DEV
    const envApiKey = process.env[`${prefix}_OPENAI_API_KEY`];
    const envBase1 = process.env[`${prefix}_OPENAI_BASE_URL`];
    const envBase2 = process.env[`${prefix}_OPENAI_ENDPOINT`];

    // Generic (fallback) env vars
    const genericApiKey = process.env.OPENAI_API_KEY;
    const genericBase = process.env.OPENAI_BASE_URL || process.env.OPENAI_ENDPOINT;

    return {
      apiKey: fromFile.apiKey || envApiKey || genericApiKey,
      baseURL: fromFile.baseURL || envBase1 || envBase2 || genericBase || 'https://api.openai.com/v1',
    };
  }

  static getAnthropicConfig(provider: ProviderName): AnthropicConfig {
    const cfg = loadConfig();
    const fromFile = cfg.providers?.[provider]?.anthropic || {};
    const prefix = provider.toUpperCase().replace(/[-]/g, '_');
    const envApiKey = process.env[`${prefix}_ANTHROPIC_API_KEY`];
    const genericApiKey = process.env.ANTHROPIC_API_KEY;
    return {
      apiKey: fromFile.apiKey || envApiKey || genericApiKey,
    };
  }

  static getCerebrusConfig(): CerebrusConfig {
    const cfg = loadConfig();
    // Prefer the canonical `cerebras` key, fall back to legacy `cerebrus`
    const fromFile =
      cfg.providers?.cerebras ||
      cfg.providers?.cerebrus ||
      {};
    return {
      // Prefer new env vars, but keep old ones as fallback
      apiKey:
        fromFile.apiKey ||
        process.env.CEREBRAS_API_KEY ||
        process.env.CEREBRUS_API_KEY,
      endpoint:
        fromFile.endpoint ||
        process.env.CEREBRAS_ENDPOINT ||
        process.env.CEREBRUS_ENDPOINT ||
        // default endpoint remains the old URL for now
        'https://api.cerebrus.ai',
    };
  }
}


