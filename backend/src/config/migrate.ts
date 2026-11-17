import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { pool } from './db'

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Ensure baseline compatibility between legacy tables and ERD schema
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS id INTEGER;
      UPDATE users SET id = user_id WHERE id IS NULL;
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_unique') THEN
              ALTER TABLE users ADD CONSTRAINT users_id_unique UNIQUE (id);
          END IF;
      END $$;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS office VARCHAR(150) DEFAULT 'Information Systems Office';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
      UPDATE users SET account_id = 'USR-' || id WHERE account_id IS NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];
      UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL AND role IS NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150);
      UPDATE users SET cost_center = COALESCE(office, 'Information Systems Office') WHERE cost_center IS NULL;

      ALTER TABLE employees ADD COLUMN IF NOT EXISTS id INTEGER;
      UPDATE employees SET id = employee_id WHERE id IS NULL;
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_id_unique') THEN
              ALTER TABLE employees ADD CONSTRAINT employees_id_unique UNIQUE (id);
          END IF;
      END $$;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_no VARCHAR(50);
      UPDATE employees SET employee_no = 'EMP-' || LPAD(employee_id::text, 3, '0') WHERE employee_no IS NULL;
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_no_unique') THEN
              ALTER TABLE employees ADD CONSTRAINT employees_no_unique UNIQUE (employee_no);
          END IF;
      END $$;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(150) DEFAULT 'Information Systems';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Staff';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12, 2) DEFAULT 25000.00;
    `)

    // 2. Run schema and all migration files in order
    const migrationFiles = ['schema.sql', 'migration.sql', 'migration_phase2.sql', 'migration_phase_b.sql']
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
