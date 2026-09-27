const { ipcMain } = require('electron')
const { db } = require('../database/db')

const VALID_PERIODS = ['today', '7days', '30days', 'month', 'year']

module.exports = function registerDashboardHandlers() {
  ipcMain.handle('dashboard:summary', (_, { period = '30days' } = {}) => {
    try {
      if (!VALID_PERIODS.includes(period)) period = '30days'

      // Fixed KPI summaries (always today / week / month / year)
      const today = db.prepare(
        `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count
         FROM orders WHERE date(created_at,'localtime')=date('now','localtime') AND status='completed'`
      ).get()

      const week = db.prepare(
        `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count
         FROM orders WHERE created_at >= datetime('now','-7 days') AND status='completed'`
      ).get()

      const month = db.prepare(
        `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count
         FROM orders WHERE strftime('%Y-%m',created_at,'localtime')=strftime('%Y-%m','now','localtime') AND status='completed'`
      ).get()

      const year = db.prepare(
        `SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as count
         FROM orders WHERE strftime('%Y',created_at,'localtime')=strftime('%Y','now','localtime') AND status='completed'`
      ).get()

      // Chart data — changes based on period
      let chartData, topItemsWhere

      if (period === 'today') {
        chartData = db.prepare(
          `SELECT strftime('%H:00', created_at,'localtime') as label,
                  COALESCE(SUM(total),0) as revenue, COUNT(*) as count
           FROM orders WHERE date(created_at,'localtime')=date('now','localtime') AND status='completed'
           GROUP BY strftime('%H', created_at,'localtime') ORDER BY label ASC`
        ).all()
        topItemsWhere = "date(o.created_at,'localtime')=date('now','localtime')"
      } else if (period === '7days') {
        chartData = db.prepare(
          `SELECT date(created_at,'localtime') as label,
                  COALESCE(SUM(total),0) as revenue, COUNT(*) as count
           FROM orders WHERE created_at >= datetime('now','-7 days') AND status='completed'
           GROUP BY label ORDER BY label ASC`
        ).all()
        topItemsWhere = "o.created_at >= datetime('now','-7 days')"
      } else if (period === 'month') {
        chartData = db.prepare(
          `SELECT date(created_at,'localtime') as label,
                  COALESCE(SUM(total),0) as revenue, COUNT(*) as count
           FROM orders WHERE strftime('%Y-%m',created_at,'localtime')=strftime('%Y-%m','now','localtime') AND status='completed'
           GROUP BY label ORDER BY label ASC`
        ).all()
        topItemsWhere = "strftime('%Y-%m',o.created_at,'localtime')=strftime('%Y-%m','now','localtime')"
      } else if (period === 'year') {
        chartData = db.prepare(
          `SELECT strftime('%Y-%m', created_at,'localtime') as label,
                  COALESCE(SUM(total),0) as revenue, COUNT(*) as count
           FROM orders WHERE strftime('%Y',created_at,'localtime')=strftime('%Y','now','localtime') AND status='completed'
           GROUP BY label ORDER BY label ASC`
        ).all()
        topItemsWhere = "strftime('%Y',o.created_at,'localtime')=strftime('%Y','now','localtime')"
      } else {
        // default 30days
        chartData = db.prepare(
          `SELECT date(created_at,'localtime') as label,
                  COALESCE(SUM(total),0) as revenue, COUNT(*) as count
           FROM orders WHERE created_at >= datetime('now','-30 days') AND status='completed'
           GROUP BY label ORDER BY label ASC`
        ).all()
        topItemsWhere = "o.created_at >= datetime('now','-30 days')"
      }

      const topItems = db.prepare(
        `SELECT oi.name_en, oi.name_ar, SUM(oi.qty) as total_qty, SUM(oi.total_price) as total_revenue
         FROM order_items oi JOIN orders o ON o.id=oi.order_id
         WHERE o.status='completed' AND ${topItemsWhere}
         GROUP BY oi.name_en ORDER BY total_qty DESC LIMIT 8`
      ).all()

      const orderTypes = db.prepare(
        `SELECT o.order_type, COUNT(*) as count, COALESCE(SUM(o.total),0) as revenue
         FROM orders o WHERE o.status='completed' AND ${topItemsWhere}
         GROUP BY o.order_type`
      ).all()

      return { data: { today, week, month, year, chartData, topItems, orderTypes } }
    } catch (e) { return { error: e.message } }
  })
}
