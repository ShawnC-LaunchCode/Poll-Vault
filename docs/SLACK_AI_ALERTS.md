# Slack Alerts for AI Model Failures

## Overview

The AI fallback system automatically sends comprehensive Slack notifications when:
1. **Primary model fails** but a fallback succeeds (⚠️ WARNING)
2. **All models fail** and service is unavailable (🚨 CRITICAL)

These notifications include all diagnostic data you need to quickly identify and resolve issues.

---

## Setup

### 1. Configure Slack Bot (One-Time Setup)

Follow the detailed instructions in [SLACK_BOT_SETUP.md](./SLACK_BOT_SETUP.md) to:
- Create a Slack app
- Add required scopes
- Install to your workspace
- Get your bot token

### 2. Add Environment Variables

Add these to your production environment:

```bash
# Required for Slack notifications
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C07XXXXXXXXX

# Optional: Your Slack user ID for @mentions
SLACK_USER_ID=U07XXXXXXXXX
```

**How to get your Slack User ID:**
1. Open Slack in browser
2. Click your profile → **View full profile**
3. Click **⋮ More** → **Copy member ID**

### 3. Deploy

Notifications are automatically enabled when `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are set.

---

## Notification Types

### ⚠️ WARNING: Primary Model Failed, Fallback Succeeded

**Triggered when:** Primary AI model fails but a fallback model works

**Severity:** Warning (🟡)

**What you get:**
```
⚠️ FALLBACK TRIGGERED @your-username

Severity: WARNING
Environment: production
Endpoint: /api/ai/generate
Timestamp: 2025-11-12T18:30:00.000Z

🎯 Primary Model: gemini-1.5-flash-latest
   ❌ Failed

✅ Successful Fallback: gemini-1.5-flash
   Service continued without interruption

🔄 Attempted Models (2):
1. gemini-1.5-flash-latest
2. gemini-1.5-flash

📋 Action Items:
1. Review error logs below
2. Check if primary model is deprecated
3. Consider updating GEMINI_MODEL env variable
4. Monitor for repeated fallbacks

---
Thread includes:
- 🔍 Error Details (full error messages for each attempt)
- 📦 Request Context (sanitized request data)
- 🔗 Useful Links (documentation, config, Google Console)
```

### 🚨 CRITICAL: All Models Failed

**Triggered when:** All AI models fail, service unavailable

**Severity:** Critical (🔴)

**What you get:**
```
🚨 COMPLETE FAILURE @your-username

Severity: CRITICAL
Environment: production
Endpoint: /api/ai/generate
Timestamp: 2025-11-12T18:30:00.000Z

🎯 Primary Model: gemini-1.5-flash-latest
   ❌ Failed

🚨 All 4 Models Failed
   Service is unavailable - immediate action required

🔄 Attempted Models (4):
1. gemini-1.5-flash-latest
2. gemini-1.5-flash
3. gemini-1.5-pro
4. gemini-1.0-pro

📋 Action Items:
1. ⚠️ IMMEDIATE: Check GEMINI_API_KEY validity
2. ⚠️ Verify Google Cloud Console for quota/service status
3. ⚠️ Check server logs for detailed error stack
4. ⚠️ Consider enabling fallback providers (OpenAI/Anthropic)

---
Thread includes:
- 🔍 Error Details (all 4 failure messages)
- 📦 Request Context
- 🔗 Useful Links
```

---

## Notification Content Details

### Header Block
- Emoji indicator (⚠️ warning or 🚨 critical)
- Status (FALLBACK TRIGGERED or COMPLETE FAILURE)
- User mention (if `SLACK_USER_ID` configured)

### Main Message Fields

| Field | Description |
|-------|-------------|
| **Severity** | WARNING or CRITICAL |
| **Environment** | production, development, or staging |
| **Endpoint** | Which API endpoint triggered the failure |
| **Timestamp** | ISO 8601 timestamp of the failure |
| **Primary Model** | The model that was supposed to work |
| **Successful Fallback** | Which fallback saved the day (if any) |
| **Attempted Models** | Full list of all models tried |

### Threaded Details

**🔍 Error Details Thread:**
```
Attempt 1 - gemini-1.5-flash-latest:
```
[GoogleGenerativeAI Error]: The model `gemini-1.5-flash-latest` does not exist.
```

