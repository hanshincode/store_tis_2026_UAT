import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import api, { fetchList, fetchOne } from '@/lib/api'
import { formatMoney, formatDate, formatDateTime } from '@/lib/format'

Chart.register(...registerables)

/* ── Helpers ─────────────────────────────────────────────── */
const CHART_TYPES = ['bar', 'doughnut', 'polarArea', 'pie', 'line']
const CHART_TYPE_ICONS = { bar: 'fa-chart-bar', doughnut: 'fa-chart-pie', polarArea: 'fa-compass', pie: 'fa-chart-pie', line: 'fa-chart-line' }

const STATUS_MAP = {
  awaiting_payment: { label: 'Chờ thanh toán', color: '#f59e0b' },
  pending:          { label: 'Chờ duyệt',     color: '#6366f1' },
  confirmed:        { label: 'Hiệu lực',      color: '#22c55e' },
  payment_expired:  { label: 'QR hết hạn',    color: '#ef4444' },
  cancelled:        { label: 'Đã hủy',        color: '#94a3b8' },
}
const PAY_MAP = {
  paid:    { label: 'Đã thanh toán', color: '#22c55e' },
  unpaid:  { label: 'Chờ thanh toán', color: '#f59e0b' },
  expired: { label: 'QR hết hạn',    color: '#ef4444' },
  cancelled: { label: 'Đã hủy',     color: '#94a3b8' },
}
const CONSULT_MAP = {
  new:        { label: 'Mới',          color: '#6366f1' },
  processing: { label: 'Đang xử lý',  color: '#f59e0b' },
  replied:    { label: 'Chờ trả lời',  color: '#3b82f6' },
  archived:   { label: 'Đã lưu trữ',  color: '#94a3b8' },
}

function useChart(canvasRef, config) {
  const chartRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, config)
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [config])
}

