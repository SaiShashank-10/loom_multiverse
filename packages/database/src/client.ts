import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

/**
 * Creates a Drizzle ORM database client.
 *
 * @param connectionString - PostgreSQL connection URL
 * @returns Drizzle database instance with schema
 */
export function createDatabaseClient(connectionString: string) {
  const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(queryClient, { schema });
}

export type Database = ReturnType<typeof createDatabaseClient>;
