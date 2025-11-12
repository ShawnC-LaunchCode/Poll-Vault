import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Test the actual models configured in aiModels.ts
 */
async function testCurrentModels() {
  console.log("🧪 Testing models configured in aiModels.ts...\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY not found");
    process.exit(1);
  }

  console.log("✓ API key found");
  console.log(`  Key: ${apiKey.substring(0, 15)}...\n`);

  const genAI = new GoogleGenerativeAI(apiKey);

  // These are the models from server/config/aiModels.ts
  const modelsToTest = [
    "gemini-1.5-flash-latest",  // Primary
    "gemini-1.5-flash",          // First fallback
    "gemini-1.5-pro",            // Second fallback
    "gemini-1.0-pro"             // Final fallback
  ];

  console.log("Testing models in priority order:\n");

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Say hello in 3 words" }] }],
      });

      const response = result.response.text();
      console.log(`  ✅ SUCCESS - Response: "${response.trim()}"`);
      console.log();
    } catch (error) {
      console.log(`  ❌ FAILED`);
      if (error instanceof Error) {
        console.log(`     Error: ${error.message}`);
      }
      console.log();
    }
  }

  console.log("\n🔍 Testing survey generation prompt...\n");

  // Try with the first working model
  for (const modelName of modelsToTest) {
    try {
      console.log(`Trying survey generation with: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `Generate a simple survey about customer satisfaction. Return valid JSON in this format:
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

Return JSON only, no markdown.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      console.log(`  ✅ SUCCESS`);
      console.log(`  Response length: ${response.length} characters`);
      console.log(`  First 200 chars: ${response.substring(0, 200)}...`);
      console.log();

      // Try to parse as JSON
      try {
        const cleaned = response.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        console.log(`  ✅ Valid JSON structure`);
        console.log(`     Title: ${parsed.title}`);
        console.log(`     Pages: ${parsed.pages?.length || 0}`);
      } catch (e) {
        console.log(`  ⚠️  Could not parse as JSON`);
      }

      break; // Stop after first success

    } catch (error) {
      console.log(`  ❌ FAILED`);
      if (error instanceof Error) {
        console.log(`     Error: ${error.message}`);
      }
      console.log();
    }
  }
}

testCurrentModels().catch(console.error);
