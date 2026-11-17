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
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
  database: process.env.DB_NAME || process.env.PGDATABASE || 'Automated-Payroll-Management-System',
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
  maxPoolSize: Number(process.env.DB_MAX_POOL) || 10,
}

const isInternalNetwork = Boolean(
  process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes('railway.internal') ||
      process.env.DATABASE_URL.includes('localhost') ||
      process.env.DATABASE_URL.includes('127.0.0.1')),
)

const isCloudDb = Boolean(
  process.env.DATABASE_URL &&
    !isInternalNetwork &&
    (process.env.DATABASE_URL.includes('rlwy.net') ||
      process.env.DATABASE_URL.includes('render') ||
      process.env.DATABASE_URL.includes('supabase') ||
      process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('sslmode=require')),
)

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
      max: dbConfig.maxPoolSize,
    })
  : new Pool({
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
    if (process.env.DATABASE_URL) {
      console.log(`[DB] Successfully connected to PostgreSQL via DATABASE_URL`)
    } else {
      console.log(
        `[DB] Successfully connected to PostgreSQL database: "${dbConfig.database}" on ${dbConfig.host}:${dbConfig.port}`,
      )
    }
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
