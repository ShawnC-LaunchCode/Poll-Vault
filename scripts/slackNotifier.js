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
  let vitestTotal = 0, vitestPassed = 0, vitestFailed = 0, vitestSkipped = 0;

  if (fs.existsSync("vitest-summary.json")) {
    vitestSummary = JSON.parse(fs.readFileSync("vitest-summary.json", "utf8"));
    vitestTotal = vitestSummary.numTotalTests || 0;
    vitestPassed = vitestSummary.numPassedTests || 0;
    vitestFailed = vitestSummary.numFailedTests || 0;
    vitestSkipped = vitestSummary.numPendingTests || 0;
    console.log(`✓ Loaded vitest-summary.json: ${vitestPassed}/${vitestTotal} passed`);
  } else {
    console.log("ℹ️ No vitest-summary.json found");
  }

  // Load Playwright JSON if available
  let playwrightTotal = 0, playwrightPassed = 0, playwrightFailed = 0, playwrightSkipped = 0;

  if (fs.existsSync("playwright-summary.json")) {
    const playwrightSummary = JSON.parse(fs.readFileSync("playwright-summary.json", "utf8"));
    console.log(`📊 Playwright JSON structure: ${JSON.stringify({
      hasSuites: !!playwrightSummary.suites,
      suitesCount: playwrightSummary.suites?.length || 0
    })}`);

    // Parse Playwright format
    if (playwrightSummary.suites && playwrightSummary.suites.length > 0) {
      const allTests = [];
      playwrightSummary.suites.forEach(suite => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            if (spec.tests) {
              allTests.push(...spec.tests);
            }
          });
        }
      });
      playwrightTotal = allTests.length;
      playwrightPassed = allTests.filter(t => t.status === "expected" || t.status === "passed").length;
      playwrightFailed = allTests.filter(t => t.status === "unexpected" || t.status === "failed").length;
      playwrightSkipped = allTests.filter(t => t.status === "skipped").length;
      console.log(`✓ Loaded playwright-summary.json: ${playwrightPassed}/${playwrightTotal} passed (${playwrightFailed} failed, ${playwrightSkipped} skipped)`);
    } else {
      console.log("ℹ️ Playwright summary has no test suites");
    }
  } else {
    console.log("ℹ️ No playwright-summary.json found");
  }

  // Load coverage from text summary
  let coverage = "N/A";
  if (fs.existsSync("coverage-summary.txt")) {
    const coverageText = fs.readFileSync("coverage-summary.txt", "utf8");
    const match = coverageText.match(/(\d+\.\d+)%/);
    if (match) {
      coverage = `${match[1]}%`;
      console.log(`✓ Loaded coverage: ${coverage}`);
    }
  } else {
    console.log("ℹ️ No coverage-summary.txt found");
  }

  // Calculate totals
  const total = vitestTotal + playwrightTotal;
  const passed = vitestPassed + playwrightPassed;
  const failed = vitestFailed + playwrightFailed;

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
            { type: "mrkdwn", text: `*Coverage:*\n${coverage}` },
            { type: "mrkdwn", text: `*Total Tests:*\n${passed}/${total} passed` },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: "🧪 *Test Results*" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Vitest (Unit/Integration):*\n${vitestPassed}/${vitestTotal} passed${vitestFailed > 0 ? ` (${vitestFailed} failed)` : ''}` },
            { type: "mrkdwn", text: `*Playwright (E2E):*\n${playwrightPassed}/${playwrightTotal} passed${playwrightFailed > 0 ? ` (${playwrightFailed} failed)` : ''}` },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `<${buildUrl}|View Build Logs>` },
          ],
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

    // Add reaction (optional - requires reactions:write scope)
    try {
      console.log("📌 Adding reaction...");
      await slack.reactions.add({
        name: buildStatus === "passed" ? "white_check_mark" : "x",
        channel,
        timestamp: mainMessage.ts,
      });
      console.log("✅ Reaction added");
    } catch (reactionError) {
      console.log("⚠️ Could not add reaction (missing reactions:write scope)");
      console.log("   The notification was posted successfully without reaction");
    }

    // Threaded failed tests if any
    if (failed > 0 && fs.existsSync("failed-tests.txt")) {
      console.log("🧵 Posting failed tests thread...");
      const failedTests = fs.readFileSync("failed-tests.txt", "utf8");
      await slack.chat.postMessage({
        channel,
        thread_ts: mainMessage.ts,
        text: `🚨 *Test Failures (${failed}):*\n\`\`\`\n${failedTests.slice(0, 2000)}\n\`\`\``,
      });
      console.log("✅ Failed tests thread posted");
    }

    // Threaded detailed test summary
    if (vitestTotal > 0 || playwrightTotal > 0) {
      console.log("🧵 Posting detailed test summary thread...");
      let summaryText = "📊 *Detailed Test Summary*\n\n";

      if (vitestTotal > 0) {
        summaryText += `*Vitest (Unit & Integration):*\n`;
        summaryText += `• Total: ${vitestTotal}\n`;
        summaryText += `• Passed: ${vitestPassed}\n`;
        summaryText += `• Failed: ${vitestFailed}\n`;
        summaryText += `• Skipped: ${vitestSkipped}\n\n`;
      }

      if (playwrightTotal > 0) {
        summaryText += `*Playwright (E2E):*\n`;
        summaryText += `• Total: ${playwrightTotal}\n`;
        summaryText += `• Passed: ${playwrightPassed}\n`;
        summaryText += `• Failed: ${playwrightFailed}\n`;
        summaryText += `• Skipped: ${playwrightSkipped}\n`;
      }

      await slack.chat.postMessage({
        channel,
        thread_ts: mainMessage.ts,
        text: summaryText,
      });
      console.log("✅ Detailed summary thread posted");
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
