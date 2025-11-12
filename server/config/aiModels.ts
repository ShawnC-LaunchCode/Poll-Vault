/**
 * AI Model Configuration and Fallback Strategy
 *
 * This configuration defines multiple AI models in priority order.
 * If a model fails (deprecated, rate limited, etc.), the system
 * automatically falls back to the next available model.
 */

export interface AIModelConfig {
  name: string;
  displayName: string;
  provider: 'google' | 'openai' | 'anthropic';
  costTier: 'low' | 'medium' | 'high';
  capabilities: string[];
  deprecated?: boolean;
}

/**
 * Gemini model configurations in priority order
 * Models are tried in sequence until one succeeds
 */
export const GEMINI_MODELS: AIModelConfig[] = [
  {
    name: 'gemini-1.5-flash-latest',
    displayName: 'Gemini 1.5 Flash (Latest)',
    provider: 'google',
    costTier: 'low',
    capabilities: ['text-generation', 'json-mode', 'fast-response']
  },
  {
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    provider: 'google',
    costTier: 'low',
    capabilities: ['text-generation', 'json-mode', 'fast-response']
  },
  {
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'google',
    costTier: 'medium',
    capabilities: ['text-generation', 'json-mode', 'complex-reasoning']
  },
  {
    name: 'gemini-1.0-pro',
    displayName: 'Gemini 1.0 Pro',
    provider: 'google',
    costTier: 'medium',
    capabilities: ['text-generation', 'basic-reasoning']
  }
];

/**
 * Get the primary model to use (from env or default)
 */
export function getPrimaryGeminiModel(): string {
  return process.env.GEMINI_MODEL || GEMINI_MODELS[0].name;
}

/**
 * Get fallback models (excluding the primary)
 */
export function getFallbackGeminiModels(primaryModel: string): string[] {
  return GEMINI_MODELS
    .filter(m => !m.deprecated && m.name !== primaryModel)
    .map(m => m.name);
}

/**
 * Get all available models in priority order
 */
export function getAllGeminiModels(): string[] {
  return GEMINI_MODELS
    .filter(m => !m.deprecated)
    .map(m => m.name);
}

/**
 * Check if an error indicates we should try a fallback model
 */
export function shouldTryFallback(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  const fallbackIndicators = [
    'model not found',
    'model is deprecated',
    'invalid model',
    'model does not exist',
    'unsupported model',
    'model_not_found',
    'resource_exhausted', // Rate limiting
    'unavailable', // Service down
    '404', // Not found
    '429', // Rate limit
    '503' // Service unavailable
  ];

  return fallbackIndicators.some(indicator =>
    errorMessage.includes(indicator)
  );
}

/**
 * Parse model from error message if provided
 */
export function getRecommendedModelFromError(error: Error): string | null {
  // Some APIs suggest alternative models in error messages
  const modelMatch = error.message.match(/try ['"]([\w-]+)['"]/i);
  if (modelMatch) {
    return modelMatch[1];
  }
  return null;
}
