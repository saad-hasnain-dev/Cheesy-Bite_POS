const fs = require('fs')
const path = require('path')
const { app } = require('electron')

let _SQL = null
let _db = null
let _dbPath = null
let _inTransaction = false

function getWasmPath() {
  // require.resolve finds sql.js main → dist/sql-wasm.js
  // dirname is the dist/ folder containing sql-wasm.wasm
  // Works in dev and packaged: Electron patches fs to transparently read ASAR paths,
  // and asarUnpack redirects wasm reads to the real filesystem
  return path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm')
}

async function openDatabase() {
  if (_db) return _db

  const initSqlJs = require('sql.js')
  _SQL = await initSqlJs({ locateFile: () => getWasmPath() })

  _dbPath = path.join(app.getPath('userData'), 'cheesybite.db')

  if (fs.existsSync(_dbPath)) {
    const buf = fs.readFileSync(_dbPath)
    _db = new _SQL.Database(buf)
    // Keep one automatic backup per day (last 14 days) next to the database
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups')
      fs.mkdirSync(backupDir, { recursive: true })
      const today = new Date().toISOString().slice(0, 10)
      const dest = path.join(backupDir, `cheesybite-${today}.db`)
      if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf)
      const old = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().slice(0, -14)
      for (const f of old) fs.unlinkSync(path.join(backupDir, f))
    } catch (_) {}
  } else {
    _db = new _SQL.Database()
  }

  return _db
}

function saveDb() {
  if (_db && _dbPath && !_inTransaction) {
    const data = _db.export()
    // Write to a temp file then rename, so a crash or power cut mid-write
    // can never leave a half-written (corrupt) database behind.
    const tmp = `${_dbPath}.tmp`
    fs.writeFileSync(tmp, Buffer.from(data))
    fs.renameSync(tmp, _dbPath)
  }
}

// Accepts the same call styles as better-sqlite3: .get({ id }), .get([1, 2]), .get(1) or .run('a', 'b').
// sql.js silently ignores a bare value, so positional values are always wrapped in an array.
function normalizeArgs(args) {
  if (args.length > 1) return args
  const p = args[0]
  if (p === undefined || p === null) return undefined
  return (typeof p === 'object') ? p : [p]
}

function convertParams(params) {
  if (!params) return []
  if (Array.isArray(params)) return params
  if (typeof params === 'object') {
    const result = {}
    for (const [k, v] of Object.entries(params)) {
      const key = (k.startsWith(':') || k.startsWith('@') || k.startsWith('$')) ? k : `@${k}`
      result[key] = v === undefined ? null : v
    }
    return result
  }
  return params
}

class Stmt {
  constructor(sql) { this._sql = sql }

  all(...args) {
    const params = normalizeArgs(args)
    try {
      const stmt = _db.prepare(this._sql)
      stmt.bind(convertParams(params))
      const rows = []
      while (stmt.step()) rows.push(stmt.getAsObject())
      stmt.free()
      return rows
    } catch (e) {
      throw new Error(`Query failed: ${this._sql}\n${e.message}`)
    }
  }

  get(...args) {
    const params = normalizeArgs(args)
    try {
      const stmt = _db.prepare(this._sql)
      stmt.bind(convertParams(params))
      let row
      if (stmt.step()) row = stmt.getAsObject()
      stmt.free()
      return row
    } catch (e) {
      throw new Error(`Query failed: ${this._sql}\n${e.message}`)
    }
  }

  run(...args) {
    const params = normalizeArgs(args)
    try {
      _db.run(this._sql, convertParams(params))
      const idStmt = _db.prepare('SELECT last_insert_rowid() as id')
      idStmt.step()
      const idRow = idStmt.getAsObject()
      idStmt.free()
      const chgStmt = _db.prepare('SELECT changes() as c')
      chgStmt.step()
      const chgRow = chgStmt.getAsObject()
      chgStmt.free()
      if (!_inTransaction) saveDb()
      return { lastInsertRowid: idRow ? idRow.id : 0, changes: chgRow ? chgRow.c : 0 }
    } catch (e) {
      throw new Error(`Run failed: ${this._sql}\n${e.message}`)
    }
  }
}

const db = {
  prepare: (sql) => new Stmt(sql),

  exec: (sql) => {
    _db.run(sql)
    saveDb()
  },

  transaction: (fn) => {
    return function (...args) {
      _inTransaction = true
      _db.run('BEGIN')
      try {
        const result = fn(...args)
        _db.run('COMMIT')
        _inTransaction = false
        saveDb()
        return result
      } catch (e) {
        _db.run('ROLLBACK')
        _inTransaction = false
        throw e
      }
    }
  }
}

function getDbPath() { return _dbPath }

module.exports = { openDatabase, db, getDbPath }
