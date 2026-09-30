import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const connectionString = process.env.DATABASE_URL

// Use a single connection for migrations / scripts
// Use connection pool for application servers
const queryClient = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 10 : 3,
  idle_timeout: 30,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })

export * from './schema'
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
