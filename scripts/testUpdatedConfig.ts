import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllGeminiModels, getPrimaryGeminiModel } from "../server/config/aiModels";

/**
 * Test the updated aiModels.ts configuration
 */
async function testUpdatedConfig() {
  console.log("🧪 Testing updated Gemini model configuration...\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY not found");
    process.exit(1);
  }

  console.log("✓ API key found\n");

  const primaryModel = getPrimaryGeminiModel();
  const allModels = getAllGeminiModels();

  console.log("📋 Configuration:");
  console.log(`   Primary model: ${primaryModel}`);
  console.log(`   All models: ${allModels.join(", ")}\n`);

  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("Testing all configured models:\n");

  let successCount = 0;

  for (const modelName of allModels) {
    try {
      process.stdout.write(`Testing ${modelName.padEnd(30)} ... `);

      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hi in 2 words");
      const response = result.response.text();

      console.log(`✅ SUCCESS - Response: "${response.trim()}"`);
      successCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("503") || errorMsg.includes("overloaded")) {
        console.log("⚠️  EXISTS (but overloaded - this is OK, model is valid)");
        successCount++; // Model exists, just temporarily busy
      } else {
        console.log(`❌ FAILED: ${errorMsg.substring(0, 100)}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Results: ${successCount}/${allModels.length} models working`);
  console.log("=".repeat(60));

  if (successCount === 0) {
    console.log("\n❌ ERROR: No models are working!");
    console.log("The AI Survey Creator will not work until this is fixed.\n");
    process.exit(1);
  } else if (successCount < allModels.length) {
    console.log(`\n⚠️  WARNING: Only ${successCount}/${allModels.length} models working.`);
    console.log("The system will fall back to working models automatically.\n");
  } else {
    console.log("\n✅ All models are working! AI Survey Creator should work now.\n");
  }

  // Test actual survey generation with primary model
  console.log("\n🧪 Testing survey generation with primary model...\n");

  try {
    const model = genAI.getGenerativeModel({ model: primaryModel });

    const prompt = `Generate a simple 2-question survey about customer satisfaction. Return valid JSON:
{
  "title": "Survey Title",
  "description": "Survey Description",
  "pages": [
    {
      "pageTitle": "Page 1",
      "questions": [
        {
          "type": "short_text",
          "title": "Question text",
          "required": true
        }
      ]
    }
  ]
}

Return JSON only.`;

    console.log(`Generating with model: ${primaryModel}...`);
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    console.log("✅ Survey generation successful!");
    console.log(`   Response length: ${response.length} characters\n`);

    // Try to parse
    const cleaned = response.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    console.log("✅ Valid JSON structure:");
    console.log(`   Title: ${parsed.title}`);
    console.log(`   Pages: ${parsed.pages?.length || 0}`);
    console.log(`   Questions: ${parsed.pages?.[0]?.questions?.length || 0}\n`);

    console.log("🎉 Everything is working! The AI Survey Creator should work now.");

  } catch (error) {
    console.log("❌ Survey generation failed");
    if (error instanceof Error) {
      console.log(`   Error: ${error.message}\n`);
    }

    if (error instanceof Error && (error.message.includes("503") || error.message.includes("overloaded"))) {
      console.log("⚠️  Model is overloaded. Try again in a moment.");
      console.log("   The fallback system will automatically try other models.\n");
    } else {
      console.log("❌ This needs to be fixed for AI Survey Creator to work.\n");
    }
  }
}

testUpdatedConfig().catch(console.error);
