import 'dotenv/config'
import fs from 'fs'
import app from './app'
import { connectDatabase } from './config/db'
import { runMigrations } from './config/migrate'
import { storageConfig } from './config/storage'

const PORT = Number(process.env.PORT) || 3000

async function bootstrap(): Promise<void> {
  await connectDatabase()
  await runMigrations()

  // Ensure upload directory exists
  if (!fs.existsSync(storageConfig.uploadDir)) {
    fs.mkdirSync(storageConfig.uploadDir, { recursive: true })
    console.log(`[Storage] Created upload directory: ${storageConfig.uploadDir}`)
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}

void bootstrap()

