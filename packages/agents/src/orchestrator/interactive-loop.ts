/**
 * @loom/agents — Interactive Loop
 *
 * Reusable autonomous conversation loop for human-in-the-loop interactions.
 * Any agent can use this to chat with the user until mutual approval is reached.
 *
 * Supports two modes:
 * - CLI Mode: Uses readline to read user input from terminal (for test-runner.ts)
 * - API Mode: Waits for WebSocket messages via callback (for production API)
 */

import { createLogger } from "@loom/shared/logger";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ChatMessage } from "../agents/types.js";
import { createTier1LLM } from "../llm/index.js";
import { extractAndParseJson } from "../llm/json-parser.js";

const log = createLogger("orchestrator:interactive-loop");

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface InteractiveLoopConfig {
  /** Name of the agent running this loop */
  agentName: string;
  /** Phase identifier (e.g., "idea_check") */
  phase: string;
  /** Project ID for context tracking */
  projectId: string;
  /** System prompt that defines the agent's conversational personality */
  systemPrompt: string;
  /** The initial message from the agent to present to the user */
  initialAgentMessage: string;
  /** Callback for sending messages to the user (WebSocket/CLI display) */
  onMessage?: (event: string, data: unknown) => void;
  /** Callback for receiving user input */
  waitForUserInput?: () => Promise<string>;
  /** Maximum number of conversation turns before forcing a decision */
  maxTurns?: number;
  /** The LLM to use for conversation */
  llm?: BaseChatModel;
}

export interface InteractiveLoopResult {
  /** Whether the user approved the output */
  approved: boolean;
  /** The final structured output after all refinements */
  finalOutput: unknown;
  /** Full chat history of the interaction */
  chatHistory: ChatMessage[];
  /** Number of conversation turns */
  turns: number;
}

// ─────────────────────────────────────────────
// Approval Detection Prompt
// ─────────────────────────────────────────────

const APPROVAL_CHECK_PROMPT = `You are analyzing a user's message to determine their intent.
Based on the message below, determine if the user is:
1. APPROVING the current output (wants to proceed to the next step)
2. REQUESTING CHANGES (wants modifications to the current output)
3. ASKING A QUESTION (needs clarification)

Respond with ONLY a JSON object:
{
  "intent": "approve" | "change" | "question",
  "summary": "brief summary of what they want"
}

User message: "{message}"`;

// ─────────────────────────────────────────────
// CLI Readline Helper
// ─────────────────────────────────────────────

/**
 * Creates a readline-based input function for CLI/test mode.
 */
