// Runs before any WhatsApp Web scripts — hides Electron fingerprints
try {
  Object.defineProperty(navigator, 'webdriver',  { get: () => undefined,            configurable: true })
  Object.defineProperty(navigator, 'languages',  { get: () => ['en-US', 'en'],      configurable: true })
  Object.defineProperty(navigator, 'plugins',    { get: () => ({ length: 5 }),      configurable: true })
  if (!window.chrome) window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} }
} catch (_) {}
