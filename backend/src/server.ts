import 'dotenv/config'
import app from './app'
import { connectDatabase } from './config/db'

const PORT = Number(process.env.PORT) || 3000

async function bootstrap(): Promise<void> {
  await connectDatabase()

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}

void bootstrap()