/* ── StatCard ────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="admin-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <i className={`fas ${icon} text-lg text-white`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ── ChartCard ───────────────────────────────────────────── */
function ChartCard({ title, icon, dataMap, items, keyField, defaultType = 'bar' }) {
  const canvasRef = useRef(null)
  const [chartType, setChartType] = useState(defaultType)

  const { labels, colors, counts } = useMemo(() => ({
    labels: Object.values(dataMap).map(v => v.label),
    colors: Object.values(dataMap).map(v => v.color),
    counts: Object.keys(dataMap).map(k => items.filter(i => i[keyField] === k).length),
  }), [dataMap, items, keyField])

  const config = useMemo(() => ({
    type: chartType,
    data: {
      labels,
      datasets: [{ data: counts, backgroundColor: colors, borderColor: colors, borderWidth: chartType === 'line' ? 2 : 0, fill: chartType === 'line', tension: 0.4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } } },
      scales: ['bar', 'line'].includes(chartType) ? { y: { beginAtZero: true, ticks: { stepSize: 1 } } } : undefined,
    }
  }), [chartType, labels, colors, counts])

  useChart(canvasRef, config)

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          <i className={`fas ${icon} text-tis-red`} /> {title}
        </h3>
        <div className="flex gap-1">
          {CHART_TYPES.filter(t => ['bar','doughnut','polarArea','pie','line'].includes(t)).slice(0, 3).map(t => (
            <button key={t} onClick={() => setChartType(t)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${chartType === t ? 'bg-tis-red text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title={t}>
              <i className={`fas ${CHART_TYPE_ICONS[t]}`} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 220 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

/* ── Revenue7DaysChart ───────────────────────────────────── */
function Revenue7DaysChart({ orders }) {
  const canvasRef = useRef(null)
  const [chartType, setChartType] = useState('line')

  const { labels, data } = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days.push(d.toISOString().slice(0, 10))
    }
    const map = {}
    days.forEach(d => map[d] = 0)
    orders.filter(o => o.payment_status === 'paid').forEach(o => {
      const day = (o.created_at || '').slice(0, 10)
      if (map[day] !== undefined) map[day] += Number(o.total_amount || o.total || 0)
    })
    return { labels: days.map(d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}` }), data: days.map(d => map[d]) }
  }, [orders])

  const config = useMemo(() => ({
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: 'Doanh thu (đ)',
        data,
        backgroundColor: chartType === 'line' ? 'rgba(215,25,32,0.1)' : '#D71920',
        borderColor: '#D71920',
        borderWidth: 2, fill: true, tension: 0.4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v } } }
    }
  }), [chartType, labels, data])

  useChart(canvasRef, config)

  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          <i className="fas fa-chart-line text-tis-red" /> Doanh thu 7 ngày qua
        </h3>
        <div className="flex gap-1">
          {['line', 'bar'].map(t => (
            <button key={t} onClick={() => setChartType(t)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${chartType === t ? 'bg-tis-red text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              <i className={`fas ${CHART_TYPE_ICONS[t]}`} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 220 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

/* ── ProviderFilter ──────────────────────────────────────── */
function ProviderFilter({ orders }) {
  const [statusFilter, setStatusFilter] = useState('paid')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amtFrom, setAmtFrom] = useState('')
  const [amtTo, setAmtTo] = useState('')

  const filtered = useMemo(() => {
    let list = [...orders]
    if (statusFilter === 'paid') list = list.filter(o => o.payment_status === 'paid')
    else if (statusFilter === 'confirmed') list = list.filter(o => o.status === 'confirmed')
    if (dateFrom) list = list.filter(o => (o.created_at || '') >= dateFrom)
    if (dateTo) list = list.filter(o => (o.created_at || '').slice(0, 10) <= dateTo)
    if (amtFrom) list = list.filter(o => Number(o.total_amount || o.total || 0) >= Number(amtFrom))
    if (amtTo) list = list.filter(o => Number(o.total_amount || o.total || 0) <= Number(amtTo))
    return list
  }, [orders, statusFilter, dateFrom, dateTo, amtFrom, amtTo])

  const providerData = useMemo(() => {
    const map = {}
    filtered.forEach(o => {
      (o.items || []).forEach(it => {
        const name = it.provider_name || it.product_name || 'Khác'
        map[name] = (map[name] || 0) + Number(it.subtotal || it.price || 0)
      })
      if (!o.items?.length) {
        const name = o.provider_name || 'Khác'
        map[name] = (map[name] || 0) + Number(o.total_amount || o.total || 0)
      }
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const maxRevenue = providerData[0]?.[1] || 1

  return (
    <div className="admin-card">
      <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm mb-4">
        <i className="fas fa-filter text-tis-red" /> Doanh số theo Nhà cung cấp
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="input-tis text-xs !py-1.5">
          <option value="all">Tất cả</option>
          <option value="paid">Đã thanh toán</option>
          <option value="confirmed">Đã chốt</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-tis text-xs !py-1.5" placeholder="Từ ngày" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-tis text-xs !py-1.5" placeholder="Đến ngày" />
        <input type="number" value={amtFrom} onChange={e => setAmtFrom(e.target.value)} className="input-tis text-xs !py-1.5" placeholder="Từ (đ)" />
        <input type="number" value={amtTo} onChange={e => setAmtTo(e.target.value)} className="input-tis text-xs !py-1.5" placeholder="Đến (đ)" />
      </div>
      <div className="space-y-2.5 max-h-72 overflow-y-auto">
        {providerData.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Không có dữ liệu</p>}
        {providerData.map(([name, total], i) => (
          <div key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-gray-700"><span className="text-tis-red mr-1">#{i + 1}</span>{name}</span>
              <span className="font-bold text-tis-red">{formatMoney(total)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-red-500 to-red-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(total / maxRevenue * 100).toFixed(1)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────── */
export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [orders, setOrders] = useState([])
  const [consults, setConsults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [sum, ords, cons] = await Promise.all([
          fetchOne('/dashboard/summary/').catch(() => ({})),
          fetchList('/orders/?page_size=1000').catch(() => []),
          fetchList('/consultations/?page_size=1000').catch(() => []),
        ])
        setSummary(sum)
        setOrders(ords)
        setConsults(cons)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  /* derived stats */
  const revenue = useMemo(() => orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_amount || o.total || 0), 0), [orders])
  const pendingCount = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders])
  const activeCount = useMemo(() => orders.filter(o => o.status === 'confirmed').length, [orders])
  const newConsults = useMemo(() => consults.filter(c => c.status === 'new').length, [consults])
  const chatWaiting = useMemo(() => consults.filter(c => c.last_message && c.last_message.is_staff === false).length, [consults])
  const recentOrders = useMemo(() => [...orders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6), [orders])

  /* tasks */
  const tasks = useMemo(() => {
    const paidPending = orders.filter(o => o.payment_status === 'paid' && o.status === 'pending').length
    const awaitPay = orders.filter(o => o.status === 'awaiting_payment' && o.payment_status === 'unpaid').length
    const expiredQR = orders.filter(o => o.payment_status === 'expired' || o.status === 'payment_expired').length
    return [
      { icon: 'fa-check-circle', label: 'Duyệt đơn đã thanh toán', count: paidPending, color: 'text-green-500', link: '/admin/orders' },
      { icon: 'fa-clock', label: 'Nhắc khách thanh toán', count: awaitPay, color: 'text-yellow-500', link: '/admin/orders' },
      { icon: 'fa-redo', label: 'Tạo lại QR hết hạn', count: expiredQR, color: 'text-red-500', link: '/admin/orders' },
      { icon: 'fa-headset', label: 'Tư vấn & chat mới', count: newConsults + chatWaiting, color: 'text-blue-500', link: '/admin/consultations' },
    ]
  }, [orders, newConsults, chatWaiting])

  /* order flow */
  const orderFlow = useMemo(() => {
    const total = orders.length || 1
    return Object.entries(STATUS_MAP).map(([k, v]) => ({
      ...v, count: orders.filter(o => o.status === k).length, pct: ((orders.filter(o => o.status === k).length / total) * 100).toFixed(1)
    }))
  }, [orders])

  const statusBadge = (status) => {
    const map = {
      awaiting_payment: { cls: 'bg-yellow-100 text-yellow-700', label: 'Chờ TT' },
      pending: { cls: 'bg-indigo-100 text-indigo-700', label: 'Chờ duyệt' },
      confirmed: { cls: 'bg-green-100 text-green-700', label: 'Hiệu lực' },
      payment_expired: { cls: 'bg-red-100 text-red-700', label: 'Hết hạn' },
      cancelled: { cls: 'bg-gray-100 text-gray-600', label: 'Đã hủy' },
    }
    const s = map[status] || { cls: 'bg-gray-100 text-gray-600', label: status || '—' }
    return <span className={`badge-tis ${s.cls}`}>{s.label}</span>
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tổng quan hoạt động hệ thống</p>
        </div>
        <span className="text-xs text-gray-400">
          <i className="far fa-clock mr-1" /> Cập nhật: {new Date().toLocaleString('vi-VN')}
        </span>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard icon="fa-money-bill-wave" label="Doanh thu đã thu" value={formatMoney(summary?.revenue ?? revenue)} sub={`${orders.filter(o => o.payment_status === 'paid').length} đơn đã thanh toán`} color="bg-gradient-to-br from-green-500 to-green-600" />
        <StatCard icon="fa-hourglass-half" label="Chờ admin duyệt" value={summary?.pending_orders ?? pendingCount} sub="Đơn hàng chờ xác nhận" color="bg-gradient-to-br from-amber-500 to-amber-600" />
        <StatCard icon="fa-file-invoice" label="Tổng đơn hàng" value={summary?.total_orders ?? orders.length} sub={`${activeCount} đơn đang hiệu lực`} color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard icon="fa-comments" label="Yêu cầu tư vấn mới" value={newConsults} sub={`${chatWaiting} chat chờ trả lời`} color="bg-gradient-to-br from-purple-500 to-purple-600" />
      </div>

      {/* ── Charts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Đơn hàng theo trạng thái" icon="fa-box-open" dataMap={STATUS_MAP} items={orders} keyField="status" defaultType="bar" />
        <Revenue7DaysChart orders={orders} />
        <ChartCard title="Thống kê thanh toán" icon="fa-credit-card" dataMap={PAY_MAP} items={orders} keyField="payment_status" defaultType="doughnut" />
        <ChartCard title="Tình trạng tư vấn" icon="fa-headset" dataMap={CONSULT_MAP} items={consults} keyField="status" defaultType="bar" />
      </div>

      {/* ── Tasks + Order Flow ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="admin-card">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm mb-4">
            <i className="fas fa-tasks text-tis-red" /> Việc cần xử lý
          </h3>
          <div className="space-y-3">
            {tasks.map(t => (
              <Link key={t.label} to={t.link} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-white ${t.color}`}>
                  <i className={`fas ${t.icon}`} />
                </div>
                <span className="text-sm font-medium text-gray-700 flex-1">{t.label}</span>
                <span className={`min-w-6 h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center ${t.count > 0 ? 'bg-tis-red text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {t.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm mb-4">
            <i className="fas fa-stream text-tis-red" /> Luồng đơn hàng
          </h3>
          <div className="space-y-3">
            {orderFlow.map(f => (
              <div key={f.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: f.color }} />
                    {f.label}
                  </span>
                  <span className="font-bold" style={{ color: f.color }}>{f.count} <span className="text-gray-400 font-normal">({f.pct}%)</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${f.pct}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Provider Filter ─────────────────────────────────── */}
      <div className="mb-8">
        <ProviderFilter orders={orders} />
      </div>

      {/* ── Recent Orders ───────────────────────────────────── */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
            <i className="fas fa-file-invoice text-tis-red" /> Đơn hàng mới nhất
          </h3>
          <Link to="/admin/orders" className="text-xs text-tis-red font-semibold hover:underline">Xem tất cả →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Chưa có đơn hàng</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>SĐT</th>
                  <th>Tổng tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className="font-medium text-gray-800 font-mono text-xs">{o.code || `#${o.id}`}</td>
                    <td className="font-medium">{o.customer_name || o.user_name || '—'}</td>
                    <td className="font-mono text-xs text-gray-500">{o.customer_phone || o.user_phone || '—'}</td>
                    <td className="font-bold text-tis-red">{formatMoney(o.total_amount || o.total)}</td>
                    <td>{statusBadge(o.payment_status)}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td className="text-gray-400 text-xs">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