Attempt 2 - gemini-1.5-flash:
```
[GoogleGenerativeAI Error]: Rate limit exceeded for quota group...
```
```

**📦 Request Context Thread:**
```json
{
  "topic": "Customer satisfaction survey",
  "endpoint": "/api/ai/generate"
}
```

**🔗 Useful Links Thread:**
- Fallback Documentation
- Model Configuration File
- Google Cloud Console

---

## Testing

### Test Slack Integration

```bash
# Run test notification
curl -X POST http://localhost:5000/api/test/slack-notification \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or add a test endpoint to your routes:

```typescript
// server/routes/test.routes.ts
app.post('/api/test/slack-notification', isAuthenticated, async (req, res) => {
  const success = await slackNotificationService.sendTestNotification();
  res.json({ success });
});
```

### Trigger a Real Fallback (Development)

```bash
# Set invalid primary model to force fallback
export GEMINI_MODEL=invalid-model-name

# Restart server
npm run dev

# Make AI request
curl -X POST http://localhost:5000/api/ai/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Test survey"}'
```

You should receive a Slack notification showing the fallback!

---

## Production Monitoring

### What to Watch For

1. **Occasional Fallbacks** (⚠️)
   - **Normal:** 1-2 per week
   - **Action:** Review error patterns monthly
   - **Indicates:** Temporary API issues or rate limits

2. **Frequent Fallbacks** (⚠️⚠️)
   - **Concerning:** 5+ per day
   - **Action:** Investigate immediately
   - **Indicates:** Primary model may be deprecated or unstable

3. **Complete Failures** (🚨)
   - **Critical:** ANY occurrence
   - **Action:** Drop everything and investigate
   - **Indicates:** API key issue, quota exceeded, or service outage

### Response Checklist

**For Warnings (Fallback Succeeded):**
- [ ] Review error message in Slack thread
- [ ] Check Google Cloud Console for model status
- [ ] Search for deprecation announcements
- [ ] Update `GEMINI_MODEL` if needed
- [ ] Monitor for 24 hours

**For Critical (All Failed):**
- [ ] Verify `GEMINI_API_KEY` in production env
- [ ] Check Google Cloud Console quota/billing
- [ ] Review server logs for full stack traces
- [ ] Check Google Status Dashboard: https://status.cloud.google.com/
- [ ] Escalate to on-call if service is down
- [ ] Consider temporary manual survey creation

---

## Customization

### Change Notification Channel

Update `SLACK_CHANNEL_ID` to send to a different channel:
```bash
SLACK_CHANNEL_ID=C08NEWALERTS  # Your monitoring channel
```

### Remove User Mentions

Omit `SLACK_USER_ID` to skip @mentions:
```bash
# Don't set SLACK_USER_ID
```

### Disable Notifications

Remove or comment out Slack credentials:
```bash
# SLACK_BOT_TOKEN=...  # Commented out
# SLACK_CHANNEL_ID=... # Commented out
```

Service will log locally but not send Slack messages.

### Custom Message Format

Edit `server/services/SlackNotificationService.ts`:
- Modify `notifyAIModelFailure()` method
- Adjust blocks, colors, or action items
- See [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)

---

## Troubleshooting

### Not receiving notifications

**Check:**
1. `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` set in production
2. Bot invited to channel (if private)
3. Bot has `chat:write` and `chat:write.public` scopes
4. Server logs show `[Slack] Service initialized successfully`

### Receiving too many notifications

**Options:**
1. Adjust notification threshold in code
2. Create separate channel for AI alerts
3. Implement rate limiting (1 notification per hour)
4. Add quiet hours (no notifications 10pm-8am)

### Error: `not_in_channel`

**Solution:** Invite bot to the channel
```
/invite @Poll-Vault CI/CD
```

