process.env.DATABASE_URL = "postgresql://loom:loom_secret@127.0.0.1:5432/loom_multiverse";
process.env.REDIS_URL = "redis://localhost:6379";
import { createTier1LLM, embedText } from "./index.js";

async function run() {
  console.log("Testing LLM Provider Layer...");
  try {
    const llm = createTier1LLM();
    console.log("Asking Ollama: 'What is 2 + 2?'");
    const result = await llm.invoke("What is 2 + 2? Reply with just the number.");
    console.log(`Response: ${result.content}`);

    console.log("\nTesting Embedding Provider...");
    const embedding = await embedText("Hello world");
    console.log(`Embedding generated with ${embedding.length} dimensions.`);

    console.log("\n✅ LLM Provider Layer is fully functional.");
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

run();
