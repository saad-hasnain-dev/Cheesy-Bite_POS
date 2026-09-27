import dayjs from 'dayjs'

// SQLite's datetime('now') stores UTC without a zone marker ("YYYY-MM-DD HH:MM:SS").
// Parse it as UTC so it displays in the machine's local time.
export function dbDate(value) {
  if (!value) return dayjs(value)
  return dayjs(String(value).replace(' ', 'T') + 'Z')
}
