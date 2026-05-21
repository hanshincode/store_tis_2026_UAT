import { useState, useEffect } from 'react'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import { formatDateTime, normalizeList } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({
    total_count: 0,
    info_count: 0,
    warning_count: 0,
    error_count: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    event_type: '',
    method: '',
    status_group: '',
    date_from: '',
    date_to: '',
    ordering: '-created_at',
  })

  // Selected Log for detail Modal
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const buildQueryString = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        if (k === 'date_from' || k === 'date_to') {
          const iso = new Date(v).toISOString()
          params.set(k, iso)
        } else {
          params.set(k, String(v).trim())
        }
      }
    })
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const query = buildQueryString()
      const [logsRes, statsRes] = await Promise.all([
        api.get(`/system-logs/${query}`),
        api.get(`/system-logs/stats/${query}`),
      ])

      const logsData = logsRes.data
      setLogs(Array.isArray(logsData) ? logsData : logsData.results || [])
      setStats(statsRes.data || {})
    } catch (err) {
      toast.error('Lỗi tải nhật ký hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      level: '',
      event_type: '',
      method: '',
      status_group: '',
      date_from: '',
      date_to: '',
      ordering: '-created_at',
    })
    // Can't use loadData immediately because state updates are async, so fetch using default filters
    setTimeout(() => {
      loadData()
    }, 50)
  }

  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast.error('Không có log để xuất')
      return
    }

    const headers = [
      'Thời gian',
      'Cấp độ',
      'Loại sự kiện',
      'Phương thức',
      'Status code',
      'Thời gian phản hồi',
      'Đường dẫn',
      'Người dùng',
      'IP Address',
      'Thông báo',
    ]

    const csvCell = (val) => `"${String(val || '').replace(/"/g, '""')}"`

    const rows = logs.map((log) => [
      formatDateTime(log.created_at),
      (log.level || '').toUpperCase(),
      log.event_type || '',
      log.method || '',
      log.status_code || '',
      log.duration_ms !== null && log.duration_ms !== undefined ? `${log.duration_ms}ms` : '',
      log.path || '',
      log.user_display || log.username || 'Anonymous',
      log.ip_address || '',
      log.message || '',
    ])

    const csvContent = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tis-system-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất báo cáo CSV thành công!')
  }

  const getLevelBadgeCls = (level) => {
    switch (String(level).toLowerCase()) {
      case 'info':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'error':
        return 'bg-red-50 text-red-700 border border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  const getStatusBadgeCls = (status) => {
    const code = Number(status || 0)
    if (code >= 200 && code < 300) return 'bg-green-50 text-green-700 border border-green-200'
    if (code >= 300 && code < 400) return 'bg-sky-50 text-sky-700 border border-sky-200'
    if (code >= 400 && code < 500) return 'bg-orange-50 text-orange-700 border border-orange-200'
    if (code >= 500) return 'bg-red-100 text-red-800 border border-red-300'
    return 'bg-gray-100 text-gray-600'
  }

  const openLogDetail = (log) => {
    setSelectedLog(log)
    setShowDetailModal(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">Giám sát và kiểm tra lịch sử thao tác hệ thống (Audit Logs)</p>
        </div>
        <button onClick={handleExportCsv} className="btn-tis-danger text-sm flex items-center gap-1.5 font-semibold">
          <i className="fas fa-file-export" /> Xuất file CSV
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="admin-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-500 text-lg">
            <i className="fas fa-list" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Tổng số Log</span>
            <strong className="text-lg text-gray-800 block mt-0.5">
              {Number(stats.total_count || 0).toLocaleString('vi-VN')}
            </strong>
          </div>
        </div>

        <div className="admin-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-blue-50 text-blue-500 flex items-center justify-center text-lg">
            <i className="fas fa-info-circle" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Thông tin (Info)</span>
            <strong className="text-lg text-blue-700 block mt-0.5">
              {Number(stats.info_count || 0).toLocaleString('vi-VN')}
            </strong>
          </div>
        </div>

        <div className="admin-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-yellow-50 text-yellow-500 flex items-center justify-center text-lg">
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Cảnh báo (Warning)</span>
            <strong className="text-lg text-yellow-700 block mt-0.5">
              {Number(stats.warning_count || 0).toLocaleString('vi-VN')}
            </strong>
          </div>
        </div>

        <div className="admin-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-red-50 text-red-500 flex items-center justify-center text-lg">
            <i className="fas fa-times-circle" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400">Lỗi (Error)</span>
            <strong className="text-lg text-red-700 block mt-0.5">
              {Number(stats.error_count || 0).toLocaleString('vi-VN')}
            </strong>
          </div>
        </div>
      </div>

      {/* Filters Form */}
      <div className="admin-card mb-6">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">Từ khóa tìm kiếm</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Tìm nội dung, path, IP..."
                className="input-tis text-sm w-full"
              />
            </div>

            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">Cấp độ (Level)</label>
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="input-tis text-sm w-full"
              >
                <option value="">Tất cả</option>
                <option value="info">INFO</option>
                <option value="warning">WARNING</option>
                <option value="error">ERROR</option>
              </select>
            </div>

            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">Nhóm Status Code</label>
              <select
                value={filters.status_group}
                onChange={(e) => setFilters({ ...filters, status_group: e.target.value })}
                className="input-tis text-sm w-full"
              >
                <option value="">Tất cả</option>
                <option value="2xx">Thành công (2xx)</option>
                <option value="3xx">Chuyển hướng (3xx)</option>
                <option value="4xx">Lỗi Client (4xx)</option>
                <option value="5xx">Lỗi Server (5xx)</option>
              </select>
            </div>

            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">HTTP Method</label>
              <select
                value={filters.method}
                onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                className="input-tis text-sm w-full"
              >
                <option value="">Tất cả</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">Từ ngày</label>
              <input
                type="datetime-local"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="input-tis text-sm w-full"
              />
            </div>

            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">Đến ngày</label>
              <input
                type="datetime-local"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="input-tis text-sm w-full"
              />
            </div>

            <div>
              <label className="label-tis text-xs mb-1 font-semibold text-gray-500 uppercase block">Sắp xếp</label>
              <select
                value={filters.ordering}
                onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}
                className="input-tis text-sm w-full"
              >
                <option value="-created_at">Mới nhất trước</option>
                <option value="created_at">Cũ nhất trước</option>
                <option value="duration_ms">Thời gian xử lý tăng dần</option>
                <option value="-duration_ms">Thời gian xử lý giảm dần</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Xóa lọc
              </button>
              <button
                type="submit"
                className="flex-1 btn-tis-danger text-sm py-2 font-semibold"
              >
                <i className="fas fa-filter mr-1.5" /> Lọc kết quả
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden !p-0">
        {loading ? (
          <div className="py-12 text-center">
            <div className="spinner-tis" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-receipt text-4xl mb-3" />
            <p>Không tìm thấy nhật ký hoạt động nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-xs">
              <thead>
                <tr>
                  <th className="pl-4">Thời gian</th>
                  <th>Cấp độ</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Đường dẫn & Mô tả</th>
                  <th>Người thao tác</th>
                  <th>Xử lý</th>
                  <th className="text-right pr-4">Xem</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="pl-4 font-semibold text-gray-900">
                      <div>{formatDateTime(log.created_at)}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{log.event_type}</div>
                    </td>
                    <td>
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${getLevelBadgeCls(log.level)}`}>
                        {(log.level || 'info').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className="px-1.5 py-0.5 font-bold rounded bg-gray-100 text-gray-700 border border-gray-200 font-mono">
                        {log.method || '--'}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${getStatusBadgeCls(log.status_code)}`}>
                        {log.status_code || '--'}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-gray-800 max-w-[280px] truncate" title={log.path}>
                        {log.path || '--'}
                      </div>
                      <div className="text-gray-400 line-clamp-1 max-w-[280px]" title={log.message}>
                        {log.message || ''}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold text-gray-800">
                        {log.user_display || log.username || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-gray-400">{log.ip_address || '--'}</div>
                    </td>
                    <td className="font-mono text-gray-600">
                      {log.duration_ms !== null && log.duration_ms !== undefined ? `${log.duration_ms}ms` : '--'}
                    </td>
                    <td className="text-right pr-4">
                      <button
                        onClick={() => openLogDetail(log)}
                        className="p-1 border border-gray-200 rounded hover:text-red-500 hover:border-red-500 transition text-gray-400"
                        title="Xem chi tiết metadata"
                      >
                        <i className="fas fa-eye text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">
                Chi tiết nhật ký #{selectedLog.id}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Thời gian</span>
                  <span className="text-sm font-semibold text-gray-800">{formatDateTime(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Cấp độ (Level)</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] mt-0.5 ${getLevelBadgeCls(selectedLog.level)}`}>
                    {(selectedLog.level || 'info').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Status Code</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded font-bold mt-0.5 ${getStatusBadgeCls(selectedLog.status_code)}`}>
                    {selectedLog.status_code || '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Xử lý (MS)</span>
                  <span className="text-sm font-semibold text-gray-850">{selectedLog.duration_ms ?? '--'} ms</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Loại sự kiện</span>
                  <span className="text-sm font-semibold text-gray-800 bg-gray-50 px-2.5 py-1 rounded mt-1 block">
                    {selectedLog.event_type || '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Người thao tác</span>
                  <span className="text-sm font-semibold text-gray-800 bg-gray-50 px-2.5 py-1 rounded mt-1 block">
                    {selectedLog.user_display || selectedLog.username || 'Anonymous'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Địa chỉ IP</span>
                  <span className="text-sm font-semibold text-gray-800 bg-gray-50 px-2.5 py-1 rounded mt-1 block font-mono">
                    {selectedLog.ip_address || '--'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Đường dẫn Request (Path)</span>
                <code className="block bg-gray-900 text-green-400 rounded p-3 text-xs font-mono select-all overflow-x-auto whitespace-nowrap">
                  {selectedLog.method} {selectedLog.path || '--'}
                </code>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Thông báo lỗi / Mô tả</span>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 border border-gray-150 whitespace-pre-wrap leading-relaxed">
                  {selectedLog.message || '--'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">User Agent trình duyệt</span>
                <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 font-mono">
                  {selectedLog.user_agent || '--'}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Dữ liệu Metadata chi tiết</span>
                <pre className="bg-gray-900 text-gray-200 rounded p-4 text-xs font-mono overflow-auto max-h-[250px]">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
