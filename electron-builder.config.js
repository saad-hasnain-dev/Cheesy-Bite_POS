module.exports = {
  appId: 'com.cheesybite.pos',
  productName: 'Cheesy Bite POS',
  copyright: 'Copyright © 2025 Cheesy Bite Restaurant',
  directories: { output: 'dist', buildResources: 'resources' },
  files: [
    'src/main/**/*',
    'src/preload/**/*',
    'out/renderer/**/*',
    'package.json'
  ],
  // Unpack files that must live on the real filesystem (not inside .asar)
  // BrowserWindow preload scripts for external windows cannot be read from inside asar
  asarUnpack: [
    'src/main/wa-preload.js'
  ],
  win: {
    icon: 'icon.ico',
    target: [{ target: 'nsis', arch: ['x64'] }],
    requestedExecutionLevel: 'asInvoker',
    sign: null,
    signingHashAlgorithms: null
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Cheesy Bite POS',
    deleteAppDataOnUninstall: false,
    // Close any running instance before overwriting app files
    include: 'nsis-close-app.nsh'
  },
  asar: true
}
