# Slack Notification Diagnostic Guide

## Issue: No Slack notifications received after deployment

### Most Common Causes:

1. **Missing SLACK_WEBHOOK_URL Secret**
   - Go to: https://github.com/ShawnC-LaunchCode/Poll-Vault/settings/secrets/actions
   - Verify `SLACK_WEBHOOK_URL` exists
   - If missing, create it with your Slack webhook URL

2. **Workflow Job Failed Silently**
   - Check logs: https://github.com/ShawnC-LaunchCode/Poll-Vault/actions
   - Look for "Slack Notification" job
   - Check if it ran and if there were errors

3. **JSON Artifact Issues**
   - The new JSON parsing expects `vitest-summary.json` and `playwright-summary.json`
   - If these don't exist, the parsing might fail gracefully but variables will be 0

### Quick Diagnostic Steps:

1. **Verify GitHub Secrets:**
   ```bash
   # You need to check in GitHub UI:
   # Settings → Secrets and variables → Actions
   # Ensure SLACK_WEBHOOK_URL is set
   ```

2. **Check Recent Workflow Run:**
   - Visit: https://github.com/ShawnC-LaunchCode/Poll-Vault/actions
   - Click the most recent "Test and Deploy" workflow
   - Look for the "Slack Notification" job
   - Check for error messages

3. **Test Slack Webhook Manually:**
   ```bash
   # Set your webhook URL and run:
   SLACK_WEBHOOK_URL="your-webhook-url" bash test-slack-notification.sh
   ```

### Potential Issues with New Changes:

The recent update added JSON parsing that might fail if:
- Vitest doesn't generate proper JSON output
- Playwright JSON format is different than expected
- `jq` command fails silently

### Fallback Options:

If JSON parsing is causing issues, the variables will default to 0, but the notification should still send.

Check the workflow logs for these specific errors:
- "jq: command not found"
- "parse error: Invalid numeric literal"
- "Download artifact failed"
