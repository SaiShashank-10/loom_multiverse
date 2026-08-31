import { PlanningAgent } from "./planning-agent.js";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("planning-test-runner");

async function run() {
  const agent = new PlanningAgent();
  
  const projectId = crypto.randomUUID();
  
  // Mock validated idea from Idea Check Agent
  const mockIdeaContext = {
    isValid: true,
    coreProblem: "Road trip groups struggle with planning multi-city routes and splitting expenses without a centralized tool.",
    targetAudience: "Groups of 8 people planning multi-day road trips",
    coreFeatures: [
      "Map routes across multiple cities",
      "Integrate accommodation recommendations",
      "Store digital e-Pass documents offline",
      "Split group expenses via UPI integrations"
    ],
    techStackHints: [
      "Geospatial mapping API",
      "Accommodation API integration",
      "Offline storage (IndexedDB/SQLite)",
      "UPI payment gateway"
    ]
  };

  log.info("Starting Planning Agent Test");

  try {
    const result = await (agent as any).execute({
      projectId,
      founderPrompt: "Mock prompt",
      previousResults: {},
      feedAlerts: [],
      payload: {
        validatedIdea: mockIdeaContext
      }
    } as any, null as any);

    log.info("Planning Agent Finished Successfully");
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    log.error({ error }, "Planning Agent Failed");
  }
}

run();
