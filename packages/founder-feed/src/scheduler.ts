import cron from "node-cron";
import { createLogger } from "@loom/shared/logger";
import { FeedAggregator } from "./aggregator.js";
import { createDatabaseClient, projects } from "@loom/database";
import { eq, inArray } from "drizzle-orm";

const log = createLogger("feed-scheduler");

export class FeedScheduler {
  private aggregator: FeedAggregator;
  private db: ReturnType<typeof createDatabaseClient>;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.aggregator = new FeedAggregator();
    this.db = createDatabaseClient(process.env.DATABASE_URL!);
  }

  public start() {
    // Default to every 30 minutes if not specified
    const intervalMinutes = parseInt(process.env.FEED_REFRESH_INTERVAL_MINUTES || "30", 10);
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    log.info(`Starting Feed Scheduler with interval: ${intervalMinutes} minutes (${cronExpression})`);
    
    this.task = cron.schedule(cronExpression, async () => {
      try {
        await this.runAggregationCycle();
      } catch (error) {
        log.error({ error: String(error) }, "Failed during scheduled aggregation cycle");
      }
    });
  }

  public stop() {
    if (this.task) {
      this.task.stop();
      log.info("Stopped Feed Scheduler");
    }
  }

  /**
   * For testing or manual triggering
   */
  public async runNow() {
    log.info("Manually triggering feed aggregation cycle");
    await this.runAggregationCycle();
  }

  private async runAggregationCycle() {
    log.info("Starting aggregation cycle for all active projects");
    
    // Find all active projects that need feed tracking
    // For now, we'll fetch all projects not in 'failed' or 'paused'
    const activeProjects = await this.db
      .select()
      .from(projects)
      .where(
        inArray(projects.status, [
          "idea_check", 
          "planning", 
          "designing", 
          "building", 
          "testing", 
          "launching"
        ])
      );

    log.info({ count: activeProjects.length }, "Found active projects");

    for (const project of activeProjects) {
      // In a real scenario, we'd extract keywords from the validated idea
      // For this implementation, we'll extract some naive keywords from the founder prompt
      const keywords = this.extractKeywords(project.founderPrompt, project.techStack);
      
      await this.aggregator.aggregateForProject(project.id, keywords);
    }
    
    log.info("Completed aggregation cycle");
  }

  private extractKeywords(prompt: string, techStack?: any): string[] {
    const baseKeywords = new Set<string>([
      "startup", "tech", "funding", "launch", "app", "software", "ai", "founder"
    ]);

    if (prompt) {
      prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 4)
        .forEach(w => baseKeywords.add(w));
    }

    if (techStack && typeof techStack === "object") {
      Object.values(techStack).forEach((val: any) => {
        if (typeof val === "string") {
          val.split(/\s+/).forEach(w => baseKeywords.add(w.toLowerCase()));
        } else if (Array.isArray(val)) {
          val.forEach(item => {
            if (typeof item === "string") baseKeywords.add(item.toLowerCase());
          });
        }
      });
    }

    return Array.from(baseKeywords);
  }
}
