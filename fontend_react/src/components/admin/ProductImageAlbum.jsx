import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

const FILE_OPERATIONS = {
  rotateLeft: { label: 'Xoay trái', icon: 'fa-rotate-left' },
  rotateRight: { label: 'Xoay phải', icon: 'fa-rotate-right' },
  flip: { label: 'Lật ngang', icon: 'fa-arrows-left-right' },
  cropSquare: { label: 'Cắt vuông', icon: 'fa-crop' },
}

const swapByKey = (items, fromKey, toKey) => {
  const fromIndex = items.findIndex(item => item.key === fromKey)
  const toIndex = items.findIndex(item => item.key === toKey)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

const createBitmap = async (file) => {
  if ('createImageBitmap' in window) return window.createImageBitmap(file)

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  await image.decode()
  URL.revokeObjectURL(url)
  return image
}

const canvasToFile = (canvas, originalFile) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Không tạo được ảnh sau khi chỉnh sửa.'))
      return
    }

    resolve(new File([blob], originalFile.name, {
      type: blob.type || originalFile.type || 'image/jpeg',
      lastModified: Date.now(),
    }))
  }, originalFile.type || 'image/jpeg', 0.94)
})

const editFile = async (file, operation) => {
  const image = await createBitmap(file)
  const width = image.width
  const height = image.height
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Trình duyệt không hỗ trợ chỉnh ảnh.')

  if (operation === 'cropSquare') {
    const size = Math.min(width, height)
    const sx = Math.max(0, (width - size) / 2)
    const sy = Math.max(0, (height - size) / 2)
    canvas.width = size
    canvas.height = size
    context.drawImage(image, sx, sy, size, size, 0, 0, size, size)
    return canvasToFile(canvas, file)
  }

  const rotated = operation === 'rotateLeft' || operation === 'rotateRight'
  canvas.width = rotated ? height : width
  canvas.height = rotated ? width : height
  context.translate(canvas.width / 2, canvas.height / 2)

  if (operation === 'rotateLeft') context.rotate(-Math.PI / 2)
  if (operation === 'rotateRight') context.rotate(Math.PI / 2)
  if (operation === 'flip') context.scale(-1, 1)

  context.drawImage(image, -width / 2, -height / 2)
  return canvasToFile(canvas, file)
}

export const createNewProductImageItem = (file) => ({
  key: `new-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
  file,
  name: file.name,
  preview: URL.createObjectURL(file),
})

export const createStoredProductImageItem = (image, src) => ({
  key: `stored-${image.id}`,
  id: image.id,
  name: `Ảnh #${image.id}`,
  preview: src,
})

