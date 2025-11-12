import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Find which Gemini models actually work with the current API key
 */
async function findWorkingModels() {
  console.log("🔍 Finding working Gemini models...\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY not found");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Test all common Gemini model names
  const allPossibleModels = [
    // Gemini 2.x models (newest)
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-pro",

    // Gemini 1.5 models
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro-002",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro",

    // Gemini 1.0 models
    "gemini-1.0-pro",
    "gemini-1.0-pro-latest",
    "gemini-1.0-pro-001",

    // Legacy names
    "gemini-pro",
    "gemini-pro-vision",
  ];

  const workingModels: string[] = [];
  const failedModels: Array<{ name: string; error: string }> = [];

  console.log(`Testing ${allPossibleModels.length} possible model names...\n`);

  for (const modelName of allPossibleModels) {
    try {
      process.stdout.write(`Testing ${modelName.padEnd(30)} ... `);

      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hi");

      if (result.response.text()) {
        console.log("✅ WORKS");
        workingModels.push(modelName);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("503") || errorMsg.includes("overloaded")) {
        console.log("⚠️  EXISTS (but overloaded)");
        workingModels.push(modelName); // Still a valid model, just busy
      } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        console.log("❌ NOT FOUND");
      } else {
        console.log(`❌ ERROR: ${errorMsg.substring(0, 50)}`);
      }

      failedModels.push({ name: modelName, error: errorMsg.substring(0, 100) });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 RESULTS");
  console.log("=".repeat(60) + "\n");

  if (workingModels.length > 0) {
    console.log(`✅ Found ${workingModels.length} working models:\n`);
    workingModels.forEach((model, idx) => {
      console.log(`   ${idx + 1}. ${model}`);
    });
    console.log("\n💡 Update server/config/aiModels.ts to use these models!");
  } else {
    console.log("❌ No working models found!");
    console.log("\nThis could mean:");
    console.log("  1. API key is invalid");
    console.log("  2. API key doesn't have Gemini API enabled");
    console.log("  3. Billing is not set up");
  }

  console.log("\n");
}

findWorkingModels().catch(console.error);
