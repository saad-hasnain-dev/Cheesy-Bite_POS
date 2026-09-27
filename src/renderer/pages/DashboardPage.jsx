import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, ShoppingBag, Calendar, Award, RefreshCw, Receipt, BarChart3, PackageOpen } from 'lucide-react'
import dayjs from 'dayjs'
import Header from '../components/layout/Header'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import SegmentedControl from '../components/ui/SegmentedControl'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { useSettingsStore } from '../store/settingsStore'

const PERIODS = [
  { value: 'today',  label: 'Today' },
  { value: '7days',  label: '7 days' },
  { value: '30days', label: '30 days' },
  { value: 'month',  label: 'Month' },
  { value: 'year',   label: 'Year' },
]
const TYPE_LABELS = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery', 'drive-through': 'Drive-thru' }
const TYPE_COLORS = ['bg-ink', 'bg-zinc-500', 'bg-zinc-300', 'bg-emerald-400']
const REFRESH_MS = 30000

function xLabel(period, label) {
  if (!label) return ''
  if (period === 'today') return label
  if (period === 'year') return dayjs(label + '-01').format('MMM')
  return dayjs(label).format('D MMM')
}

function ChartTip({ active, payload, label, period, fmt }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="text-ink-3">{xLabel(period, label)}</p>
      <p className="mt-0.5 font-semibold text-ink tabular">{fmt(row.revenue)}</p>
      <p className="text-ink-3 tabular">{row.count} orders</p>
    </div>
  )
}

function useIsNarrow(px = 640) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < px)
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < px)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [px])
  return narrow
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const currency = useSettingsStore(s => s.currency)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('30days')
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)
  const narrow = useIsNarrow()

  const load = useCallback(async (p, { quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    const res = await window.api.invoke('dashboard:summary', { period: p })
    if (res.data) { setData(res.data); setUpdatedAt(dayjs()) }
    setLoading(false)
  }, [])

  useEffect(() => { load(period) }, [period, load])

  // Live: refresh quietly every 30 seconds while the page is open and visible
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(period, { quiet: true }) }, REFRESH_MS)
    const onVisible = () => { if (!document.hidden) load(period, { quiet: true }) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [period, load])

  const fmt = n => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  const pLabel = PERIODS.find(p => p.value === period)?.label || ''
  const chart = data?.chartData || []
  const periodRevenue = chart.reduce((s, d) => s + (d.revenue || 0), 0)
  const periodOrders = chart.reduce((s, d) => s + (d.count || 0), 0)
  const avgOrder = periodOrders ? periodRevenue / periodOrders : 0
  const topMax = data?.topItems?.[0]?.total_qty || 1
  const typesTotal = (data?.orderTypes || []).reduce((s, x) => s + x.count, 0) || 1

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header
        title={t('dashboard.title')}
        subtitle={updatedAt ? `Live · updated ${updatedAt.format('HH:mm:ss')}` : 'Loading…'}
        actions={
          <Button
            variant="secondary" size="sm"
            onClick={() => load(period)}
            disabled={loading}
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-5 sm:p-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard highlight label="Today" value={fmt(data?.today?.revenue)} sub={`${data?.today?.count || 0} orders`} icon={<TrendingUp size={16} />} />
            <StatCard label="Last 7 days" value={fmt(data?.week?.revenue)} sub={`${data?.week?.count || 0} orders`} icon={<ShoppingBag size={16} />} />
            <StatCard label="This month" value={fmt(data?.month?.revenue)} sub={`${data?.month?.count || 0} orders`} icon={<Calendar size={16} />} />
            <StatCard label="This year" value={fmt(data?.year?.revenue)} sub={`${data?.year?.count || 0} orders`} icon={<Award size={16} />} />
          </div>

          {/* Period */}
          <div className="no-scrollbar -mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <SegmentedControl ariaLabel="Report period" options={PERIODS} value={period} onChange={setPeriod} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Sales chart */}
            <Card className="lg:col-span-2">
              <CardHeader
                title={`Sales · ${pLabel}`}
                description={`${periodOrders} orders · average ${fmt(avgOrder)}`}
                actions={<span className="text-sm font-semibold text-ink tabular">{fmt(periodRevenue)}</span>}
              />
              <CardBody className="pt-4">
                {chart.length > 0 ? (
                  <div className="h-56 sm:h-64" role="img" aria-label={`Sales chart for ${pLabel}: total ${fmt(periodRevenue)} across ${periodOrders} orders`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart} margin={{ top: 4, right: 4, left: narrow ? -28 : -12, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid vertical={false} stroke="#ececef" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }}
                          tickFormatter={l => xLabel(period, l)} interval="preserveStartEnd" minTickGap={16} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={48}
                          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v} />
                        <Tooltip content={<ChartTip period={period} fmt={fmt} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="revenue" fill="#18181b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={<BarChart3 size={20} />} title="No sales in this period" description="Completed orders will appear here." />
                )}
              </CardBody>
            </Card>

            {/* Order types */}
            <Card>
              <CardHeader title="Order types" description={pLabel} />
              <CardBody>
                {data?.orderTypes?.length > 0 ? (
                  <div className="space-y-4">
                    {/* Stacked share bar */}
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      {data.orderTypes.map((x, i) => (
                        <div key={x.order_type} className={TYPE_COLORS[i % 4]} style={{ width: `${(x.count / typesTotal) * 100}%` }} />
                      ))}
                    </div>
                    <ul className="space-y-3">
                      {data.orderTypes.map((x, i) => (
                        <li key={x.order_type} className="flex items-center gap-3 text-sm">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${TYPE_COLORS[i % 4]}`} />
                          <span className="flex-1 text-ink-2">{TYPE_LABELS[x.order_type] || x.order_type}</span>
                          <span className="text-ink-3 tabular">{Math.round((x.count / typesTotal) * 100)}%</span>
                          <span className="w-10 text-end font-medium text-ink tabular">{x.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <EmptyState icon={<Receipt size={20} />} title="No orders yet" className="py-8" />
                )}
              </CardBody>
            </Card>
          </div>

          {/* Top items */}
          <Card>
            <CardHeader title="Best sellers" description={`${pLabel} · by quantity`} />
            {data?.topItems?.length > 0 ? (
              <ol className="divide-y divide-line">
                {data.topItems.map((item, i) => (
                  <li key={item.name_en} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular ${i === 0 ? 'bg-ink text-white' : 'bg-muted text-ink-2'}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium text-ink">{item.name_en}</p>
                        <p className="shrink-0 text-sm text-ink-3 tabular"><span className="font-medium text-ink">{item.total_qty}</span> sold</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-ink/80" style={{ width: `${Math.max(4, (item.total_qty / topMax) * 100)}%` }} />
                        </div>
                        <span className="hidden w-28 shrink-0 text-end text-xs text-ink-3 tabular sm:block">{fmt(item.total_revenue)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={<PackageOpen size={20} />} title="No items sold in this period" />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
