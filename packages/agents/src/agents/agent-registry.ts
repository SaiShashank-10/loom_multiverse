/**
 * @loom/agents — Agent Registry
 *
 * Singleton registry for phase agents.
 * The orchestrator looks up agents by their phase name.
 */

import { createLogger } from "@loom/shared/logger";
import { AgentError } from "@loom/shared/errors";

// (Forward declaration since BaseAgent isn't fully built yet)
// We will use `any` here or an interface if needed, but let's just 
// import it once we build it. For now, use an interface.
export interface IAgent {
  name: string;
  phase: string;
  run(input: any): Promise<any>;
}

const log = createLogger("agent-registry");

class AgentRegistry {
  private agents: Map<string, IAgent> = new Map();

  /**
   * Register an agent instance.
   * Overwrites if an agent for the same phase already exists.
   */
  register(agent: IAgent): void {
    if (this.agents.has(agent.phase)) {
      log.warn({ phase: agent.phase, name: agent.name }, "Overwriting existing agent for phase");
    }
    
    this.agents.set(agent.phase, agent);
    log.info({ phase: agent.phase, name: agent.name }, "Registered agent");
  }

  /**
   * Get an agent by its phase name.
   * Throws if no agent is registered for the phase.
   */
  get(phase: string): IAgent {
    const agent = this.agents.get(phase);
    if (!agent) {
      throw new AgentError(`No agent registered for phase '${phase}'`, "orchestrator");
    }
    return agent;
  }

  /**
   * Get all registered phases.
   */
  getRegisteredPhases(): string[] {
    return Array.from(this.agents.keys());
  }
}

/** Global singleton instance */
export const agentRegistry = new AgentRegistry();