export default function ProductImageAlbum({ items, onChange, onRemoveStored }) {
  const inputRef = useRef(null)
  const [dragKey, setDragKey] = useState('')
  const [editingKey, setEditingKey] = useState('')
  const [processing, setProcessing] = useState('')
  const [loadingStoredKey, setLoadingStoredKey] = useState('')

  const editingItem = items.find(item => item.key === editingKey)

  const addFiles = (fileList) => {
    const files = [...fileList].filter(file => file.type.startsWith('image/'))

    if (!files.length) {
      toast.error('Vui lòng chọn file ảnh.')
      return
    }

    onChange([...items, ...files.map(createNewProductImageItem)])
  }

  const removeItem = (item) => {
    if (item.file && item.preview) URL.revokeObjectURL(item.preview)
    if (item.id) onRemoveStored(item.id)
    onChange(items.filter(current => current.key !== item.key))
  }

  const replaceEditedFile = async (operation) => {
    if (!editingItem?.file || processing) return

    setProcessing(operation)
    try {
      const nextFile = await editFile(editingItem.file, operation)
      const nextPreview = URL.createObjectURL(nextFile)
      URL.revokeObjectURL(editingItem.preview)
      onChange(items.map(item => item.key === editingItem.key
        ? { ...item, file: nextFile, name: nextFile.name, preview: nextPreview }
        : item))
      toast.success(`${FILE_OPERATIONS[operation].label} ảnh xong`)
    } catch (error) {
      toast.error(error.message || 'Không chỉnh sửa được ảnh.')
    } finally {
      setProcessing('')
    }
  }

  const openEditor = async (item) => {
    if (item.file) {
      setEditingKey(item.key)
      return
    }

    setLoadingStoredKey(item.key)
    try {
      const response = await fetch(item.preview)
      if (!response.ok) throw new Error('Không tải được ảnh cũ để chỉnh sửa.')

      const blob = await response.blob()
      const extension = blob.type.split('/')[1] || 'jpg'
      const nextFile = new File([blob], `product-image-${item.id}.${extension}`, {
        type: blob.type || 'image/jpeg',
        lastModified: Date.now(),
      })
      const nextPreview = URL.createObjectURL(nextFile)

      onRemoveStored(item.id)
      onChange(items.map(current => current.key === item.key
        ? { key: current.key, file: nextFile, name: nextFile.name, preview: nextPreview }
        : current))
      setEditingKey(item.key)
    } catch (error) {
      toast.error(error.message || 'Không mở được ảnh đã lưu. Hãy import lại ảnh để chỉnh.')
    } finally {
      setLoadingStoredKey('')
    }
  }

  return (
    <div className="product-image-album">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files || [])
          event.target.value = ''
        }}
      />

      <button
        type="button"
        className="product-image-dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={event => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles(event.dataTransfer.files || [])
        }}
      >
        <i className="fas fa-images" />
        <span>Import nhiều ảnh cùng lúc</span>
        <small>Chọn ảnh hoặc thả file vào đây. Kéo thả ảnh bên dưới để đổi thứ tự hiển thị.</small>
      </button>

      {items.length > 0 && (
        <div className="product-image-list">
          {items.map((item, index) => (
            <article
              key={item.key}
              className={`product-image-row ${dragKey === item.key ? 'is-dragging' : ''}`}
              draggable
              onDragStart={() => setDragKey(item.key)}
              onDragEnd={() => setDragKey('')}
              onDragOver={event => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                onChange(swapByKey(items, dragKey, item.key))
                setDragKey('')
              }}
            >
              <button type="button" className="product-image-grip" title="Kéo để đổi thứ tự">
                <i className="fas fa-grip-vertical" />
              </button>
              <div className="product-image-preview">
                <img src={item.preview} alt="" />
                {index === 0 && <span>Ảnh đại diện</span>}
              </div>
              <div className="product-image-meta">
                <strong>{item.name}</strong>
                <small>{item.file ? 'Ảnh mới, có thể chỉnh trước khi lưu' : 'Ảnh đã lưu'}</small>
              </div>
              <div className="product-image-actions">
                <button type="button" onClick={() => openEditor(item)} disabled={loadingStoredKey === item.key} title="Chỉnh ảnh">
                  <i className={`fas ${loadingStoredKey === item.key ? 'fa-spinner fa-spin' : 'fa-sliders'}`} />
                </button>
                <button type="button" onClick={() => removeItem(item)} title="Xóa ảnh">
                  <i className="fas fa-trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingItem?.file && (
        <div className="product-image-editor-backdrop" role="dialog" aria-modal="true" aria-label="Chỉnh ảnh sản phẩm">
          <div className="product-image-editor">
            <div className="product-image-editor-head">
              <div>
                <strong>Chỉnh ảnh trước khi upload</strong>
                <span>{editingItem.name}</span>
              </div>
              <button type="button" onClick={() => setEditingKey('')} title="Đóng">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="product-image-editor-stage">
              <img src={editingItem.preview} alt="" />
            </div>
            <div className="product-image-editor-tools">
              {Object.entries(FILE_OPERATIONS).map(([key, operation]) => (
                <button key={key} type="button" disabled={Boolean(processing)} onClick={() => replaceEditedFile(key)}>
                  <i className={`fas ${processing === key ? 'fa-spinner fa-spin' : operation.icon}`} />
                  {operation.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
