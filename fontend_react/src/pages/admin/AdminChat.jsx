import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { getErrorMessage, mediaUrl, websocketUrl } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminChat() {
  const { user: currentAdminUser } = useAuth()
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id')

  // UI state
  const [chatMode, setChatMode] = useState('customer') // 'customer' | 'internal'
  const [customerFilter, setCustomerFilter] = useState('all') // 'all' | 'user' | 'guest' | 'archived'
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState('')
  const [uploading, setUploading] = useState(false)

  // Lists state
  const [conversations, setConversations] = useState([])
  const [internalRooms, setInternalRooms] = useState([])
  const [internalUsers, setInternalUsers] = useState([])

  // Active chat state
  const [activeConv, setActiveConv] = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [connStatus, setConnStatus] = useState('offline') // 'online' | 'connecting' | 'offline'
  const [typingState, setTypingState] = useState(false) // Whether user is typing
  const [opponentTyping, setOpponentTyping] = useState(false) // Whether other user is typing

  // Modal states
  const [showInternalRoomModal, setShowInternalRoomModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [selectedStaffIds, setSelectedStaffIds] = useState([])

  // References
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const typingTimerRef = useRef(null)
  const messageBoxRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load lists
  const loadConversations = async (activeId = null) => {
    setLoadingList(true)
    try {
      const { data } = await api.get('/consultations/?scope=chat')
      const list = Array.isArray(data) ? data : (data.results || [])
      setConversations(list)

      if (activeId) {
        const found = list.find(item => String(item.id) === String(activeId))
        if (found) {
          handleSelectConversation(found)
        }
      }
    } catch (err) {
      toast.error('Không thể tải danh sách hội thoại khách hàng')
    } finally {
      setLoadingList(false)
    }
  }

  const loadInternalRooms = async (activeId = null) => {
    setLoadingList(true)
    try {
      const { data } = await api.get('/internal-chat-rooms/')
      const list = Array.isArray(data) ? data : (data.results || [])
      setInternalRooms(list)

      if (activeId) {
        const found = list.find(item => String(item.id) === String(activeId))
        if (found) {
          handleSelectInternalRoom(found)
        }
      }
    } catch (err) {
      toast.error('Không thể tải danh sách phòng chat nội bộ')
    } finally {
      setLoadingList(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (chatMode === 'customer') {
      loadConversations(initialId)
    } else {
      loadInternalRooms()
    }
  }, [chatMode])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight
    }
  }, [messages, opponentTyping])

  // Cleanup sockets on unmount
  useEffect(() => {
    return () => {
      closeActiveSocket()
    }
  }, [])

  const closeActiveSocket = () => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    setConnStatus('offline')
    setOpponentTyping(false)
    setTypingState(false)
  }

  // --- WebSocket Connection Handlers ---

  const connectCustomerWS = (convId) => {
    closeActiveSocket()
    setConnStatus('connecting')
    
    const token = getAccessToken()
    const wsUrl = websocketUrl(`/ws/chat/${convId}/${token ? `?token=${encodeURIComponent(token)}` : ''}`)
    
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setConnStatus('online')
    }

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        
        if (data.type === 'typing') {
          if (!data.is_staff) {
            setOpponentTyping(true)
          }
          return
        }

        if (data.type === 'stop_typing') {
          if (!data.is_staff) {
            setOpponentTyping(false)
          }
          return
        }

        // Standard message append
        setOpponentTyping(false)
        const newMsg = {
          id: data.id,
          message: data.message,
          is_staff_reply: data.is_staff_reply !== undefined ? data.is_staff_reply : data.is_staff,
          created_at: formatChatTime(data.created_at || new Date().toISOString()),
          sender_name: data.sender_name,
          attachment_url: data.attachment_url,
          attachment_type: data.attachment_type,
          is_read: data.is_read
        }
        setMessages(prev => [...prev, newMsg])

        // Update sidebar last message preview
        setConversations(prevList => {
          return prevList.map(item => {
            if (item.id === convId) {
              return {
                ...item,
                last_message: {
                  message: data.message,
                  attachment_url: data.attachment_url,
                  created_at: data.created_at || new Date().toISOString()
                }
              }
            }
            return item
          })
        })
      } catch (err) {
        console.error('Error handling websocket message:', err)
      }
    }

    socket.onclose = () => {
      setConnStatus('offline')
      // Try auto reconnecting if still active
      if (activeConv && activeConv.id === convId && chatMode === 'customer') {
        reconnectTimerRef.current = setTimeout(() => {
          connectCustomerWS(convId)
        }, 3000)
      }
    }

    socket.onerror = () => {
      socket.close()
    }
  }

  const connectInternalWS = (roomId) => {
    closeActiveSocket()
    setConnStatus('connecting')

    const token = getAccessToken()
    const wsUrl = websocketUrl(`/ws/internal-chat/${roomId}/${token ? `?token=${encodeURIComponent(token)}` : ''}`)

    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      setConnStatus('online')
    }

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        
        if (data.type === 'typing') {
          if (Number(data.sender_id) !== Number(currentAdminUser?.id)) {
            setOpponentTyping(true)
          }
          return
        }

        if (data.type === 'stop_typing') {
          if (Number(data.sender_id) !== Number(currentAdminUser?.id)) {
            setOpponentTyping(false)
          }
          return
        }

        if (data.type === 'internal_message') {
          setOpponentTyping(false)
          const newMsg = {
            id: data.id,
            message: data.message,
            sender: data.sender,
            is_internal: true,
            created_at: formatChatTime(data.created_at || new Date().toISOString()),
            sender_name: data.sender_name,
            attachment_url: data.attachment_url,
            attachment_type: data.attachment_type
          }
          setMessages(prev => [...prev, newMsg])

          // Update sidebar last message preview
          setInternalRooms(prevList => {
            return prevList.map(item => {
              if (item.id === roomId) {
                return {
                  ...item,
                  last_message: {
                    message: data.message,
                    attachment_url: data.attachment_url,
                    created_at: data.created_at || new Date().toISOString()
                  }
                }
              }
              return item
            })
          })
        }
      } catch (err) {
        console.error('Error handling internal websocket message:', err)
      }
    }

    socket.onclose = () => {
      setConnStatus('offline')
      if (activeRoom && activeRoom.id === roomId && chatMode === 'internal') {
        reconnectTimerRef.current = setTimeout(() => {
          connectInternalWS(roomId)
        }, 3000)
      }
    }

    socket.onerror = () => {
      socket.close()
    }
  }

  // --- Select chat handlers ---

  const handleSelectConversation = async (conv) => {
    setActiveConv(conv)
    setActiveRoom(null)
    setMessages([])
    setLoadingMessages(true)
    closeActiveSocket()

    try {
      const { data } = await api.get(`/consultations/${conv.id}/messages/`)
      const formatted = data.map(m => ({
        id: m.id,
        message: m.message,
        is_staff_reply: m.is_staff_reply,
        created_at: formatChatTime(m.created_at),
        sender_name: m.sender_name,
        attachment_url: m.attachment_url,
        attachment_type: m.attachment_type,
        is_read: m.is_read
      }))
      setMessages(formatted)
      connectCustomerWS(conv.id)
    } catch (err) {
      toast.error('Không thể tải lịch sử tin nhắn')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSelectInternalRoom = async (room) => {
    setActiveRoom(room)
    setActiveConv(null)
    setMessages([])
    setLoadingMessages(true)
    closeActiveSocket()

    try {
      const { data } = await api.get(`/internal-chat-rooms/${room.id}/messages/`)
      const formatted = data.map(m => ({
        id: m.id,
        message: m.message,
        sender: m.sender,
        is_internal: true,
        created_at: formatChatTime(m.created_at),
        sender_name: m.sender_name,
        attachment_url: m.attachment_url,
        attachment_type: m.attachment_type
      }))
      setMessages(formatted)
      connectInternalWS(room.id)
    } catch (err) {
      toast.error('Không thể tải lịch sử chat nội bộ')
    } finally {
      setLoadingMessages(false)
    }
  }

  // --- Typing indicator send handlers ---

  const handleInputChange = (e) => {
    setInputText(e.target.value)

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (!typingState) {
        socketRef.current.send(JSON.stringify({
          type: 'typing',
          sender_id: currentAdminUser?.id,
          is_staff: true
        }))
        setTypingState(true)
      }

      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'stop_typing',
            is_staff: true
          }))
          setTypingState(false)
        }
      }, 1500)
    }
  }

  // --- Send Message ---

  const handleSendMessage = (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Mất kết nối WebSocket! Đang thử kết nối lại...')
      return
    }

    socketRef.current.send(JSON.stringify({
      message: inputText.trim(),
      sender_id: currentAdminUser?.id,
      is_staff: true
    }))

    if (typingState) {
      socketRef.current.send(JSON.stringify({
        type: 'stop_typing',
        is_staff: true
      }))
      setTypingState(false)
    }

    setInputText('')
  }

  // --- File Upload ---

  const handleAttachClick = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Vui lòng kết nối vào phòng chat trước khi gửi tệp!')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    e.target.value = '' // Reset so the same file can be uploaded again

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Tệp quá lớn', 'Vui lòng chọn tệp tin dung lượng dưới 5MB.', 'warning')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post('/chat/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (data.attachment_url && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          message: '',
          sender_id: currentAdminUser?.id,
          is_staff: true,
          attachment_url: data.attachment_url,
          attachment_type: data.attachment_type
        }))
      } else {
        toast.error('Không thể gửi file. Kết nối máy chủ bị ngắt.')
      }
    } catch (err) {
      Swal.fire('Lỗi upload', getErrorMessage(err, 'Không thể tải file lên máy chủ.'), 'error')
    } finally {
      setUploading(false)
    }
  }

  // --- Archive consultation ---

  const handleArchiveChat = async () => {
    if (!activeConv) return
    const result = await Swal.fire({
      title: 'Lưu trữ hội thoại?',
      text: 'Cuộc hội thoại sẽ được lưu trữ và ẩn khỏi danh sách chat hiện tại.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý lưu trữ',
      cancelButtonText: 'Hủy bỏ'
    })

    if (result.isConfirmed) {
      try {
        await api.patch(`/consultations/${activeConv.id}/`, { status: 'archived' })
        toast.success('Đã lưu trữ cuộc trò chuyện')
        setActiveConv(null)
        closeActiveSocket()
        loadConversations()
      } catch (err) {
        Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu trữ cuộc trò chuyện'), 'error')
      }
    }
  }

  // --- WebRTC calls mockup ---

  const handleStartCall = (mode = 'video') => {
    Swal.fire({
      title: `Bắt đầu cuộc gọi ${mode === 'video' ? 'video' : 'thoại'}?`,
      text: `Thiết lập cuộc gọi trực tiếp WebRTC tới khách hàng ${activeConv?.customer_name}.`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Gọi ngay',
      cancelButtonText: 'Hủy'
    }).then((res) => {
      if (res.isConfirmed) {
        toast.success('Đang khởi tạo WebRTC connection...')
      }
    })
  }

  // --- Internal room creator ---

  const openCreateInternalRoom = async () => {
    setNewRoomName('')
    setSelectedStaffIds([])
    setShowInternalRoomModal(true)

    try {
      const { data } = await api.get('/users/internal-chat-users/')
      setInternalUsers(Array.isArray(data) ? data : (data.results || []))
    } catch (err) {
      toast.error('Không thể tải danh sách nhân viên để thêm vào chat')
    }
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (selectedStaffIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thành viên để bắt đầu chat')
      return
    }

    const roomType = selectedStaffIds.length === 1 && !newRoomName.trim() ? 'direct' : 'group'
    const name = roomType === 'group' ? (newRoomName.trim() || 'Nhóm nội bộ') : ''

    try {
      const { data } = await api.post('/internal-chat-rooms/', {
        name,
        room_type: roomType,
        members: selectedStaffIds
      })
      setShowInternalRoomModal(false)
      toast.success('Tạo phòng chat nội bộ thành công')
      loadInternalRooms(data.id)
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể tạo phòng chat nội bộ'), 'error')
    }
  }

  const handleStaffSelectToggle = (id) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // --- Filtering & formatting helpers ---

  const normalizeSearchText = (text) => {
    if (!text) return ''
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  const filteredConversations = conversations.filter(item => {
    const isMember = item.user !== null && item.user !== undefined
    const isArchived = item.status === 'archived'

    // Tab filter
    if (customerFilter === 'all' && isArchived) return false
    if (customerFilter === 'archived' && !isArchived) return false
    if (customerFilter === 'user' && (!isMember || isArchived)) return false
    if (customerFilter === 'guest' && (isMember || isArchived)) return false

    // Search query filter
    if (!searchQuery.trim()) return true
    const kw = normalizeSearchText(searchQuery)
    const haystack = normalizeSearchText([
      item.customer_name,
      item.customer_contact,
      item.product_name,
      item.category_name,
      item.note,
      item.last_message?.message
    ].filter(Boolean).join(' '))
    
    return haystack.includes(kw)
  })

  const filteredInternalRooms = internalRooms.filter(item => {
    if (!searchQuery.trim()) return true
    const kw = normalizeSearchText(searchQuery)
    const members = item.member_names || []
    const title = item.name || members.map(m => m.name).join(', ')
    const lastMsg = item.last_message?.message || ''
    
    const haystack = normalizeSearchText([title, lastMsg].join(' '))
    return haystack.includes(kw)
  })

  const getRelativeTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins}p`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('vi-VN')
  }

  const formatChatTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatChatPreviewMessage = (msg, attachmentUrl) => {
    if (attachmentUrl) return '[Tập tin đính kèm]'
    return msg || ''
  }

  const liveCustomerCount = conversations.filter(item => item.status !== 'archived').length
  const archivedCustomerCount = conversations.length - liveCustomerCount
  const activeChatName = activeConv?.customer_name
    || activeRoom?.name
    || (activeRoom?.member_names || []).map(member => member.name).join(', ')
    || 'Chưa chọn'

  return (
    <div className="admin-inbox-page admin-chat-page lg:h-[calc(100vh-120px)] flex flex-col overflow-hidden space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
      />

      <div className="admin-inbox-hero admin-chat-hero shrink-0">
        <div>
          <span className="admin-page-kicker">Hộp thoại hỗ trợ</span>
          <h1 className="flex flex-wrap items-center gap-2">
            Chat realtime
            <span className={`chat-presence is-${connStatus} scale-90`}>
              <i /> {connStatus === 'online' ? 'Kết nối trực tuyến' : connStatus === 'connecting' ? 'Đang kết nối' : 'Ngoại tuyến'}
            </span>
          </h1>
          <p>Theo dõi hội thoại khách hàng và trao đổi nội bộ trong cùng workspace xử lý.</p>
        </div>

        <div className="admin-chat-hero-stats flex items-center gap-6 text-xs text-gray-500 bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-xs shrink-0">
          <div className="flex items-center gap-1.5" title="Hội thoại khách đang hoạt động">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Khách: <strong className="text-gray-800 font-bold">{liveCustomerCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4" title="Phòng trao đổi nội bộ">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Nội bộ: <strong className="text-gray-800 font-bold">{internalRooms.length}</strong>
          </div>
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4" title="Hội thoại đã lưu trữ">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Lưu trữ: <strong className="text-gray-800 font-bold">{archivedCustomerCount}</strong>
          </div>
        </div>
      </div>

      {/* Workspace wrapper */}
      <div className="admin-chat-workspace flex-1 min-h-0 lg:h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Sidebar */}
        <aside className="admin-chat-sidebar lg:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {/* Mode Switcher */}
          <div className="chat-mode-switch p-3 border-b border-gray-100 flex gap-2 bg-gray-50/50">
            <button
              onClick={() => setChatMode('customer')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${
                chatMode === 'customer' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-headset mr-1.5" /> Khách hàng
            </button>
            <button
              onClick={() => setChatMode('internal')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition ${
                chatMode === 'internal' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-users-cog mr-1.5" /> Chat nội bộ
            </button>
          </div>

          {/* Search bar */}
          <div className="chat-list-tools p-3 bg-white space-y-2 border-b border-gray-100">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400 text-xs" />
              </span>
              <input
                type="text"
                placeholder={chatMode === 'customer' ? 'Tìm tên, SĐT khách hàng...' : 'Tìm nhóm, nhân sự...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:bg-white"
              />
            </div>

            {/* Sub-filters for customer mode */}
            {chatMode === 'customer' ? (
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setCustomerFilter('all')}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded transition shrink-0 ${
                    customerFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setCustomerFilter('user')}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded transition shrink-0 ${
                    customerFilter === 'user' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Thành viên
                </button>
                <button
                  onClick={() => setCustomerFilter('guest')}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded transition shrink-0 ${
                    customerFilter === 'guest' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Vãng lai
                </button>
                <button
                  onClick={() => setCustomerFilter('archived')}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded transition shrink-0 ${
                    customerFilter === 'archived' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Lưu trữ
                </button>
              </div>
            ) : (
              <div className="flex pt-0.5">
                <button
                  onClick={openCreateInternalRoom}
                  className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-tis-red rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <i className="fas fa-plus-circle" /> Tạo phòng chat mới
                </button>
              </div>
            )}
          </div>

          {/* List items */}
          <div className="chat-thread-list flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1 bg-gray-50/20">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center h-full py-10 space-y-2">
                <div className="spinner-tis" />
              </div>
            ) : chatMode === 'customer' ? (
              filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Không tìm thấy hội thoại nào phù hợp.
                </div>
              ) : (
                filteredConversations.map((item) => {
                  const isActive = activeConv?.id === item.id
                  const isMember = item.user !== null && item.user !== undefined
                  const title = item.customer_name || 'Khách hàng'
                  const lastMsg = item.last_message ? formatChatPreviewMessage(item.last_message.message, item.last_message.attachment_url) : 'Chưa có tin nhắn'
                  const relativeTime = getRelativeTime(item.last_message?.created_at || item.created_at)

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectConversation(item)}
                      className={`chat-thread-card w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 border relative overflow-hidden ${
                        isActive 
                          ? 'bg-red-50/70 border-red-100/80 shadow-sm pl-4' 
                          : 'hover:bg-gray-50/80 border-gray-100 bg-white'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D71920] rounded-r" />
                      )}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${
                          isActive 
                            ? 'bg-gradient-to-tr from-[#D71920] to-[#f54950]' 
                            : isMember 
                              ? 'bg-gradient-to-tr from-blue-500 to-indigo-600' 
                              : 'bg-gradient-to-tr from-slate-400 to-slate-500'
                        }`}>
                          {title.charAt(0).toUpperCase()}
                        </div>
                        {isActive && connStatus === 'online' && (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-500 animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-bold text-gray-800 truncate pr-2 flex items-center gap-1.5">
                            {title}
                            {isMember ? (
                              <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] px-1 py-0.2 rounded font-bold">TV</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[8px] px-1 py-0.2 rounded font-bold">VL</span>
                            )}
                          </h4>
                          <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                            {relativeTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-1 font-medium">{lastMsg}</p>
                      </div>
                    </button>
                  )
                })
              )
            ) : (
              filteredInternalRooms.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Không tìm thấy phòng chat nội bộ nào.
                </div>
              ) : (
                filteredInternalRooms.map((room) => {
                  const isActive = activeRoom?.id === room.id
                  const members = room.member_names || []
                  const title = room.name || members.map(m => m.name).join(', ') || `Phòng nội bộ #${room.id}`
                  const lastMsg = room.last_message ? formatChatPreviewMessage(room.last_message.message, room.last_message.attachment_url) : 'Chưa có tin nhắn'
                  const relativeTime = getRelativeTime(room.last_message?.created_at || room.updated_at || room.created_at)

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectInternalRoom(room)}
                      className={`chat-thread-card w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 border relative overflow-hidden ${
                        isActive 
                          ? 'bg-red-50/70 border-red-100/80 shadow-sm pl-4' 
                          : 'hover:bg-gray-50/80 border-gray-100 bg-white'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D71920] rounded-r" />
                      )}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${
                          isActive 
                            ? 'bg-gradient-to-tr from-[#D71920] to-[#f54950]' 
                            : 'bg-gradient-to-tr from-amber-500 to-orange-600'
                        }`}>
                          {title.charAt(0).toUpperCase()}
                        </div>
                        {isActive && connStatus === 'online' && (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-500 animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-xs font-bold text-gray-800 truncate pr-2 flex items-center gap-1.5">
                            {title}
                            {room.room_type === 'group' ? (
                              <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[8px] px-1 py-0.2 rounded font-bold"><i className="fas fa-users" /> {members.length}</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[8px] px-1 py-0.2 rounded font-bold"><i className="fas fa-user" /></span>
                            )}
                          </h4>
                          <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                            {relativeTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-1 font-medium">{lastMsg}</p>
                      </div>
                    </button>
                  )
                })
              )
            )}
          </div>
        </aside>

        {/* Right Active Chat Panel */}
        <section className="admin-chat-panel lg:col-span-8 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {activeConv || activeRoom ? (
            <>
              {/* Header */}
              <div className="chat-panel-head p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500 text-white font-bold flex items-center justify-center text-base">
                    {(activeConv?.customer_name || activeRoom?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      {activeConv ? activeConv.customer_name : (activeRoom?.name || (activeRoom?.member_names || []).map(m => m.name).join(', '))}
                      
                      {/* Connection status badge */}
                      {connStatus === 'online' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.2 rounded font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                        </span>
                      ) : connStatus === 'connecting' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Connecting...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Offline
                        </span>
                      )}
                    </h3>

                    {/* Metadata subtitle */}
                    {activeConv && (
                      <div className="text-[11px] text-gray-500 space-y-0.5 mt-0.5">
                        {activeConv.customer_contact && activeConv.customer_contact !== 'null' && (
                          <span className="inline-flex items-center gap-1 mr-3">
                            <i className="fas fa-phone text-[9px] text-gray-400" /> {activeConv.customer_contact}
                          </span>
                        )}
                        {activeConv.email && (
                          <span className="inline-flex items-center gap-1 mr-3">
                            <i className="fas fa-envelope text-[9px] text-gray-400" /> {activeConv.email}
                          </span>
                        )}
                        {(activeConv.product_name || activeConv.category_name || activeConv.note) && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-0.1 rounded text-[9px] font-medium border border-amber-100">
                            Tư vấn: {activeConv.product_name || activeConv.category_name || activeConv.note}
                          </span>
                        )}
                      </div>
                    )}

                    {activeRoom && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Thành viên: {(activeRoom.member_names || []).map(m => m.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {activeConv && (
                    <>
                      {/* Call features for Members */}
                      {(activeConv.user !== null && activeConv.user !== undefined) && (
                        <>
                          <button
                            onClick={() => handleStartCall('audio')}
                            title="Gọi thoại trực tiếp WebRTC"
                            className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 flex items-center justify-center transition"
                          >
                            <i className="fas fa-phone-alt text-xs" />
                          </button>
                          <button
                            onClick={() => handleStartCall('video')}
                            title="Gọi video trực tiếp WebRTC"
                            className="w-8 h-8 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 flex items-center justify-center transition"
                          >
                            <i className="fas fa-video text-xs" />
                          </button>
                        </>
                      )}

                      {/* Staff assignment metadata representation */}
                      <div className="bg-gray-100/70 border border-gray-200 rounded px-2.5 py-1 text-left hidden sm:block">
                        <span className="text-[9px] text-gray-400 block leading-tight font-medium">Nhân viên phụ trách</span>
                        <strong className="text-[11px] text-gray-700 block font-bold leading-tight">
                          {activeConv.processor_name || activeConv.assigned_staff_name || 'Chưa tiếp nhận'}
                        </strong>
                      </div>

                      {activeConv.status !== 'archived' && (
                        <button
                          onClick={handleArchiveChat}
                          title="Lưu trữ cuộc hội thoại"
                          className="px-3 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-tis-red rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <i className="fas fa-archive" /> Lưu trữ
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Message History display */}
              <div
                ref={messageBoxRef}
                className="chat-message-canvas flex-1 p-4 bg-gray-50 overflow-y-auto space-y-4 flex flex-col"
              >
                {loadingMessages ? (
                  <div className="my-auto flex flex-col items-center justify-center space-y-2">
                    <div className="spinner-tis" />
                    <span className="text-xs text-gray-400">Đang tải lịch sử...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="my-auto text-center text-gray-400 text-xs py-10">
                    Bắt đầu cuộc trao đổi. Gõ tin nhắn ở ô nhập liệu bên dưới.
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.is_internal
                      ? Number(msg.sender) === Number(currentAdminUser?.id)
                      : msg.is_staff_reply

                    // Custom System Call representation
                    const isCallLog = msg.message && (
                      msg.message.includes('ended') ||
                      msg.message.includes('rejected') ||
                      msg.message.includes('missed') ||
                      msg.message.includes('call_mode')
                    )

                    if (isCallLog) {
                      let icon = 'fa-video'
                      let color = 'text-red-500'
                      let label = 'Cuộc gọi đã kết thúc'
                      let bg = 'bg-red-50/50 border-red-100/60'
                      
                      if (msg.message.includes('missed')) {
                        icon = 'fa-phone-slash'
                        color = 'text-amber-500'
                        label = 'Cuộc gọi nhỡ'
                        bg = 'bg-amber-50/50 border-amber-100/60'
                      } else if (msg.message.includes('rejected')) {
                        icon = 'fa-video-slash'
                        color = 'text-rose-500'
                        label = 'Cuộc gọi bị từ chối'
                        bg = 'bg-rose-50/50 border-rose-100/60'
                      }

                      return (
                        <div key={msg.id || index} className={`self-center ${bg} border backdrop-blur-sm text-gray-700 text-xs font-semibold px-5 py-2.5 rounded-full flex items-center gap-2.5 shadow-sm my-3 max-w-md`}>
                          <i className={`fas ${icon} ${color} text-sm`} />
                          <span>{label}</span>
                          <span className="text-gray-400 font-normal text-[10px] font-mono border-l border-gray-200 pl-2">{msg.created_at}</span>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <span className="text-[10px] text-gray-400 mb-1 px-1 font-medium">{msg.sender_name || (isMe ? 'Bạn' : 'Khách')}</span>
                        <div className={`p-3 rounded-2xl shadow-sm space-y-1.5 leading-relaxed text-xs transition-all ${
                          isMe
                            ? 'bg-gradient-to-tr from-[#D71920] to-[#f54950] text-white rounded-tr-none shadow-red-100/20'
                            : 'bg-white text-[#1a1a2e] border border-gray-100 rounded-tl-none'
                        }`}>
                          {msg.message && (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          )}

                          {msg.attachment_url && (
                            <div className="pt-0.5">
                              {msg.attachment_type === 'image' ? (
                                <a href={mediaUrl(msg.attachment_url)} target="_blank" rel="noreferrer" className="block max-w-[200px] overflow-hidden rounded-xl shadow-sm hover:shadow-md transition">
                                  <img
                                    src={mediaUrl(msg.attachment_url)}
                                    alt="Attachment"
                                    className="w-full max-h-56 object-cover hover:scale-102 transition duration-200"
                                  />
                                </a>
                              ) : msg.attachment_type === 'video' ? (
                                <video
                                  src={mediaUrl(msg.attachment_url)}
                                  controls
                                  className="w-full max-w-[240px] rounded-xl bg-black shadow-sm"
                                />
                              ) : (
                                <a
                                  href={mediaUrl(msg.attachment_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                    isMe 
                                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10' 
                                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 text-blue-600'
                                  }`}
                                >
                                  <i className="fas fa-file-alt text-sm" /> Tải tệp đính kèm
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1.5 px-1 text-[9px] text-gray-400 font-medium">
                          <span>{msg.created_at}</span>
                          {isMe && (
                            msg.is_read ? (
                              <span className="text-green-500 font-bold ml-1" title="Đã xem">✓✓</span>
                            ) : (
                              <span className="text-gray-300 font-bold ml-1" title="Đã gửi">✓</span>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Typing status bubble */}
                {opponentTyping && (
                  <div className="self-start flex flex-col max-w-[70%]">
                    <span className="text-[10px] text-gray-400 mb-1 px-1 font-medium">Đang nhập...</span>
                    <div className="p-3.5 bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input toolbar footer */}
              <form onSubmit={handleSendMessage} className="chat-composer p-3 border-t border-gray-100 bg-white flex gap-2 items-center">
                <button
                  type="button"
                  onClick={handleAttachClick}
                  disabled={uploading}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 transition"
                  title="Đính kèm ảnh, video hoặc file tài liệu"
                >
                  {uploading ? (
                    <i className="fas fa-spinner fa-spin text-xs" />
                  ) : (
                    <i className="fas fa-paperclip text-xs" />
                  )}
                </button>

                <input
                  type="text"
                  placeholder={uploading ? 'Đang tải file đính kèm...' : 'Aa'}
                  value={inputText}
                  onChange={handleInputChange}
                  disabled={uploading}
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-gray-50 focus:bg-white"
                />

                <button
                  type="submit"
                  disabled={uploading || !inputText.trim()}
                  className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm disabled:opacity-40 transition shrink-0"
                >
                  <i className="fas fa-paper-plane text-xs" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <i className="far fa-comments text-5xl mb-3 text-gray-200" />
              <p className="text-xs">
                {chatMode === 'customer'
                  ? 'Chọn một cuộc hội thoại khách hàng ở sidebar bên trái để bắt đầu chat.'
                  : 'Chọn một phòng chat hoặc Direct chat nội bộ để trao đổi công việc.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Create Internal Room Modal */}
      {showInternalRoomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Tạo phòng chat nội bộ</h3>
              <button
                onClick={() => setShowInternalRoomModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 flex items-center justify-center"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              <div>
                <label className="label-tis block text-xs mb-1">Tên phòng chat / Tên nhóm (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Nhóm Dự án bảo hiểm, Phòng Leader..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-xs mb-1.5">
                  Chọn thành viên ({selectedStaffIds.length} đã chọn)
                </label>
                <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100 bg-gray-50/20">
                  {internalUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      Không có nhân sự khả dụng.
                    </div>
                  ) : (
                    internalUsers.map((user) => {
                      const name = [user.last_name, user.first_name].filter(Boolean).join(' ') || user.username || user.email || `User #${user.id}`
                      const isChecked = selectedStaffIds.includes(user.id)

                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleStaffSelectToggle(user.id)}
                            className="rounded text-red-500 focus:ring-red-500 h-4 w-4"
                          />
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-width-0 flex-1">
                            <strong className="text-gray-800 font-bold block truncate">{name}</strong>
                            <span className="text-gray-400 text-[10px] capitalize">{user.role || 'Nhân viên'}</span>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInternalRoomModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={selectedStaffIds.length === 0}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                >
                  Bắt đầu Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
