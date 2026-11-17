const fs = require('fs')
const path = require('path')

const srcDir = path.resolve(__dirname, '../src/config')
const distDir = path.resolve(__dirname, '../dist/config')

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.sql'))
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file))
    console.log(`[Build] Copied ${file} to dist/config/`)
  }
}
