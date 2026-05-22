import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchList } from '@/lib/api'
import { mediaUrl } from '@/lib/api'

export default function MegaMenu() {
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    fetchList('/categories/').then(cats => {
      setCategories(cats)
      if (cats.length) setActiveCategory(cats[0])
    }).catch(() => {})
  }, [])

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setOpen(true)
  }

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setOpen(false), 260)
  }

  const getCategoryIcon = (cat) => {
    const icon = cat.icon_image_url || cat.icon_image || ''
    if (icon) return <img src={mediaUrl(icon)} alt={cat.name} className="w-5 h-5 object-contain" />
    return <i className="fas fa-shield-halved text-tis-red" />
  }

  return (
    <div
      className="relative has-product-cascade"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={scheduleClose}
    >
      <Link
        to="/products"
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:text-tis-red transition-colors"
      >
        Sản phẩm <i className="fas fa-chevron-down text-xs text-gray-400" />
      </Link>

      {open && categories.length > 0 && (
        <div className="product-cascade-menu flex animate-fade-in">
          {/* Parent list */}
          <div className="product-cascade-parent flex flex-col gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                onMouseEnter={() => setActiveCategory(cat)}
                onFocus={() => setActiveCategory(cat)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                  activeCategory?.id === cat.id
                    ? 'bg-white text-tis-red shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-tis-red'
                }`}
              >
                <span className="w-5 flex-shrink-0">{getCategoryIcon(cat)}</span>
                <span className="flex-1 truncate">{cat.name}</span>
                <i className="fas fa-arrow-right text-xs text-gray-300" />
              </Link>
            ))}
          </div>

          {/* Children panel */}
          <div className="product-cascade-child flex-1">
            {activeCategory && (
              <>
                <h6 className="font-bold text-gray-900 mb-3 text-sm">{activeCategory.name}</h6>
                <div className="grid grid-cols-2 gap-2">
                  {(activeCategory.children || [])
                    .filter(c => c.is_active !== false)
                    .map(child => (
                      <Link
                        key={child.id}
                        to={`/products?category=${activeCategory.id}&subcategory=${child.id}`}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-red-50 hover:text-tis-red transition-all"
                      >
                        <i className="fas fa-shield-halved text-gray-400 text-xs" />
                        {child.name}
                      </Link>
                    ))
                  }
                  {!(activeCategory.children?.length) && (
                    <Link
                      to={`/products?category=${activeCategory.id}`}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-red-50 hover:text-tis-red col-span-2"
                    >
                      <i className="fas fa-arrow-right text-xs" /> Xem tất cả sản phẩm
                    </Link>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    to={`/category/${activeCategory.id}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 text-tis-red text-sm font-semibold hover:underline"
                  >
                    Xem tất cả {activeCategory.name} <i className="fas fa-arrow-right" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
