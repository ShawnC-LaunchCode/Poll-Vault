import { WebClient } from "@slack/web-api";

/**
 * Slack Notification Service for Production Runtime Alerts
 *
 * This service sends real-time notifications to Slack when critical
 * events occur in production, such as AI model failures.
 */
export class SlackNotificationService {
  private slack: WebClient | null = null;
  private channel: string | null = null;
  private userMention: string | null = null;
  private isEnabled: boolean = false;

  constructor() {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;
    const userId = process.env.SLACK_USER_ID; // Optional: Slack user ID for @mentions

    if (botToken && channelId) {
      this.slack = new WebClient(botToken);
      this.channel = channelId;
      this.userMention = userId ? `<@${userId}>` : null;
      this.isEnabled = true;
      console.log('[Slack] Service initialized successfully');
    } else {
      console.log('[Slack] Service disabled - missing credentials');
      console.log(`  SLACK_BOT_TOKEN: ${botToken ? '✓' : '✗'}`);
      console.log(`  SLACK_CHANNEL_ID: ${channelId ? '✓' : '✗'}`);
    }
  }

  /**
   * Check if Slack notifications are enabled
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Send AI model failure alert
   * Includes comprehensive diagnostic information
   */
  async notifyAIModelFailure(data: {
    primaryModel: string;
    successfulModel: string | null;
    attemptedModels: string[];
    totalAttempts: number;
    errors: Array<{ model: string; error: string }>;
    timestamp: Date;
    environment: string;
    endpoint: string;
    requestData?: any;
  }): Promise<void> {
    if (!this.isEnabled || !this.slack || !this.channel) {
      return; // Silently skip if not configured
    }

    try {
      const emoji = data.successfulModel ? "⚠️" : "🚨";
      const status = data.successfulModel ? "FALLBACK TRIGGERED" : "COMPLETE FAILURE";
      const severity = data.successfulModel ? "WARNING" : "CRITICAL";

      // Build header with user mention
      const headerText = this.userMention
        ? `${emoji} ${status} - AI Model Failure ${this.userMention}`
        : `${emoji} ${status} - AI Model Failure`;

      // Build error details
      let errorDetails = "";
      data.errors.forEach(({ model, error }, index) => {
        errorDetails += `*Attempt ${index + 1}* - \`${model}\`:\n`;
        errorDetails += `\`\`\`${error.substring(0, 200)}${error.length > 200 ? '...' : ''}\`\`\`\n`;
      });

      // Build request context (sanitized)
      let requestContext = "N/A";
      if (data.requestData) {
        try {
          const sanitized = JSON.stringify(data.requestData, null, 2)
            .substring(0, 500);
          requestContext = `\`\`\`json\n${sanitized}${sanitized.length >= 500 ? '\n...' : ''}\n\`\`\``;
        } catch (e) {
          requestContext = "Unable to serialize";
        }
      }

      // Determine color
      const color = data.successfulModel ? "#F59E0B" : "#EF4444"; // amber or red

      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${status}`,
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Severity:*\n${severity}`
            },
            {
              type: "mrkdwn",
              text: `*Environment:*\n${data.environment}`
            },
            {
              type: "mrkdwn",
              text: `*Endpoint:*\n\`${data.endpoint}\``
            },
            {
              type: "mrkdwn",
              text: `*Timestamp:*\n${data.timestamp.toISOString()}`
            }
          ]
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🎯 Primary Model:* \`${data.primaryModel}\`\n*❌ Failed*`
          }
        }
      ];

      // Add successful fallback info if applicable
      if (data.successfulModel) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*✅ Successful Fallback:* \`${data.successfulModel}\`\n_Service continued without interruption_`
          }
        });
      } else {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🚨 All ${data.totalAttempts} Models Failed*\n_Service is unavailable - immediate action required_`
          }
        });
      }

      // Add attempted models
      blocks.push(
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🔄 Attempted Models (${data.attemptedModels.length}):*\n${data.attemptedModels.map((m, i) => `${i + 1}. \`${m}\``).join('\n')}`
          }
        }
      );

      // Add action items
      const actionItems = data.successfulModel
        ? [
            "1. Review error logs below",
            "2. Check if primary model is deprecated",
            "3. Consider updating GEMINI_MODEL env variable",
            "4. Monitor for repeated fallbacks"
          ]
        : [
            "1. ⚠️ **IMMEDIATE:** Check GEMINI_API_KEY validity",
            "2. ⚠️ Verify Google Cloud Console for quota/service status",
            "3. ⚠️ Check server logs for detailed error stack",
            "4. ⚠️ Consider enabling fallback providers (OpenAI/Anthropic)"
          ];

      blocks.push(
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📋 Action Items:*\n${actionItems.join('\n')}`
          }
        }
      );

      // Post main message
      const mainMessage = await this.slack.chat.postMessage({
        channel: this.channel,
        text: headerText, // Fallback text for notifications
        blocks,
        attachments: [{ color }]
      });

      console.log('[Slack] AI failure notification sent successfully');

      // Post error details in thread
      if (mainMessage.ts) {
        await this.slack.chat.postMessage({
          channel: this.channel,
          thread_ts: mainMessage.ts,
          text: `*🔍 Error Details:*\n\n${errorDetails}`
        });

        // Post request context in thread
        await this.slack.chat.postMessage({
          channel: this.channel,
          thread_ts: mainMessage.ts,
          text: `*📦 Request Context:*\n${requestContext}`
        });

        // Add relevant links
        const links = [
          "📚 <https://github.com/ShawnC-LaunchCode/Poll-Vault/blob/main/server/config/AI_FALLBACK_README.md|Fallback Documentation>",
          "🔧 <https://github.com/ShawnC-LaunchCode/Poll-Vault/blob/main/server/config/aiModels.ts|Model Configuration>",
          "📊 <https://console.cloud.google.com/|Google Cloud Console>"
        ];

        await this.slack.chat.postMessage({
          channel: this.channel,
          thread_ts: mainMessage.ts,
          text: `*🔗 Useful Links:*\n${links.join('\n')}`
        });
      }

      // Add reaction
      if (mainMessage.ts) {
        try {
          const reactionName = data.successfulModel ? "warning" : "rotating_light";
          await this.slack.reactions.add({
            name: reactionName,
            channel: this.channel,
            timestamp: mainMessage.ts
          });
        } catch (e) {
          // Ignore reaction errors (missing scope)
        }
      }

    } catch (error) {
      console.error('[Slack] Failed to send notification:', error);
      // Don't throw - we don't want to break the app if Slack fails
    }
  }

  /**
   * Send AI model recovery notification
   * Notifies when primary model is working again
   */
  async notifyAIModelRecovery(data: {
    model: string;
    timestamp: Date;
    environment: string;
  }): Promise<void> {
    if (!this.isEnabled || !this.slack || !this.channel) {
      return;
    }

    try {
      const message = this.userMention
        ? `✅ *AI Model Recovered* ${this.userMention}\n\nModel \`${data.model}\` is working normally again.`
        : `✅ *AI Model Recovered*\n\nModel \`${data.model}\` is working normally again.`;

      await this.slack.chat.postMessage({
        channel: this.channel,
        text: message,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Environment: ${data.environment} | ${data.timestamp.toISOString()}`
              }
            ]
          }
        ],
        attachments: [{ color: "#10B981" }]
      });

      console.log('[Slack] AI recovery notification sent');
    } catch (error) {
      console.error('[Slack] Failed to send recovery notification:', error);
    }
  }

  /**
   * Test notification - verify Slack integration is working
   */
  async sendTestNotification(): Promise<boolean> {
    if (!this.isEnabled || !this.slack || !this.channel) {
      console.error('[Slack] Cannot send test - service not configured');
      return false;
    }

    try {
      const message = this.userMention
        ? `🧪 *Test Notification* ${this.userMention}\n\nSlack integration is working correctly!`
        : `🧪 *Test Notification*\n\nSlack integration is working correctly!`;

      await this.slack.chat.postMessage({
        channel: this.channel,
        text: message
      });

      console.log('[Slack] Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('[Slack] Test notification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const slackNotificationService = new SlackNotificationService();
