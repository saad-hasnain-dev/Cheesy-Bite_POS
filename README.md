# Cheesy Bite POS

Restaurant point-of-sale for Windows: orders, printing, menu, customers, reservations and sales dashboard, in English and Arabic. Built with Electron, React and SQLite. Everything runs on the local machine and works offline.

## Features

- **POS** — grid, photo or list menu; dine-in, takeaway, delivery and drive-through; discounts; cash change calculation
- **Receipts** — silent printing to thermal printers (58 / 80 mm), optional bank QR code
- **WhatsApp receipts** — when a receipt prints, the same receipt is sent to the customer's number in the background (via WhatsApp Web linked on this PC)
- **Orders** — history with filters, search, edit, refund / void, reprint, CSV and Excel export
- **Menu** — categories and items, per-item discounts, VAT-exempt items, availability switch, bulk actions
- **Customers** and **Reservations** — profiles, order history, double-booking warning
- **Dashboard** — live sales, best sellers, order types
- **Data safety** — crash-safe saves and an automatic daily backup (last 14 days)
- Works on desktop, tablet and phone screen sizes

## Requirements

- Windows 10 or 11
- Node.js 20 or newer

## Getting started

```bash
npm install
npm run dev        # build the UI and open the desktop app
```

Default admin password: `cheesy2024` — change it in **Settings → Security** after first launch.

## Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the backend tests against a temporary database |
| `npm run preview` | Opens the UI in a web browser with **demo data** (nothing is saved to a real database) |
| `npm run package:win` | Builds the Windows installer into `dist/` |

## Where data is stored

The database is `cheesybite.db` in `%APPDATA%\cheesy-bite-pos\`, with daily copies in the `backups` folder next to it. Use **Settings → Data & backup → Back up now** to save a copy elsewhere.

## Project structure

```
src/
  main/        Electron main process: database, printing, WhatsApp, IPC handlers
  preload/     Safe bridge between the UI and the main process
  renderer/    React UI
    components/ui/   Reusable design-system components (Button, Input, Modal, …)
    pages/           One file per screen
    dev/mockApi.js   Demo data used only by `npm run preview`
tests/         Backend tests (`npm test`)
```

## Notes

- WhatsApp sending automates WhatsApp Web, which is not an official WhatsApp API. For high volume, consider the WhatsApp Business Platform instead.
- The browser preview is for trying the interface only. A hosted, multi-device version would need a server and a shared database.
