import dotenv from 'dotenv'
import path from 'path'
import { Pool, type QueryResult, type QueryResultRow } from 'pg'

// Ensure .env is loaded whether running from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config()

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  maxPoolSize: number
}

export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'Automated-Payroll-Management-System',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  maxPoolSize: Number(process.env.DB_MAX_POOL) || 10,
}

export const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  max: dbConfig.maxPoolSize,
})

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}

export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect()
    console.log(
      `[DB] Successfully connected to PostgreSQL database: "${dbConfig.database}" on ${dbConfig.host}:${dbConfig.port}`,
    )
    client.release()
  } catch (error) {
    console.warn(
      `[DB] Notice: Could not connect to PostgreSQL database "${dbConfig.database}".`,
    )
    console.warn(
      `[DB] Please ensure PostgreSQL is running and check DB_PASSWORD in backend/.env`,
    )
    if (error instanceof Error) {
      console.warn(`[DB] Error detail: ${error.message}`)
    }
  }
}
