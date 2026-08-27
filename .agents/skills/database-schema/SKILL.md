---
name: database-schema
description: Guide for database schema changes — migration workflow, pgvector usage, schema conventions, and Drizzle ORM patterns.
---

# Database Schema Guide

## Stack
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL 17 with pgvector extension
- **Migrations:** Drizzle Kit (`drizzle-kit generate` + `drizzle-kit migrate`)

## Schema Conventions
1. **Primary keys:** UUID with `defaultRandom()`
2. **Timestamps:** Always include `created_at` and `updated_at` with timezone
3. **Foreign keys:** Always set `onDelete: "cascade"` for child tables
4. **Indexes:** Add indexes on frequently queried columns
5. **JSONB:** Use `$type<T>()` for type-safe JSON columns

## Migration Workflow
1. Modify schema files in `packages/database/src/schema/`
2. Generate migration: `pnpm db:generate`
3. Review the generated SQL in `packages/database/migrations/`
4. Apply to local dev: `pnpm db:push`
5. Commit the migration file
6. CI will validate against test DB automatically
7. Production migration requires manual approval in GitHub

## pgvector Usage
- Embedding column type: `vector(1536)` (OpenAI text-embedding-3-small)
- Similarity search: Cosine distance operator `<=>`
- Use `VectorStore` class from `packages/database/src/vector.ts`
- Always scope searches by `project_id` for multi-tenant isolation

## Adding a New Table
1. Create schema file in `packages/database/src/schema/<table>.ts`
2. Define the table using `pgTable()`
3. Define relations using `relations()`
4. Export from `packages/database/src/schema/index.ts`
5. Generate and apply migration