function createCliInputReader(): () => Promise<string> {
  return () => {
    return new Promise<string>((resolve) => {
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("\n💬 Your response: ", (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  };
}

// ─────────────────────────────────────────────
// Interactive Loop Implementation
// ─────────────────────────────────────────────

export class InteractiveLoop {
  /**
   * Runs the interactive conversation loop.
   *
   * The loop continues until:
   * 1. The user explicitly approves (says "yes", "approve", "proceed", etc.)
   * 2. The maximum number of turns is reached
   *
   * @param config - Loop configuration
   * @returns The result containing approval status, final output, and chat history
   */
  async run(config: InteractiveLoopConfig): Promise<InteractiveLoopResult> {
    const {
      agentName,
      phase,
      projectId,
      systemPrompt,
      initialAgentMessage,
      onMessage,
      maxTurns = 20,
    } = config;

    const llm = config.llm ?? createTier1LLM({ maxTokens: 4096 });
    const waitForInput = config.waitForUserInput ?? createCliInputReader();
    const chatHistory: ChatMessage[] = [];
    const langchainMessages = [new SystemMessage(systemPrompt)];

    log.info({ agentName, phase, projectId }, "Starting interactive loop");

    // Send initial agent message
    const initialMsg: ChatMessage = {
      role: "agent",
      content: initialAgentMessage,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(initialMsg);
    langchainMessages.push(new AIMessage(initialAgentMessage));

    // Display to user
    if (onMessage) {
      onMessage("agent:message", { phase, message: initialAgentMessage });
    } else {
      console.log(`\n🤖 [${agentName}]: ${initialAgentMessage}`);
    }

    let turns = 0;
    let approved = false;
    let finalOutput: unknown = null;

    while (turns < maxTurns && !approved) {
      turns++;

      // 1. Wait for user input
      if (onMessage) {
        onMessage("agent:waiting_for_input", { phase, turn: turns });
      }

      const userInput = await waitForInput();

      if (!userInput || userInput.trim().length === 0) {
        continue;
      }

      // Record user message
      const userMsg: ChatMessage = {
        role: "user",
        content: userInput,
        timestamp: new Date().toISOString(),
      };
      chatHistory.push(userMsg);
      langchainMessages.push(new HumanMessage(userInput));

      log.info({ turn: turns, userInput: userInput.substring(0, 100) }, "Received user input");

      // 2. Check if the user is approving
      const intentResult = await this.detectIntent(userInput, llm);

      if (intentResult.intent === "approve") {
        log.info({ turn: turns }, "User approved. Extracting final output.");

        // Ask the LLM to produce the final structured output
        const finalPrompt = `The user has approved the current output. 
Please produce the FINAL structured JSON output that captures everything we've agreed upon.
Respond ONLY with the final JSON object, no other text.`;

        langchainMessages.push(new HumanMessage(finalPrompt));
        const finalResponse = await llm.invoke(langchainMessages);
        const finalContent = typeof finalResponse.content === "string"
          ? finalResponse.content
          : JSON.stringify(finalResponse.content);

        try {
          finalOutput = extractAndParseJson(finalContent);
        } catch {
          // If JSON extraction fails, use the raw chat context as the output
          log.warn("Could not extract final JSON. Using last agent message as output.");
          finalOutput = { rawApproval: finalContent };
        }

        approved = true;

        const approvalMsg: ChatMessage = {
          role: "agent",
          content: "✅ Great! Your input has been approved. Proceeding to the next phase.",
          timestamp: new Date().toISOString(),
        };
        chatHistory.push(approvalMsg);

        if (onMessage) {
          onMessage("agent:message", { phase, message: approvalMsg.content });
          onMessage("phase:approved", { phase, turns });
        } else {
          console.log(`\n🤖 [${agentName}]: ${approvalMsg.content}`);
        }

        break;
      }

      // 3. Not approved — let the agent respond conversationally
      const agentResponse = await llm.invoke(langchainMessages);
      const agentContent = typeof agentResponse.content === "string"
        ? agentResponse.content
        : JSON.stringify(agentResponse.content);

      // Clean up any thinking tags from the model
      const cleanedContent = agentContent
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .trim();

      langchainMessages.push(new AIMessage(cleanedContent));

      const agentMsg: ChatMessage = {
        role: "agent",
        content: cleanedContent,
        timestamp: new Date().toISOString(),
      };
      chatHistory.push(agentMsg);

      if (onMessage) {
        onMessage("agent:message", { phase, message: cleanedContent });
      } else {
        console.log(`\n🤖 [${agentName}]: ${cleanedContent}`);
      }
    }

    if (!approved) {
      log.warn({ turns, maxTurns }, "Interactive loop ended without approval (max turns reached)");
      if (onMessage) {
        onMessage("agent:message", {
          phase,
          message: `⚠️ Maximum conversation turns (${maxTurns}) reached. Please restart the pipeline to continue refining.`,
        });
      }
    }

    return {
      approved,
      finalOutput,
      chatHistory,
      turns,
    };
  }

  /**
   * Detects the user's intent from their message.
   * Uses a lightweight LLM call to classify: approve | change | question
   */
  private async detectIntent(
    userMessage: string,
    llm: BaseChatModel,
  ): Promise<{ intent: "approve" | "change" | "question"; summary: string }> {
    // Quick keyword check first (avoid LLM call for obvious cases)
    const lowerMsg = userMessage.toLowerCase().trim();

    // If the message contains a question mark, it's likely a question, not approval
    const isQuestion = lowerMsg.includes("?");

    // Only match approval keywords as WHOLE WORDS (word boundaries)
    // and only if the message is SHORT and not a question
    const approvalPhrases = [
      /^(yes|yep|yup|yeah)[\s!.]*$/,       // standalone "yes", "yep", etc.
      /^approve[d]?[\s!.]*$/,               // standalone "approve" / "approved"
      /^proceed[\s!.]*$/,                   // standalone "proceed"
      /^confirm(ed)?[\s!.]*$/,              // standalone "confirm" / "confirmed"
      /^accept(ed)?[\s!.]*$/,               // standalone "accept" / "accepted"
      /^lgtm[\s!.]*$/,                      // standalone "lgtm"
      /\blooks good\b/,                     // "looks good" anywhere
      /\bgo ahead\b/,                       // "go ahead" anywhere
      /\ball good\b/,                       // "all good" anywhere
      /\bship it\b/,                        // "ship it" anywhere
      /\bi approve\b/,                      // "i approve" anywhere
      /\blet'?s go\b/,                      // "let's go" / "lets go" anywhere
      /\bmove on\b/,                        // "move on" anywhere
      /\bnext phase\b/,                     // "next phase" anywhere
    ];

    // Only trigger keyword approval if it's NOT a question
    if (!isQuestion && approvalPhrases.some(rx => rx.test(lowerMsg))) {
      return { intent: "approve", summary: "User explicitly approved" };
    }

    // For ambiguous messages, use LLM classification
    try {
      const prompt = APPROVAL_CHECK_PROMPT.replace("{message}", userMessage);
      const response = await llm.invoke([new HumanMessage(prompt)]);
      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      const parsed = extractAndParseJson(cleanedContent) as {
        intent: "approve" | "change" | "question";
        summary: string;
      };

      return parsed;
    } catch {
      // Default to "change" if classification fails — safer to keep the loop going
      return { intent: "change", summary: "Could not classify intent" };
    }
  }
}
