import { useState } from 'react'

export default function PasswordField({
  className = '',
  buttonClassName = '',
  style,
  ...props
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
        style={{ ...style, paddingRight: style?.paddingRight || '2.5rem' }}
      />
      <button
        type="button"
        onClick={() => setVisible(current => !current)}
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition ${buttonClassName}`}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        <i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
    </div>
  )
}
