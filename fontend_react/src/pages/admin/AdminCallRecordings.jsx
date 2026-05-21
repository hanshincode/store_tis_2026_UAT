import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminCallRecordings() {
  const [recordings, setRecordings] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    total_duration_seconds: 0,
    total_size: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeRecording, setActiveRecording] = useState(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
      const [recordingsRes, statsRes] = await Promise.all([
        api.get(`/call-recordings/${query}`),
        api.get(`/call-recordings/stats/${query}`)
      ])
      
      const recordingsData = recordingsRes.data
      setRecordings(Array.isArray(recordingsData) ? recordingsData : (recordingsData.results || []))
      setStats(statsRes.data || { total: 0, total_duration_seconds: 0, total_size: 0 })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải danh sách bản ghi cuộc gọi'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleResetSearch = () => {
    setSearch('')
    // We cannot immediately query since state hasn't updated yet, so we load using empty query.
    setLoading(true)
    api.all([
      api.get('/call-recordings/'),
      api.get('/call-recordings/stats/')
    ]).then(api.spread((recordingsRes, statsRes) => {
      const recordingsData = recordingsRes.data
      setRecordings(Array.isArray(recordingsData) ? recordingsData : (recordingsData.results || []))
      setStats(statsRes.data || { total: 0, total_duration_seconds: 0, total_size: 0 })
    })).catch(err => {
      toast.error(getErrorMessage(err, 'Không thể tải danh sách bản ghi cuộc gọi'))
    }).finally(() => {
      setLoading(false)
    })
  }

  const handleOpenRecording = (recording) => {
    setActiveRecording(recording)
    setShowPlayerModal(true)
  }

  const handleCopyRecordingLink = async (recording) => {
    if (!recording?.file_url) return
    try {
      await navigator.clipboard.writeText(recording.file_url)
      toast.success('Đã sao chép link bản ghi cuộc gọi')
    } catch (error) {
      Swal.fire({
        title: 'Đường dẫn bản ghi',
        text: recording.file_url,
        icon: 'info',
        confirmButtonText: 'Đóng'
      })
    }
  }

  // Format Helper functions
  const formatFileSize = (bytes) => {
    const value = Number(bytes || 0)
    if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`
    return `${value} B`
  }

  const formatCallDurationText = (seconds) => {
    const s = Number(seconds || 0)
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const remainingSeconds = Math.floor(s % 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Lịch sử cuộc gọi</span>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-0.5">
            <i className="fas fa-phone-volume text-blue-600 animate-pulse" /> Ghi âm cuộc gọi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Xem và nghe lại ghi âm các cuộc gọi hỗ trợ, tư vấn khách hàng trên hệ thống.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50 font-medium flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6 bg-white shadow-sm rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-lg font-bold">
            <i className="fas fa-microphone" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Tổng số cuộc gọi</span>
            <strong className="text-2xl text-gray-800">{Number(stats.total || 0).toLocaleString('vi-VN')}</strong>
          </div>
        </div>

        <div className="admin-card p-6 bg-white shadow-sm rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 text-lg font-bold">
            <i className="fas fa-clock" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Tổng thời lượng ghi âm</span>
            <strong className="text-2xl text-gray-800">{formatCallDurationText(stats.total_duration_seconds || 0)}</strong>
          </div>
        </div>

        <div className="admin-card p-6 bg-white shadow-sm rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 text-lg font-bold">
            <i className="fas fa-hdd" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Tổng dung lượng lưu trữ</span>
            <strong className="text-2xl text-gray-800">{formatFileSize(stats.total_size || 0)}</strong>
          </div>
        </div>
      </div>

      {/* Search Filter and Table */}
      <div className="admin-card bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-800">Danh sách file ghi âm</h2>
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto max-w-md">
            <input
              type="text"
              placeholder="Tìm số điện thoại, tên khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-tis py-1.5 px-3 text-xs w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0"
            >
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={handleResetSearch}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition shrink-0"
            >
              Đặt lại
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="spinner-tis" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <i className="fas fa-microphone-slash text-4xl mb-3 text-gray-300 block" />
              Không có bản ghi cuộc gọi nào được tìm thấy.
            </div>
          ) : (
            <table className="admin-table w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Thời gian cuộc gọi</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Khách hàng</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Nhân viên tiếp nhận</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Thời lượng</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Dung lượng file</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b last:border-b-0">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{item.created_at || '--'}</div>
                      <div className="text-xs text-gray-400">#{item.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{item.consultation_name || 'Khách hàng'}</div>
                      <div className="text-xs text-gray-500">{item.consultation_contact || '--'}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {item.recorded_by_name || '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-700 font-mono">
                      {formatCallDurationText(item.duration_seconds || 0)}
                    </td>
                    <td className="p-4 text-sm text-gray-700 font-mono">
                      {formatFileSize(item.file_size || 0)}
                    </td>
                    <td className="p-4 text-end">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRecording(item)}
                          title="Nghe lại cuộc gọi"
                          className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-red-50 text-gray-600 hover:text-red-500 flex items-center justify-center shadow-sm transition"
                        >
                          <i className="fas fa-play text-xs" />
                        </button>
                        <button
                          onClick={() => handleCopyRecordingLink(item)}
                          title="Sao chép liên kết"
                          className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-500 flex items-center justify-center shadow-sm transition"
                        >
                          <i className="fas fa-link text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audio/Video Player Modal */}
      {showPlayerModal && activeRecording && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Chi tiết bản ghi cuộc gọi</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Mã: #{activeRecording.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPlayerModal(false)
                  setActiveRecording(null)
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition"
              >
                <i className="fas fa-times" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">Khách hàng</span>
                    <strong className="text-gray-800">{activeRecording.consultation_name || 'Khách hàng'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Liên hệ</span>
                    <strong className="text-gray-800">{activeRecording.consultation_contact || '--'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Thời lượng</span>
                    <strong className="text-gray-800 font-mono">{formatCallDurationText(activeRecording.duration_seconds || 0)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Thời gian</span>
                    <strong className="text-gray-800">{activeRecording.created_at || ''}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-gray-950 rounded-xl">
                {activeRecording.file_url ? (
                  activeRecording.file_url.toLowerCase().endsWith('.mp4') ? (
                    <video
                      src={activeRecording.file_url}
                      controls
                      playsInline
                      className="w-full rounded bg-black max-h-64"
                    />
                  ) : (
                    <div className="w-full py-4 px-2 flex flex-col items-center">
                      <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-3">
                        <i className="fas fa-volume-up text-lg" />
                      </div>
                      <audio
                        src={activeRecording.file_url}
                        controls
                        className="w-full"
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    <i className="fas fa-exclamation-triangle text-amber-500 text-lg mb-2 block" />
                    Không tìm thấy đường dẫn file âm thanh/video
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <a
                href={activeRecording.file_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-xs font-semibold hover:bg-white flex items-center gap-1.5 transition shadow-sm"
              >
                <i className="fas fa-external-link-alt text-gray-400" /> Tải về / Mở tab mới
              </a>
              <button
                type="button"
                onClick={() => handleCopyRecordingLink(activeRecording)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <i className="fas fa-link" /> Sao chép liên kết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
