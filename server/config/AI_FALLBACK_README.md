# AI Model Fallback System

## Overview

The AI survey generation feature now includes a robust fallback mechanism that automatically tries multiple AI models if one fails. This prevents service disruptions when models are deprecated, rate-limited, or unavailable.

## How It Works

### Model Priority Chain

When generating surveys or analyzing data, the system tries models in this order:

1. **Primary Model**: `gemini-1.5-flash-latest` (default)
   - Fast, cost-efficient
   - Latest version with newest features

2. **First Fallback**: `gemini-1.5-flash`
   - Stable version
   - Slightly older but reliable

3. **Second Fallback**: `gemini-1.5-pro`
   - More capable, higher cost
   - Better for complex surveys

4. **Final Fallback**: `gemini-1.0-pro`
   - Oldest supported model
   - Last resort for availability

### Automatic Error Detection

The system automatically detects when to try a fallback model based on error types:

**Recoverable Errors** (trigger fallback):
- Model not found (404)
- Model deprecated
- Service unavailable (503)
- Rate limit exceeded (429)
- Resource exhausted

**Non-Recoverable Errors** (immediate failure):
- Invalid API key
- Authentication failed
- Invalid request format
- Missing required parameters

### Logging

All fallback attempts are logged to help with debugging:

```
[AI] Attempt 1/4: Trying model gemini-1.5-flash-latest
[AI] ✗ Model gemini-1.5-flash-latest failed: Model not found
[AI] Error is recoverable, trying next fallback model...
[AI] Attempt 2/4: Trying model gemini-1.5-flash
[AI] ✓ Success with model: gemini-1.5-flash
```

## Configuration

### Environment Variables

```bash
# Optional: Override the primary model
GEMINI_MODEL=gemini-1.5-flash

# Required: Your Gemini API key
GEMINI_API_KEY=your_api_key_here
```

### Custom Model Priority

To change the model priority, edit `server/config/aiModels.ts`:

```typescript
export const GEMINI_MODELS: AIModelConfig[] = [
  {
    name: 'your-preferred-model',
    displayName: 'Your Preferred Model',
    provider: 'google',
    costTier: 'low',
    capabilities: ['text-generation', 'json-mode']
  },
  // ... more fallbacks
];
```

## API Endpoint

Check AI service status and available models:

```bash
GET /api/ai/status

Response:
{
  "available": true,
  "primaryModel": "gemini-1.5-flash-latest",
  "fallbackModels": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"],
  "features": ["survey_generation", "survey_analysis", "sentiment_analysis"]
}
```

## Benefits

1. **Zero Downtime**: Service continues even if primary model fails
2. **Cost Optimization**: Uses cheapest models first, falls back to premium only when needed
3. **Future-Proof**: New models can be added without code changes
4. **Transparent**: All attempts logged for debugging
5. **Smart Retry**: Only retries on recoverable errors

## Migration from Previous Version

**Before**: Hard-coded to `gemini-2.5-flash` (which doesn't exist)
```typescript
model: "gemini-2.5-flash"  // ❌ Would fail with 500 error
```

**After**: Configurable with fallback
```typescript
model: getPrimaryGeminiModel()  // ✅ Uses gemini-1.5-flash-latest with fallbacks
```

No action required - the system automatically uses the correct models.

## Testing

Test the fallback mechanism:

```typescript
// In development, temporarily set an invalid primary model
process.env.GEMINI_MODEL = 'invalid-model';

// The system should automatically fall back to gemini-1.5-flash
// Check logs to verify fallback chain
```

## Monitoring

Watch for these patterns in production logs:

- **Successful First Attempt**: `✓ Success with model: gemini-1.5-flash-latest`
- **Successful Fallback**: Multiple `Attempt X/Y` messages with final success
- **Total Failure**: `All X models failed` (requires investigation)

If you see frequent fallbacks, consider:
1. Checking if primary model is deprecated
2. Verifying rate limits aren't exceeded
3. Updating to a newer primary model

## Troubleshooting

### All Models Failing

```
Error: AI service unavailable. All models failed.
```

**Solutions**:
1. Verify `GEMINI_API_KEY` is set correctly
2. Check API key has sufficient quota
3. Verify network connectivity to Gemini API
4. Check Google Cloud Console for service status

### Invalid API Key

```
Error: GEMINI_API_KEY not configured
```

**Solutions**:
1. Set `GEMINI_API_KEY` in environment variables
2. Restart the server after adding the key
3. Verify key is valid in Google Cloud Console

### Constant Fallbacks

If primary model always fails:

1. Update primary model in environment:
   ```bash
   GEMINI_MODEL=gemini-1.5-flash
   ```

2. Or update default in `server/config/aiModels.ts`

## Future Enhancements

Potential improvements:
- Multi-provider fallback (Gemini → OpenAI → Anthropic)
- Circuit breaker pattern to skip known-bad models
- Metrics tracking for model success rates
- Automatic model selection based on survey complexity
- Cost tracking and optimization
