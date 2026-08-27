CREATE TABLE "adrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"context" text NOT NULL,
	"decision" text NOT NULL,
	"rationale" text NOT NULL,
	"consequences" text NOT NULL,
	"status" varchar(50) DEFAULT 'accepted' NOT NULL,
	"superseded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"system_prompt" text,
	"model" varchar(100) DEFAULT 'qwen3:4b' NOT NULL,
	"temperature" varchar(10) DEFAULT '0.3' NOT NULL,
	"tools" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_role_unique" UNIQUE("role")
);
--> statement-breakpoint
CREATE TABLE "feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(1000) NOT NULL,
	"summary" text,
	"url" text NOT NULL,
	"source" varchar(100) NOT NULL,
	"published_at" timestamp with time zone,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"relevance_score" real DEFAULT 0 NOT NULL,
	"domain" varchar(255),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"sentiment" varchar(20) DEFAULT 'neutral',
	"raw_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"service" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"namespace" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"embedding" text,
	"metadata" text,
	"agent_role" varchar(50),
	"phase" varchar(50),
	"chunk_index" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb,
	"output" jsonb DEFAULT '{}'::jsonb,
	"artifacts" jsonb DEFAULT '[]'::jsonb,
	"error_message" text,
	"execution_time_ms" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"founder_prompt" text NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"tech_stack" jsonb,
	"architecture" jsonb,
	"repository_url" text,
	"deployed_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adrs" ADD CONSTRAINT "adrs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_project_idx" ON "feed_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feed_source_idx" ON "feed_items" USING btree ("source");--> statement-breakpoint
CREATE INDEX "feed_relevance_idx" ON "feed_items" USING btree ("relevance_score");--> statement-breakpoint
CREATE INDEX "feed_published_idx" ON "feed_items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "memory_project_idx" ON "memory" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memory_namespace_idx" ON "memory" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "memory_agent_role_idx" ON "memory" USING btree ("agent_role");