import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { pool } from './db'

export async function runMigrations(): Promise<void> {
  const migrationFiles = ['migration.sql', 'migration_phase2.sql']
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    for (const filename of migrationFiles) {
      const filePath = path.resolve(__dirname, filename)
      if (fs.existsSync(filePath)) {
        console.log(`[Migration] Running ${filename}...`)
        const sql = fs.readFileSync(filePath, 'utf8')
        await client.query(sql)
      }
    }
    await client.query('COMMIT')
    console.log('[Migration] All migrations applied successfully.')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Migration] Migration failed:', error)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed.')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}
