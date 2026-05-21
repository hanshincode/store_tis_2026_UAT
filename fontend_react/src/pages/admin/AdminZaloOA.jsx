import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminZaloOA() {
  const { user: currentAdminUser } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [inputText, setInputText] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)

  const messageBoxRef = useRef(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [convsData, staffData] = await Promise.all([
        api.get('/zalo-oa-conversations/').then(res => res.data),
        fetchList('/users/staff-list/')
      ])
      
      const normalizedConvs = Array.isArray(convsData) ? convsData : (convsData.results || [])
      setConversations(normalizedConvs)
      
      const normalizedStaff = Array.isArray(staffData) ? staffData : (staffData.results || [])
      setStaffList(normalizedStaff.filter(s => s.role === 'staff' && s.is_active))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải dữ liệu Zalo OA'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto scroll to bottom when messages load
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight
    }
  }, [messages])

  const loadMessages = async (convId) => {
    setLoadingMessages(true)
    try {
      const { data } = await api.get(`/consultations/${convId}/messages/`)
      setMessages(data)
    } catch (err) {
      toast.error('Không thể tải lịch sử tin nhắn')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSelectConversation = (conv) => {
    setActiveConv(conv)
    setSelectedStaffId(conv.assigned_staff || '')
    loadMessages(conv.id)
  }

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!activeConv || !inputText.trim() || sending) return
    
    setSending(true)
    const textToSend = inputText.trim()
    try {
      await api.post(`/zalo-oa-conversations/${activeConv.id}/send-message/`, { message: textToSend })
      setInputText('')
      // Reload messages for the active conversation
      await loadMessages(activeConv.id)
      // Refresh conversations list to update last message info
      const { data } = await api.get('/zalo-oa-conversations/')
      const normalizedConvs = Array.isArray(data) ? data : (data.results || [])
      setConversations(normalizedConvs)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không gửi được tin nhắn'))
    } finally {
      setSending(false)
    }
  }

  const handleAssignStaff = async () => {
    if (!activeConv || !selectedStaffId || assigning) return
    setAssigning(true)
    try {
      const { data } = await api.post(`/consultations/${activeConv.id}/assign-staff/`, { staff_id: selectedStaffId })
      toast.success('Đã gắn nhân viên phụ trách thành công')
      
      // Update active conversation locally
      setActiveConv(data)
      
      // Refresh conversation list
      const convsRes = await api.get('/zalo-oa-conversations/').then(res => res.data)
      const normalizedConvs = Array.isArray(convsRes) ? convsRes : (convsRes.results || [])
      setConversations(normalizedConvs)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gắn nhân viên phụ trách'))
    } finally {
      setAssigning(false)
    }
  }

  const handleQuickCreateAccount = async () => {
    if (!activeConv || creatingAccount) return
    setCreatingAccount(true)
    try {
      const { data } = await api.post(`/zalo-oa-conversations/${activeConv.id}/quick-create-account/`, {})
      const tempPassword = data.temporary_password ? `\nMật khẩu tạm thời: ${data.temporary_password}` : ''
      Swal.fire({
        title: 'Thành công',
        text: `Đã tạo hoặc gắn kết tài khoản cho khách hàng.${tempPassword}`,
        icon: 'success',
        confirmButtonText: 'Đóng'
      })
      
      // Refresh list
      const convsRes = await api.get('/zalo-oa-conversations/').then(res => res.data)
      const normalizedConvs = Array.isArray(convsRes) ? convsRes : (convsRes.results || [])
      setConversations(normalizedConvs)
      
      // Update active conversation
      const nextActive = normalizedConvs.find(c => c.id === activeConv.id)
      if (nextActive) {
        setActiveConv(nextActive)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không tạo được tài khoản nhanh'))
    } finally {
      setCreatingAccount(false)
    }
  }

  const normalizeSearchText = (text) => {
    if (!text) return ''
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  // Filtering
  const filteredConversations = conversations.filter(item => {
    const isUnassigned = !(item.assigned_staff_name || item.processor_name || item.assigned_staff)
    if (filter === 'unassigned' && !isUnassigned) return false
    if (filter === 'creatable' && !item.can_create_customer_account) return false
    
    if (!search.trim()) return true
    
    const keyword = normalizeSearchText(search)
    const haystack = normalizeSearchText([
      item.customer_name,
      item.zalo_display_name,
      item.customer_contact,
      item.assigned_staff_name,
      item.processor_name,
      item.last_message?.message,
    ].filter(Boolean).join(' '))
    return haystack.includes(keyword)
  })

  // Stats calculation
  const totalCount = conversations.length
  const unassignedCount = conversations.filter(item => !(item.assigned_staff_name || item.processor_name || item.assigned_staff)).length
  const creatableCount = conversations.filter(item => item.can_create_customer_account).length
  const activeName = activeConv ? (activeConv.customer_name || activeConv.zalo_display_name || `#${activeConv.id}`) : '-'

  const canAssign = currentAdminUser?.is_superuser || ['admin', 'super_admin', 'leader'].includes(currentAdminUser?.role)

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Hero section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Khách hàng & Support</span>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-0.5">
            <i className="fas fa-comment-dots text-blue-600" /> Tin nhắn Zalo OA
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Nhận hội thoại Zalo và hỗ trợ khách hàng trực tiếp ngay trong hệ thống TIS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/zalo-oa-settings"
            className="px-4 py-2 border border-gray-200 rounded-full bg-white text-gray-700 text-xs hover:bg-gray-50 font-medium flex items-center gap-1.5 transition"
          >
            <i className="fas fa-plug text-gray-400" /> Cấu hình OA
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-tis-red rounded-full text-xs font-medium flex items-center gap-1.5 transition"
          >
            <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-400">Tổng hội thoại</span>
          <strong className="text-xl text-gray-800 mt-1">{totalCount}</strong>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-400">Chưa gắn staff</span>
          <strong className="text-xl text-amber-600 mt-1">{unassignedCount}</strong>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-400">Cần tạo account</span>
          <strong className="text-xl text-red-600 mt-1">{creatableCount}</strong>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs text-gray-400">Hội thoại đang chọn</span>
          <strong className="text-sm font-semibold text-blue-600 truncate mt-1.5" title={activeName}>
            {activeName}
          </strong>
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Sidebar */}
        <aside className="lg:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Danh sách chat Zalo</h2>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
              {filteredConversations.length} hội thoại
            </span>
          </div>

          {/* Search and Filters */}
          <div className="p-3 bg-gray-50/50 space-y-2 border-b border-gray-100">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400 text-xs" />
              </span>
              <input
                type="text"
                placeholder="Tìm tên, SĐT, tin nhắn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition ${
                  filter === 'all' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilter('unassigned')}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition ${
                  filter === 'unassigned' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Chưa gắn
              </button>
              <button
                type="button"
                onClick={() => setFilter('creatable')}
                className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition ${
                  filter === 'creatable' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Cần account
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-10 space-y-2">
                <div className="spinner-tis" />
                <span className="text-xs text-gray-400">Đang tải hội thoại...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400">
                Không tìm thấy hội thoại phù hợp
              </div>
            ) : (
              filteredConversations.map((item) => {
                const isActive = activeConv?.id === item.id
                const customerName = item.customer_name || item.zalo_display_name || 'Khách Zalo'
                const staffName = item.assigned_staff_name || item.processor_name || 'Chưa gắn staff'
                const lastMsg = item.last_message?.message || 'Chưa có tin nhắn'
                const hasNoAccount = item.can_create_customer_account

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectConversation(item)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition ${
                      isActive ? 'bg-red-50 border border-red-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                      isActive ? 'bg-red-500' : 'bg-blue-500'
                    }`}>
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-width-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-xs font-bold text-gray-800 truncate pr-2">{customerName}</h4>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {item.last_message?.time || ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsg}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <i className="fas fa-user-tie text-[9px]" /> {staffName}
                        </span>
                        {hasNoAccount && (
                          <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                            Cần account
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Chat view */}
        <section className="lg:col-span-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    {activeConv.customer_name || activeConv.zalo_display_name || 'Khách Zalo'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    SĐT: {activeConv.customer_contact || 'Chưa cập nhật'} · Phụ trách: {activeConv.assigned_staff_name || activeConv.processor_name || 'Chưa chỉ định'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {activeConv.can_create_customer_account && (
                    <button
                      onClick={handleQuickCreateAccount}
                      disabled={creatingAccount}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shadow-sm transition flex items-center gap-1 disabled:opacity-50"
                    >
                      {creatingAccount ? (
                        <>
                          <i className="fas fa-spinner fa-spin" /> Đang tạo...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus" /> Tạo account nhanh
                        </>
                      )}
                    </button>
                  )}

                  {canAssign && (
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded p-0.5">
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="text-[11px] font-medium border-0 focus:ring-0 py-0.5 pl-2 pr-6 bg-transparent text-gray-700 cursor-pointer"
                      >
                        <option value="">Chọn staff...</option>
                        {staffList.map(staff => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name || staff.username}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssignStaff}
                        disabled={assigning || !selectedStaffId}
                        className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-tis-red rounded text-[11px] font-bold disabled:opacity-40 transition"
                      >
                        {assigning ? 'Đang gắn...' : 'Gắn staff'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={messageBoxRef}
                className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4 flex flex-col"
              >
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <div className="spinner-tis" />
                    <span className="text-xs text-gray-400">Đang tải tin nhắn...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-400 my-auto">
                    Chưa có tin nhắn nào trong hội thoại này.
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isStaff = msg.is_staff_reply
                    const sender = msg.sender_name || (isStaff ? 'TIS Admin' : 'Khách Zalo')
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[75%] ${isStaff ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <span className="text-[10px] text-gray-400 mb-0.5 px-1">{sender}</span>
                        <div className={`p-2.5 rounded-xl shadow-sm ${
                          isStaff
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        }`}>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.message || '[Tập tin]'}</p>
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1">{msg.created_at || ''}</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Input section */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn phản hồi qua Zalo OA..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-gray-50 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm disabled:opacity-40 transition"
                >
                  <i className={`fas fa-paper-plane text-xs ${sending ? 'animate-pulse' : ''}`} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <i className="far fa-comments text-5xl mb-3 text-gray-200" />
              <p className="text-xs">Chọn một hội thoại Zalo từ danh sách bên trái để xem chi tiết và phản hồi.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
