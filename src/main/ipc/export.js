const { ipcMain, dialog } = require('electron')
const { db } = require('../database/db')
const path = require('path')
const fs = require('fs')

function toCSV(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = row[h] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(','))
  }
  return lines.join('\r\n')
}

module.exports = function registerExportHandlers() {
  ipcMain.handle('export:orders-csv', async (_, { from, to } = {}) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Orders',
        defaultPath: `orders_${(from || 'all').replace(/-/g, '')}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })
      if (canceled || !filePath) return { data: null }

      const dateFrom = from || '2000-01-01'
      const dateTo = to || '2099-12-31'
      const orders = db.prepare(
        `SELECT o.order_number, o.order_type, o.table_number, o.delivery_address,
         o.subtotal, o.discount_amount, o.vat_amount, o.total, o.payment_method,
         o.status, datetime(o.created_at,'localtime') as created_at, c.name as customer_name, c.phone as customer_phone
         FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
         WHERE date(o.created_at,'localtime') BETWEEN @from AND @to
         ORDER BY o.created_at DESC`
      ).all({ from: dateFrom, to: dateTo })

      fs.writeFileSync(filePath, '﻿' + toCSV(orders), 'utf8')
      return { data: filePath }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('export:orders-excel', async (_, { from, to } = {}) => {
    try {
      const XLSX = require('xlsx')
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Orders (Excel)',
        defaultPath: `cheesybite_orders_${Date.now()}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })
      if (canceled || !filePath) return { data: null }

      const dateFrom = from || '2000-01-01'
      const dateTo = to || '2099-12-31'

      const orders = db.prepare(
        `SELECT o.order_number as "Order#", o.order_type as "Type", o.table_number as "Table",
         o.subtotal as "Subtotal", o.discount_amount as "Discount", o.vat_amount as "VAT",
         o.total as "Total", o.payment_method as "Payment", o.status as "Status",
         datetime(o.created_at,'localtime') as "Date", c.name as "Customer", c.phone as "Phone"
         FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
         WHERE date(o.created_at,'localtime') BETWEEN @from AND @to ORDER BY o.created_at DESC`
      ).all({ from: dateFrom, to: dateTo })

      const items = db.prepare(
        `SELECT o.order_number as "Order#", oi.name_en as "Item", oi.qty as "Qty",
         oi.unit_price as "Unit Price", oi.total_price as "Total"
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE date(o.created_at,'localtime') BETWEEN @from AND @to`
      ).all({ from: dateFrom, to: dateTo })

      const customers = db.prepare(
        `SELECT name as "Name", phone as "Phone", email as "Email", datetime(created_at,'localtime') as "Joined" FROM customers ORDER BY created_at DESC`
      ).all()

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders), 'Orders')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), 'Order Items')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), 'Customers')
      XLSX.writeFile(wb, filePath)
      return { data: filePath }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('export:customers-csv', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Customers',
        defaultPath: 'customers.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })
      if (canceled || !filePath) return { data: null }
      const rows = db.prepare('SELECT name, phone, email, notes, created_at FROM customers ORDER BY name').all()
      fs.writeFileSync(filePath, '﻿' + toCSV(rows), 'utf8')
      return { data: filePath }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('export:reservations-csv', async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Reservations',
        defaultPath: 'reservations.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })
      if (canceled || !filePath) return { data: null }
      const rows = db.prepare('SELECT * FROM reservations ORDER BY reserved_at DESC').all()
      fs.writeFileSync(filePath, '﻿' + toCSV(rows), 'utf8')
      return { data: filePath }
    } catch (e) { return { error: e.message } }
  })
}
