import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { useAuth } from './AuthContext'

const CartContext = createContext({ count: 0, refresh: () => {} })

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [count, setCount]   = useState(0)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCount(0); return }
    try {
      const { data } = await api.get('/cart/')
      const items = Array.isArray(data?.items) ? data.items : []
      setCount(items.reduce((sum, item) => sum + (item.quantity || 1), 0))
    } catch {
      setCount(0)
    }
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