### Error: `invalid_auth`

**Solution:** Regenerate bot token:
1. Slack App Settings → OAuth & Permissions
2. Reinstall to Workspace
3. Copy new token
4. Update production env

---

## Privacy & Security

### What Data is Sent to Slack

**Included:**
- ✅ Model names
- ✅ Error messages
- ✅ Timestamps
- ✅ Environment name
- ✅ API endpoint path
- ✅ Request metadata (topic, survey ID, etc.)

**Excluded:**
- ❌ API keys
- ❌ Database credentials
- ❌ User passwords
- ❌ Full survey content
- ❌ Personal user data

### Sanitization

Request context is automatically sanitized:
- Limited to 500 characters
- No sensitive environment variables
- No authentication tokens

---

## Cost Considerations

### Slack API Calls

**Per Failure Event:**
- 1 main message
- 3 threaded messages (errors, context, links)
- 1 reaction (optional)

**Total:** ~5 API calls per failure

**Free Tier:** 100+ notifications/day easily within free Slack limits

### Recommended Setup

- **Development:** Disable or use test channel
- **Staging:** Enable with separate channel
- **Production:** Enable with alerts channel + user mentions

---

## Examples

### Example 1: Model Deprecated

```
⚠️ FALLBACK TRIGGERED @shawn

Primary Model: gemini-2.5-flash
❌ Failed: Model does not exist

✅ Successful Fallback: gemini-1.5-flash-latest

Action: Update GEMINI_MODEL=gemini-1.5-flash-latest
```

### Example 2: Rate Limit

```
⚠️ FALLBACK TRIGGERED @shawn

Primary Model: gemini-1.5-flash-latest
❌ Failed: Resource exhausted - quota exceeded

✅ Successful Fallback: gemini-1.5-pro

Action: Review quota limits in Google Cloud Console
```

### Example 3: Complete Outage

```
🚨 COMPLETE FAILURE @shawn

All 4 Models Failed

Most common error: INTERNAL - Service temporarily unavailable

Action: Check Google Cloud Status Dashboard
Status: https://status.cloud.google.com/
```

---

## Integration with Monitoring

### PagerDuty

Forward critical alerts to PagerDuty:
```typescript
// In SlackNotificationService
if (!data.successfulModel) {
  // All models failed - trigger PagerDuty
  await pagerDutyService.triggerAlert({
    severity: 'critical',
    summary: 'AI service completely unavailable',
    details: data
  });
}
```

### Datadog

Log all fallback events:
```typescript
import { datadogLogger } from './datadog';

datadogLogger.warn('ai_model_fallback', {
  primary_model: data.primaryModel,
  successful_model: data.successfulModel,
  total_attempts: data.totalAttempts
});
```

### Prometheus Metrics

Track fallback rates:
```typescript
aiModelFallbackCounter.inc({
  primary_model: data.primaryModel,
  successful_model: data.successfulModel || 'none',
  environment: data.environment
});
```

---

## FAQ

**Q: Will failures be silently swallowed?**
A: No. Errors are logged to console AND sent to Slack. If Slack fails, errors still appear in server logs.

**Q: What if I don't configure Slack?**
A: Service works normally, just no Slack notifications. All errors still logged locally.

**Q: Can I mention multiple people?**
A: Yes! Set `SLACK_USER_ID` to comma-separated list and modify the service.

**Q: Can I send to multiple channels?**
A: Set `SLACK_CHANNEL_ID` to comma-separated list and update the service code.

**Q: How do I test without triggering real failures?**
A: Use the test endpoint or temporarily set `GEMINI_MODEL=invalid-test-model` in development.

---

## References

- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [Slack Web API Docs](https://api.slack.com/docs)
- [Google Gemini Status](https://status.cloud.google.com/)
- [AI Fallback Documentation](../server/config/AI_FALLBACK_README.md)

---

**Version:** 1.0
**Last Updated:** 2025-11-12
**Maintained by:** Poll-Vault DevOps Team
