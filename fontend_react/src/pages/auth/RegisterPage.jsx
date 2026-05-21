import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import Swal from 'sweetalert2'

const schema = z.object({
  user_type: z.enum(['individual', 'enterprise']),
  fullName: z.string().min(1, 'Vui lòng nhập họ và tên'),
  phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không đúng định dạng Việt Nam'),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  tax_code: z.string().optional(),
  company_name: z.string().optional(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
}).refine(d => {
  if (d.user_type === 'enterprise') {
    return !!d.tax_code?.trim() && !!d.company_name?.trim()
  }
  return true
}, {
  message: 'Vui lòng nhập đầy đủ thông tin doanh nghiệp',
  path: ['tax_code'],
})

function splitRegisterFullName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return { last_name: '', first_name: parts[0] || '' }
  }
  return {
    last_name: parts.slice(0, -1).join(' '),
    first_name: parts[parts.length - 1],
  }
}

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatVietnamDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function sanitizeRegistrationTermsHtml(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, form, input, button').forEach(node => node.remove())
  doc.querySelectorAll('*').forEach(node => {
    Array.from(node.attributes).forEach(attr => {
      const name = attr.name.toLowerCase()
      const value = attr.value || ''
      if (name.startsWith('on') || value.toLowerCase().includes('javascript:')) {
        node.removeAttribute(attr.name)
      }
    })
  })
  return doc.body.innerHTML
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [companyNameReadOnly, setCompanyNameReadOnly] = useState(false)

  const [passwordStrength, setPasswordStrength] = useState({
    visible: false,
    width: '0%',
    className: '',
    text: '',
    textClass: ''
  })

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      user_type: 'individual',
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirm_password: '',
      tax_code: '',
      company_name: '',
    }
  })

  const userType = watch('user_type')

  const handlePasswordChange = (e) => {
    const password = e.target.value
    if (!password) {
      setPasswordStrength({ visible: false, width: '0%', className: '', text: '', textClass: '' })
      return
    }

    let strength = 0
    if (password.length >= 6) strength += 1
    if (password.length >= 8) strength += 1
    if (password.match(/[a-z]+/)) strength += 1
    if (password.match(/[A-Z]+/)) strength += 1
    if (password.match(/[0-9]+/)) strength += 1
    if (password.match(/[$@#&!%^*?_~]+/)) strength += 1

    let width = '20%'
    let className = 'bg-danger'
    let text = 'Yếu: Cần ít nhất 6 ký tự'
    let textClass = 'text-danger mt-1 d-block small'

    if (password.length < 6) {
      // remains weak
    } else if (strength <= 3) {
      width = '50%'
      className = 'bg-warning'
      text = 'Trung bình: Thêm số hoặc chữ hoa'
      textClass = 'text-warning mt-1 d-block small'
    } else if (strength <= 5) {
      width = '75%'
      className = 'bg-info'
      text = 'Khá: Thêm ký tự đặc biệt'
      textClass = 'text-info mt-1 d-block small'
    } else {
      width = '100%'
      className = 'bg-success'
      text = 'Tuyệt vời!'
      textClass = 'text-success mt-1 d-block small'
    }

    setPasswordStrength({
      visible: true,
      width,
      className: `progress-bar progress-bar-striped progress-bar-animated ${className}`,
      text,
      textClass
    })
  }

  const lookupMST = async () => {
    const mst = watch('tax_code')?.trim()
    if (!mst) {
      Swal.fire({ icon: 'warning', title: 'Thông báo', text: 'Vui lòng nhập Mã số thuế!' })
      return
    }
    setLookingUp(true)
    try {
      const res = await fetch(`https://api.vietqr.io/v2/business/${mst}`)
      const data = await res.json()
      if (data.code === '00' && data.data) {
        setValue('company_name', data.data.name)
        setCompanyNameReadOnly(true)
        Swal.fire({ icon: 'success', title: 'Thành công', text: 'Lấy thông tin thành công!' })
      } else {
        throw new Error('Không tìm thấy MST')
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Thất bại', text: 'Không tìm thấy MST! Vui lòng nhập tay.' })
      setValue('company_name', '')
      setCompanyNameReadOnly(false)
    } finally {
      setLookingUp(false)
    }
  }

  const showRegistrationTermsDialog = async (payload) => {
    try {
      const { data: terms } = await api.get('/registration-terms/current/')
      let hasSigned = false
      let signatureData = ''

      const result = await Swal.fire({
        title: terms.title || 'Điều khoản đăng ký tài khoản',
        html: `
          <div class="registration-terms-shell text-start">
            <div class="d-flex justify-content-between gap-3 mb-2 small text-muted">
              <span>Phiên bản: <strong>${escapeHTML(terms.version || '1.0')}</strong></span>
              <span>Cập nhật: ${escapeHTML(formatVietnamDateTime(terms.updated_at))}</span>
            </div>
            <div id="registration-scroll-hint" class="alert alert-warning py-2 small mb-3">
              Vui lòng kéo xuống cuối điều khoản để mở phần chấp nhận và ký xác nhận.
            </div>
            <div id="registration-terms-content" class="registration-terms-content">
              ${sanitizeRegistrationTermsHtml(terms.content || '<p>Điều khoản đăng ký đang được cập nhật.</p>')}
            </div>
            <div id="registration-accept-wrap" class="registration-accept-wrap d-none">
              <label class="registration-accept-line">
                <input type="checkbox" id="registration-accept">
                <span>Tôi chấp nhận toàn bộ điều khoản trên</span>
              </label>
              <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <strong>Ký xác nhận trực tiếp</strong>
                  <button type="button" class="btn btn-sm btn-light border" id="registration-clear-signature">Ký lại</button>
                </div>
                <canvas id="registration-signature-canvas" class="registration-signature-canvas"></canvas>
                <div class="form-text">Dùng chuột hoặc ngón tay để ký trong khung này.</div>
              </div>
            </div>
          </div>
        `,
        width: 920,
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: 'Tôi chấp nhận và ký xác nhận',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#D71920',
        allowOutsideClick: false,
        focusConfirm: false,
        customClass: { popup: 'registration-terms-dialog' },
        didOpen: () => {
          const popup = Swal.getPopup()
          const confirmButton = Swal.getConfirmButton()
          const termsBox = popup.querySelector('#registration-terms-content')
          const acceptWrap = popup.querySelector('#registration-accept-wrap')
          const acceptInput = popup.querySelector('#registration-accept')
          const canvas = popup.querySelector('#registration-signature-canvas')
          const clearButton = popup.querySelector('#registration-clear-signature')
          const hint = popup.querySelector('#registration-scroll-hint')
          const ctx = canvas.getContext('2d')
          let drawing = false
          let lastPoint = null
          let canvasReady = false

          confirmButton.disabled = true

          const updateConfirm = () => {
            confirmButton.disabled = !(acceptInput.checked && hasSigned)
          }
          const revealAccept = () => {
            acceptWrap.classList.remove('d-none')
            hint.textContent = 'Bạn có thể chấp nhận điều khoản và ký xác nhận bên dưới.'
            requestAnimationFrame(() => resizeCanvas({ clearSignature: !canvasReady }))
          }
          const checkScroll = () => {
            const atBottom = termsBox.scrollTop + termsBox.clientHeight >= termsBox.scrollHeight - 8
            if (atBottom) revealAccept()
          }
          if (termsBox.scrollHeight <= termsBox.clientHeight + 8) revealAccept()
          termsBox.addEventListener('scroll', checkScroll)
          acceptInput.addEventListener('change', updateConfirm)

          const setupCanvasContext = () => {
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.lineWidth = 2.4
            ctx.strokeStyle = '#111827'
          }
          const resizeCanvas = ({ clearSignature = true } = {}) => {
            const rect = canvas.getBoundingClientRect()
            if (rect.width < 2 || rect.height < 2) return
            canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio))
            canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio))
            setupCanvasContext()
            canvasReady = true
            if (clearSignature) {
              hasSigned = false
              updateConfirm()
            }
          }
          setupCanvasContext()
          window.addEventListener('resize', () => {
            if (!acceptWrap.classList.contains('d-none') && !hasSigned) resizeCanvas()
          })

          const getPoint = event => {
            const rect = canvas.getBoundingClientRect()
            return {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            }
          }
          const startDraw = event => {
            event.preventDefault()
            if (!canvasReady) resizeCanvas()
            canvas.setPointerCapture?.(event.pointerId)
            drawing = true
            lastPoint = getPoint(event)
            ctx.beginPath()
            ctx.arc(lastPoint.x, lastPoint.y, 1.2, 0, Math.PI * 2)
            ctx.fillStyle = '#111827'
            ctx.fill()
            hasSigned = true
            updateConfirm()
          }
          const draw = event => {
            if (!drawing || !lastPoint) return
            event.preventDefault()
            const point = getPoint(event)
            ctx.beginPath()
            ctx.moveTo(lastPoint.x, lastPoint.y)
            ctx.lineTo(point.x, point.y)
            ctx.stroke()
            lastPoint = point
            hasSigned = true
            updateConfirm()
          }
          const stopDraw = () => {
            drawing = false
            lastPoint = null
          }
          canvas.addEventListener('pointerdown', startDraw)
          canvas.addEventListener('pointermove', draw)
          canvas.addEventListener('pointerup', stopDraw)
          canvas.addEventListener('pointerleave', stopDraw)
          clearButton.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            hasSigned = false
            updateConfirm()
          })
        },
        preConfirm: () => {
          const popup = Swal.getPopup()
          const acceptInput = popup.querySelector('#registration-accept')
          const canvas = popup.querySelector('#registration-signature-canvas')
          if (!acceptInput.checked || !hasSigned) {
            Swal.showValidationMessage('Vui lòng chấp nhận điều khoản và ký xác nhận.')
            return false
          }
          signatureData = canvas.toDataURL('image/png')
          return true
        },
      })

      if (!result.isConfirmed) return false
      payload.registration_terms_accepted = true
      payload.registration_terms_id = terms.id
      payload.registration_signature_data = signatureData
      return true
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Thất bại',
        text: error.response?.data?.detail || error.message || 'Không thể tải điều khoản đăng ký.',
        confirmButtonColor: '#D71920'
      })
      return false
    }
  }

  const onSubmit = async (data) => {
    const nameParts = splitRegisterFullName(data.fullName)
    const payload = {
      username: data.phone,
      phone: data.phone,
      password: data.password,
      role: 'customer',
      user_type: data.user_type,
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      email: data.email,
      company_name: data.company_name || '',
      tax_code: data.tax_code || '',
    }

    const accepted = await showRegistrationTermsDialog(payload)
    if (!accepted) return

    try {
      await api.post('/register/', payload)
      await Swal.fire({
        icon: 'success',
        title: 'Đăng ký thành công!',
        text: 'Vui lòng kiểm tra điện thoại để nhận mã xác thực.',
        confirmButtonColor: '#D71920',
      })
      navigate(`/verify-email?phone=${encodeURIComponent(payload.phone)}`)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Đăng ký thất bại',
        text: err.response?.data?.detail || err.message || 'Đăng ký thất bại. Vui lòng thử lại.',
        confirmButtonColor: '#D71920'
      })
    }
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <img
          src="/images/logo.png"
          alt="TIS Logo"
          className="auth-logo mx-auto"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = 'https://via.placeholder.com/200x60/d71920/ffffff?text=TIS+BROKER'
          }}
        />
        <h3 className="fw-bold text-dark m-0 mt-3">Đăng ký tài khoản</h3>
        <p className="text-muted mt-1">Chào mừng trở lại TIS Broker</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Customer Type Selection */}
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Loại khách hàng</label>
          <select {...register('user_type')} id="user_type" className="form-select">
            <option value="individual">Cá nhân</option>
            <option value="enterprise">Doanh nghiệp</option>
          </select>
        </div>

        {/* Enterprise Fields */}
        {userType === 'enterprise' && (
          <div id="enterprise-fields" className="mb-3 text-left">
            <div className="mb-3">
              <label className="fw-bold small mb-1">Mã số thuế</label>
              <div className="input-group">
                <input
                  {...register('tax_code')}
                  type="text"
                  id="tax_code"
                  className="form-control"
                  placeholder="Mã số thuế doanh nghiệp"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      lookupMST()
                    }
                  }}
                />
                <button
                  type="button"
                  id="btn-lookup-mst"
                  onClick={lookupMST}
                  disabled={lookingUp}
                  className="btn btn-secondary"
                  style={{ minWidth: '80px' }}
                >
                  {lookingUp ? <i className="fas fa-spinner fa-spin" /> : 'Tra cứu'}
                </button>
              </div>
              {errors.tax_code && <p className="mt-1 text-xs text-red-500">{errors.tax_code.message}</p>}
            </div>

            <div>
              <label className="fw-bold small mb-1">Tên doanh nghiệp</label>
              <input
                {...register('company_name')}
                type="text"
                id="company_name"
                readOnly={companyNameReadOnly}
                className="form-control"
                placeholder="Tên doanh nghiệp (tự động tra cứu)"
              />
              {errors.company_name && <p className="mt-1 text-xs text-red-500">{errors.company_name.message}</p>}
            </div>
          </div>
        )}

        {/* Full Name */}
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Họ và tên</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-user text-muted" /></span>
            <input
              {...register('fullName')}
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Nguyễn Văn A"
            />
          </div>
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        {/* Phone */}
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Số điện thoại</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-phone-alt text-muted" /></span>
            <input
              {...register('phone')}
              type="tel"
              className="form-control border-start-0 ps-0"
              placeholder="Nhập số điện thoại"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        {/* Email */}
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Email</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-envelope text-muted" /></span>
            <input
              {...register('email')}
              type="email"
              className="form-control border-start-0 ps-0"
              placeholder="email@example.com"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Mật khẩu</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              className="form-control border-start-0 border-end-0 ps-0"
              placeholder="Tối thiểu 6 ký tự"
              onChange={(e) => {
                register('password').onChange(e)
                handlePasswordChange(e)
              }}
            />
            <span
              className="input-group-text bg-white cursor-pointer toggle-password"
              onClick={() => setShowPass(!showPass)}
            >
              <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-muted`} />
            </span>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}

          {/* Password Strength Meter */}
          {passwordStrength.visible && (
            <div className="mt-2" id="password-strength-container" style={{ display: 'block' }}>
              <div className="progress" style={{ height: '6px' }}>
                <div
                  className={passwordStrength.className}
                  role="progressbar"
                  style={{ width: passwordStrength.width }}
                />
              </div>
              <small className={passwordStrength.textClass} id="password-strength-text">
                {passwordStrength.text}
              </small>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-4 text-left">
          <label className="fw-bold small mb-1">Xác nhận mật khẩu</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              className="form-control border-start-0 border-end-0 ps-0"
              placeholder="Nhập lại mật khẩu"
            />
            <span
              className="input-group-text bg-white cursor-pointer toggle-password"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'} text-muted`} />
            </span>
          </div>
          {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>}
        </div>

        {/* Terms Text */}
        <p className="text-xs text-gray-500 leading-relaxed text-left mb-4">
          Bằng việc đăng ký, bạn đồng ý với{' '}
          <Link to="/terms" className="text-danger hover:underline font-medium">Điều khoản sử dụng</Link>
          {' '}và{' '}
          <Link to="/privacy" className="text-danger hover:underline font-medium">Chính sách bảo mật</Link>
          {' '}của TIS Broker.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-100 p-3 fw-bold"
          style={{ backgroundColor: '#d71920', borderColor: '#d71920', color: '#fff' }}
        >
          {isSubmitting ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-danger font-semibold hover:underline">Đăng nhập</Link>
        </p>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-danger transition-colors">
            <i className="fas fa-arrow-left mr-1" /> Quay về trang chủ
          </Link>
        </div>
      </form>
    </div>
  )
}
