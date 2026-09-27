'use strict'
delete process.env.ELECTRON_RUN_AS_NODE

const { execSync, spawn } = require('child_process')
const electronPath = require('electron')

// Always build the renderer first so the app shows the latest UI code.
// Both "npm run dev" and the installed software load from out/renderer/,
// so this is the single source of truth.
const path = require('path')
const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js')
const viteArgs = ['--config', 'vite.renderer.config.js']

console.log('\x1b[36m[dev] Building renderer...\x1b[0m')
try {
  execSync(`"${process.execPath}" "${viteBin}" build ${viteArgs.join(' ')}`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  })
} catch (e) {
  console.error('\x1b[31m[dev] Renderer build failed. Fix errors above and try again.\x1b[0m')
  process.exit(1)
}
console.log('\x1b[32m[dev] Renderer built. Launching Electron...\x1b[0m')

const proc = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: process.env,
  windowsHide: false
})

proc.on('close', (code) => process.exit(code || 0))
proc.on('error', (err) => {
  console.error('Failed to launch Electron:', err.message)
  process.exit(1)
})
