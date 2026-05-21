import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { fetchList, fetchOne } from '@/lib/api'
import { formatMoney, formatDate, formatDateTime } from '@/lib/format'

function StatCard({ icon, label, value, color, trend }) {
  return (
    <div className="admin-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <i className={`fas ${icon} text-lg text-white`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      {trend && (
        <span className={`text-xs font-semibold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          <i className={`fas fa-arrow-${trend > 0 ? 'up' : 'down'} mr-1`} />{Math.abs(trend)}%
        </span>
      )}
    </div>
  )
}

function RecentTable({ title, icon, items, columns, renderRow, emptyText, viewAllLink }) {
  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <i className={`fas ${icon} text-tis-red`} /> {title}
        </h3>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-xs text-tis-red font-semibold hover:underline">
            Xem tất cả →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">{emptyText || 'Chưa có dữ liệu'}</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="admin-table">
            <thead>
              <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
            </thead>
            <tbody>{items.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]               = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [recentConsults, setRecentConsults] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, orders, consults] = await Promise.all([
          fetchOne('/dashboard/stats/').catch(() => ({})),
          fetchList('/orders/?page_size=5').catch(() => []),
          fetchList('/consultations/?page_size=5').catch(() => []),
        ])
        setStats(statsData)
        setRecentOrders(orders)
        setRecentConsults(consults)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const statusBadge = (status) => {
    const map = {
      pending:   { cls: 'bg-yellow-100 text-yellow-700', label: 'Chờ xử lý' },
      confirmed: { cls: 'bg-blue-100 text-blue-700',     label: 'Đã xác nhận' },
      completed: { cls: 'bg-green-100 text-green-700',   label: 'Hoàn thành' },
      cancelled: { cls: 'bg-red-100 text-red-700',       label: 'Đã hủy' },
      paid:      { cls: 'bg-green-100 text-green-700',   label: 'Đã thanh toán' },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard icon="fa-box-open"     label="Sản phẩm"         value={stats?.product_count ?? '—'}       color="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard icon="fa-file-invoice" label="Đơn hàng"         value={stats?.order_count ?? '—'}         color="bg-gradient-to-br from-green-500 to-green-600" />
        <StatCard icon="fa-comments"     label="Yêu cầu tư vấn"  value={stats?.consultation_count ?? '—'}  color="bg-gradient-to-br from-orange-500 to-orange-600" />
        <StatCard icon="fa-users"        label="Khách hàng"       value={stats?.user_count ?? '—'}          color="bg-gradient-to-br from-purple-500 to-purple-600" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { to: '/admin/products',      icon: 'fa-plus',         label: 'Thêm sản phẩm', color: 'text-blue-500' },
          { to: '/admin/orders',        icon: 'fa-file-invoice', label: 'Xem đơn hàng',   color: 'text-green-500' },
          { to: '/admin/consultations', icon: 'fa-headset',      label: 'Tư vấn mới',     color: 'text-orange-500' },
          { to: '/admin/banners',       icon: 'fa-images',       label: 'Quản lý Banner', color: 'text-purple-500' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className="admin-card flex items-center gap-3 hover:shadow-lg transition-shadow cursor-pointer group !p-4">
            <i className={`fas ${a.icon} ${a.color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm font-medium text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTable
          title="Đơn hàng gần đây"
          icon="fa-file-invoice"
          items={recentOrders}
          columns={['#', 'Khách hàng', 'Tổng tiền', 'Trạng thái']}
          viewAllLink="/admin/orders"
          renderRow={(o) => (
            <tr key={o.id}>
              <td className="font-medium text-gray-800">#{o.id}</td>
              <td>{o.customer_name || o.user_name || '—'}</td>
              <td className="font-bold text-tis-red">{formatMoney(o.total_amount || o.total)}</td>
              <td>{statusBadge(o.status)}</td>
            </tr>
          )}
        />
        <RecentTable
          title="Yêu cầu tư vấn mới"
          icon="fa-comments"
          items={recentConsults}
          columns={['Khách hàng', 'SĐT', 'Thời gian']}
          viewAllLink="/admin/consultations"
          renderRow={(c) => (
            <tr key={c.id}>
              <td className="font-medium text-gray-800">{c.customer_name || '—'}</td>
              <td className="font-mono text-sm">{c.customer_contact || '—'}</td>
              <td className="text-gray-400 text-xs">{formatDateTime(c.created_at)}</td>
            </tr>
          )}
        />
      </div>
    </div>
  )
}
