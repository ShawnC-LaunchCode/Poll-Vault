import { WebClient } from "@slack/web-api";
import fs from "fs";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const channel = process.env.SLACK_CHANNEL_ID;

export async function postSlackSummary() {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.error("⚠️ Missing Slack credentials");
    console.error("SLACK_BOT_TOKEN:", process.env.SLACK_BOT_TOKEN ? "✓ Set" : "✗ Missing");
    console.error("SLACK_CHANNEL_ID:", process.env.SLACK_CHANNEL_ID ? "✓ Set" : "✗ Missing");
    process.exit(1);
  }

  console.log("📤 Preparing Slack notification...");

  // Load Vitest JSON if available
  let vitestSummary = {};
  if (fs.existsSync("vitest-results.json")) {
    vitestSummary = JSON.parse(fs.readFileSync("vitest-results.json", "utf8"));
    console.log("✓ Loaded vitest-results.json");
  } else {
    console.log("ℹ️ No vitest-results.json found, using mock data");
  }

  const total = vitestSummary.numTotalTests || 0;
  const passed = vitestSummary.numPassedTests || 0;
  const failed = vitestSummary.numFailedTests || 0;
  const coverage = vitestSummary.coverage || "N/A";

  const buildStatus = failed > 0 ? "failed" : "passed";
  const color = buildStatus === "passed" ? "#10B981" : "#EF4444";
  const emoji = buildStatus === "passed" ? "✅" : "❌";

  const commit = process.env.GITHUB_SHA?.slice(0, 7) || "local";
  const actor = process.env.GITHUB_ACTOR || "local";
  const repo = process.env.GITHUB_REPOSITORY || "Poll-Vault";
  const runId = process.env.GITHUB_RUN_ID || "test";
  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const buildUrl = `${serverUrl}/${repo}/actions/runs/${runId}`;

  const headerText = `${emoji} Build ${buildStatus.toUpperCase()}`;

  console.log(`📬 Posting main message to channel ${channel}...`);

  try {
    const mainMessage = await slack.chat.postMessage({
      channel,
      text: `${headerText} – ${actor}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: headerText },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Commit:*\n${commit}` },
            { type: "mrkdwn", text: `*By:*\n${actor}` },
            { type: "mrkdwn", text: `*Tests Passed:*\n${passed}/${total}` },
            { type: "mrkdwn", text: `*Coverage:*\n${coverage}` },
          ],
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `<${buildUrl}|View Build Logs>` },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: "_AI Summary (coming soon)_ 🤖" },
        },
      ],
      attachments: [{ color }],
    });

    console.log("✅ Main message posted successfully");
    console.log(`   Message timestamp: ${mainMessage.ts}`);

    // Add reaction
    console.log("📌 Adding reaction...");
    await slack.reactions.add({
      name: buildStatus === "passed" ? "white_check_mark" : "x",
      channel,
      timestamp: mainMessage.ts,
    });
    console.log("✅ Reaction added");

    // Threaded Vitest summary
    if (Object.keys(vitestSummary).length) {
      console.log("🧵 Posting Vitest summary thread...");
      await slack.chat.postMessage({
        channel,
        thread_ts: mainMessage.ts,
        text: "🧪 *Vitest Summary*:\n```" + JSON.stringify(vitestSummary, null, 2) + "```",
      });
      console.log("✅ Vitest thread posted");
    }

    // Threaded coverage (if present)
    if (vitestSummary.coverageMap) {
      console.log("🧵 Posting coverage thread...");
      await slack.chat.postMessage({
        channel,
        thread_ts: mainMessage.ts,
        text: "📊 *Coverage Details*:\n```" +
          JSON.stringify(vitestSummary.coverageMap, null, 2) + "```",
      });
      console.log("✅ Coverage thread posted");
    }

    console.log("\n🎉 Slack notification complete!");
    console.log(`   View in Slack: https://slack.com/app_redirect?channel=${channel}`);
    return mainMessage.ts;
  } catch (error) {
    console.error("\n❌ Failed to post Slack message:");
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Details:", JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  postSlackSummary().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
