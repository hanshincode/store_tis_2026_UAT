import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const EMPTY_EDITOR_HTML = '<p><br></p>'

const TOOLBAR_OPTIONS = {
  container: [
    [{ header: [2, 3, 4, false] }],
    [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }, 'uppercase'],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ direction: 'rtl' }, { align: [] }],
    ['link', 'image', 'video'],
    ['clean'],
  ],
  handlers: {
    uppercase() {
      const selection = this.quill.getSelection()

      if (!selection?.length) return

      const selectedText = this.quill.getText(selection.index, selection.length)
      const formats = this.quill.getFormat(selection.index, selection.length)

      this.quill.deleteText(selection.index, selection.length, 'user')
      this.quill.insertText(selection.index, selectedText.toUpperCase(), formats, 'user')
      this.quill.setSelection(selection.index, selection.length, 'silent')
    },
  },
}

const normalizeHtml = (html = '') => (html === EMPTY_EDITOR_HTML ? '' : html)

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '420px',
}) {
  const editorRef = useRef(null)
  const quillRef = useRef(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return undefined

    const editorElement = editorRef.current
    const quill = new Quill(editorElement, {
      theme: 'snow',
      placeholder,
      modules: { toolbar: TOOLBAR_OPTIONS },
    })

    quillRef.current = quill

    const handleTextChange = () => {
      onChangeRef.current?.(normalizeHtml(quill.root.innerHTML))
    }

    quill.on('text-change', handleTextChange)

    return () => {
      quill.off('text-change', handleTextChange)
      editorElement.parentElement
        ?.querySelectorAll(':scope > .ql-toolbar')
        .forEach(toolbar => toolbar.remove())
      editorElement.innerHTML = ''
      quillRef.current = null
    }
  }, [placeholder])

  useEffect(() => {
    const quill = quillRef.current

    if (!quill) return

    const nextValue = value || ''
    const currentValue = normalizeHtml(quill.root.innerHTML)

    if (nextValue !== currentValue) {
      quill.clipboard.dangerouslyPasteHTML(nextValue || EMPTY_EDITOR_HTML, 'silent')
    }
  }, [value])

  return (
    <div className="rich-text-editor" style={{ '--rich-text-min-height': minHeight }}>
      <div ref={editorRef} />
    </div>
  )
}
