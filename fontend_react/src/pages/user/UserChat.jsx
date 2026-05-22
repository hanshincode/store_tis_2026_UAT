import { useState, useEffect, useRef, useCallback } from 'react'
import api, { getErrorMessage, websocketUrl } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDateTime } from '@/lib/format'
import toast from 'react-hot-toast'

export default function UserChat() {
  const { user } = useAuth()

  // Conversation list
  const [conversations, setConversations] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [selectedConvo, setSelectedConvo] = useState(null)

  // Messages
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Input
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  // WebSocket
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversations
  useEffect(() => {
    loadConversations()
  }, [])

  // WebSocket connection
  useEffect(() => {
    if (!user?.id) return

    const wsUrl = websocketUrl(`/ws/chat/${user.id}/`)
    let ws

    function connect() {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[UserChat] WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWsMessage(data)
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = (event) => {
        console.log('[UserChat] WebSocket closed:', event.code)
        // Reconnect after delay if not intentional close
        if (event.code !== 1000) {
          setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => {
        // Silently handle; onclose will fire
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000)
        wsRef.current = null
      }
    }
  }, [user?.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleWsMessage(data) {
    if (data.type === 'chat_message' || data.message) {
      const msg = data.message || data
      // If this message belongs to the selected conversation, add it
      setSelectedConvo(current => {
        if (current && (msg.conversation === current.id || msg.conversation_id === current.id)) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
        return current
      })
      // Refresh conversation list for unread counts
      loadConversations()
    }
  }

  async function loadConversations() {
    setLoadingConvos(true)
    try {
      const { data } = await api.get('/conversations/')
      const list = Array.isArray(data) ? data : data?.results || []
      setConversations(list)
      // Auto-select first conversation
      if (list.length > 0 && !selectedConvo) {
        selectConversation(list[0])
      }
    } catch (err) {
      // silent
    } finally {
      setLoadingConvos(false)
    }
  }

  async function selectConversation(convo) {
    setSelectedConvo(convo)
    setLoadingMessages(true)
    try {
      const { data } = await api.get(`/conversations/${convo.id}/messages/`)
      const msgs = Array.isArray(data) ? data : data?.results || []
      setMessages(msgs)
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    const text = newMessage.trim()
    if (!text || !selectedConvo) return

    setSending(true)
    try {
      const { data } = await api.post(`/conversations/${selectedConvo.id}/messages/`, {
        content: text,
        message: text,
      })
      setMessages(prev => [...prev, data])
      setNewMessage('')
      inputRef.current?.focus()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gửi tin nhắn.'))
    } finally {
      setSending(false)
    }
  }

  async function handleStartNewChat() {
    try {
      const { data } = await api.post('/conversations/', {
        title: 'Hỗ trợ khách hàng',
      })
      await loadConversations()
      selectConversation(data)
      toast.success('Đã tạo cuộc hội thoại mới!')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tạo cuộc hội thoại.'))
    }
  }

  function isMyMessage(msg) {
    if (!user) return false
    return msg.sender === user.id || msg.sender_id === user.id || msg.is_from_customer === true || msg.is_mine === true
  }

  function getSenderName(msg) {
    if (isMyMessage(msg)) return 'Bạn'
    return msg.sender_name || msg.staff_name || 'Hỗ trợ viên'
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat hỗ trợ</h1>
          <p className="text-gray-500 text-sm mt-1">Trò chuyện trực tiếp với đội ngũ hỗ trợ</p>
        </div>
        <button onClick={handleStartNewChat} className="btn-tis btn-tis-danger text-sm px-4 py-2">
          <i className="fas fa-plus mr-2" />Cuộc hội thoại mới
        </button>
      </div>

      {/* Chat Container */}
      <div className="admin-card p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        <div className="flex h-full">
          {/* Sidebar: Conversation List */}
          <div className={`w-full sm:w-72 border-r border-gray-100 flex-col flex-shrink-0 ${selectedConvo ? 'hidden sm:flex' : 'flex'}`}>
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cuộc hội thoại</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                <div className="p-3 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className="skeleton w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="skeleton h-3 w-24 rounded" />
                        <div className="skeleton h-2 w-32 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <i className="fas fa-comments text-gray-300 text-3xl mb-3" />
                  <p className="text-sm text-gray-400">Chưa có cuộc hội thoại nào</p>
                </div>
              ) : (
                conversations.map(convo => (
                  <button
                    key={convo.id}
                    onClick={() => selectConversation(convo)}
                    className={`w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      selectedConvo?.id === convo.id ? 'bg-red-50 border-l-2 border-l-tis-red' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      selectedConvo?.id === convo.id ? 'bg-tis-red text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <i className="fas fa-headset text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {convo.title || convo.subject || `Hỗ trợ #${convo.id}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {convo.last_message?.content || convo.last_message_preview || 'Chưa có tin nhắn'}
                      </p>
                    </div>
                    {(convo.unread_count > 0) && (
                      <span className="w-5 h-5 rounded-full bg-tis-red text-white text-xs flex items-center justify-center flex-shrink-0">
                        {convo.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`flex-1 flex-col min-w-0 ${selectedConvo ? 'flex' : 'hidden sm:flex'}`}>
            {selectedConvo ? (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setSelectedConvo(null)}
                    className="sm:hidden text-gray-400 hover:text-gray-600 mr-1"
                  >
                    <i className="fas fa-arrow-left" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tis-red to-tis-red-dark text-white flex items-center justify-center">
                    <i className="fas fa-headset text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedConvo.title || `Hỗ trợ #${selectedConvo.id}`}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-xs text-gray-400">Đang hoạt động</span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="spinner-tis" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <i className="fas fa-comment-dots text-gray-300 text-2xl" />
                      </div>
                      <p className="text-sm text-gray-400">Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const mine = isMyMessage(msg)
                      return (
                        <div key={msg.id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${mine ? 'order-1' : ''}`}>
                            {/* Sender Name */}
                            <p className={`text-xs mb-1 ${mine ? 'text-right text-gray-400' : 'text-gray-500 font-medium'}`}>
                              {getSenderName(msg)}
                            </p>
                            {/* Bubble */}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              mine
                                ? 'bg-tis-red text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm'
                            }`}>
                              {msg.content || msg.message || msg.text || ''}
                            </div>
                            {/* Time */}
                            <p className={`text-[10px] mt-1 ${mine ? 'text-right' : ''} text-gray-400`}>
                              {formatDateTime(msg.created_at || msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="input-tis flex-1 text-sm py-2.5"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="btn-tis btn-tis-danger px-4 py-2.5 flex-shrink-0 disabled:opacity-50"
                  >
                    {sending ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <i className="fas fa-paper-plane" />
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* No conversation selected */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                  <i className="fas fa-comments text-gray-300 text-4xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chào mừng bạn đến với Chat hỗ trợ</h3>
                <p className="text-gray-400 text-sm max-w-xs mb-6">
                  Chọn một cuộc hội thoại từ danh sách hoặc tạo cuộc hội thoại mới để bắt đầu
                </p>
                <button onClick={handleStartNewChat} className="btn-tis btn-tis-danger px-6 py-2.5">
                  <i className="fas fa-plus mr-2" />Bắt đầu chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
