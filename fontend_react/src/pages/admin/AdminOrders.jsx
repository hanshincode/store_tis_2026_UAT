import { useState, useEffect } from 'react'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import { formatMoney, formatDateTime } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const STATUS_MAP = {
  pending:   { cls: 'bg-yellow-100 text-yellow-700', label: 'Chờ xử lý', icon: 'fa-clock' },
  confirmed: { cls: 'bg-blue-100 text-blue-700',     label: 'Đã xác nhận', icon: 'fa-check-circle' },
  paid:      { cls: 'bg-green-100 text-green-700',   label: 'Đã thanh toán', icon: 'fa-check-double' },
  completed: { cls: 'bg-green-100 text-green-700',   label: 'Hoàn thành', icon: 'fa-check-double' },
  cancelled: { cls: 'bg-red-100 text-red-700',       label: 'Đã hủy', icon: 'fa-times-circle' },
  processing:{ cls: 'bg-indigo-100 text-indigo-700',  label: 'Đang xử lý', icon: 'fa-spinner' },
}

export default function AdminOrders() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detailModal, setDetailModal]   = useState(null)

  const loadData = async () => {
    setLoading(true)
    try { setOrders(await fetchList('/orders/')) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const filtered = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase()
      if (!o.id?.toString().includes(q) && !o.customer_name?.toLowerCase().includes(q) && !o.user_name?.toLowerCase().includes(q)) return false
    }
    if (statusFilter && o.status !== statusFilter) return false
    return true
  })

  const updateStatus = async (id, status) => {
    const statusInfo = STATUS_MAP[status] || { label: status }
    const r = await Swal.fire({
      title: `Đổi trạng thái?`, html: `Chuyển sang: <b>${statusInfo.label}</b>`,
      showCancelButton: true, confirmButtonColor: '#D71920', confirmButtonText: 'Xác nhận', cancelButtonText: 'Hủy',
    })
    if (!r.isConfirmed) return
    try {
      await api.patch(`/orders/${id}/`, { status })
      toast.success(`Đã cập nhật: ${statusInfo.label}`)
      loadData()
      if (detailModal?.id === id) setDetailModal({ ...detailModal, status })
    } catch (err) { toast.error(getErrorMessage(err, 'Không thể cập nhật')) }
  }

  const Badge = ({ status }) => {
    const s = STATUS_MAP[status] || { cls: 'bg-gray-100 text-gray-600', label: status || '—', icon: 'fa-question' }
    return <span className={`badge-tis ${s.cls}`}><i className={`fas ${s.icon} text-xs mr-1`} />{s.label}</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="text-sm text-gray-400 mt-0.5">{orders.length} đơn hàng</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card mb-6 flex flex-wrap gap-4 items-center !p-4">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm đơn hàng (mã, khách)..." className="input-tis pl-10 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-tis text-sm w-auto min-w-[160px]">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="admin-card !p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center"><div className="spinner-tis" /></div>
        : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><i className="fas fa-file-invoice text-4xl mb-3" /><p>Không có đơn hàng nào.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Mã</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Ngày tạo</th><th>Trạng thái</th><th className="text-right">Hành động</th></tr></thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td className="font-bold text-gray-800">#{o.id}</td>
                    <td>
                      <p className="font-semibold text-sm text-gray-800">{o.customer_name || o.user_name || '—'}</p>
                      {o.customer_phone && <p className="text-xs text-gray-400 font-mono">{o.customer_phone}</p>}
                    </td>
                    <td className="text-sm text-gray-600 max-w-[200px] truncate">{o.product_name || o.items?.map(i => i.product_name).join(', ') || '—'}</td>
                    <td className="font-bold text-tis-red">{formatMoney(o.total_amount || o.total || 0)}</td>
                    <td className="text-xs text-gray-400">{formatDateTime(o.created_at)}</td>
                    <td><Badge status={o.status} /></td>
                    <td className="text-right">
                      <button onClick={() => setDetailModal(o)} className="p-2 text-gray-400 hover:text-blue-500" title="Chi tiết"><i className="fas fa-eye text-sm" /></button>
                      {o.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(o.id, 'confirmed')} className="p-2 text-gray-400 hover:text-green-500" title="Xác nhận"><i className="fas fa-check text-sm" /></button>
                          <button onClick={() => updateStatus(o.id, 'cancelled')} className="p-2 text-gray-400 hover:text-red-500" title="Hủy"><i className="fas fa-ban text-sm" /></button>
                        </>
                      )}
                      {o.status === 'confirmed' && (
                        <button onClick={() => updateStatus(o.id, 'completed')} className="p-2 text-gray-400 hover:text-green-500" title="Hoàn thành"><i className="fas fa-check-double text-sm" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-bold text-gray-900">Đơn hàng #{detailModal.id}</h3>
              <button onClick={() => setDetailModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><i className="fas fa-times text-sm" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-400">Khách hàng</label><p className="font-semibold text-gray-800">{detailModal.customer_name || detailModal.user_name || '—'}</p></div>
                <div><label className="text-xs text-gray-400">SĐT</label><p className="font-mono text-sm">{detailModal.customer_phone || '—'}</p></div>
                <div><label className="text-xs text-gray-400">Email</label><p className="text-sm">{detailModal.customer_email || '—'}</p></div>
                <div><label className="text-xs text-gray-400">Ngày tạo</label><p className="text-sm">{formatDateTime(detailModal.created_at)}</p></div>
              </div>
              <hr />
              <div><label className="text-xs text-gray-400">Sản phẩm</label><p className="font-semibold text-gray-800">{detailModal.product_name || '—'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-400">Tổng tiền</label><p className="text-xl font-bold text-tis-red">{formatMoney(detailModal.total_amount || detailModal.total || 0)}</p></div>
                <div><label className="text-xs text-gray-400">Trạng thái</label><div className="mt-1"><Badge status={detailModal.status} /></div></div>
              </div>
              {detailModal.note && <div><label className="text-xs text-gray-400">Ghi chú</label><p className="text-sm bg-gray-50 rounded-xl p-3">{detailModal.note}</p></div>}
              <hr />
              <div className="flex gap-2 flex-wrap">
                {detailModal.status === 'pending' && (
                  <>
                    <button onClick={() => { updateStatus(detailModal.id, 'confirmed'); setDetailModal(null) }} className="btn-tis-danger text-sm px-4 py-2"><i className="fas fa-check mr-1" />Xác nhận</button>
                    <button onClick={() => { updateStatus(detailModal.id, 'cancelled'); setDetailModal(null) }} className="btn-tis-ghost text-sm px-4 py-2 border border-red-200 rounded-full text-red-500"><i className="fas fa-ban mr-1" />Hủy đơn</button>
                  </>
                )}
                {detailModal.status === 'confirmed' && (
                  <button onClick={() => { updateStatus(detailModal.id, 'completed'); setDetailModal(null) }} className="btn-tis-danger text-sm px-4 py-2"><i className="fas fa-check-double mr-1" />Hoàn thành</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
