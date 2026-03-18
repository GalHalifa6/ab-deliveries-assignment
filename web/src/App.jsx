import { useEffect, useState } from 'react'
import illustrationImage from './assets/71b1ce93ba00a27b8ef291cb449e0a6ea47d2ba9.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const INITIAL_FORM_DATA = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const INITIAL_SUBMIT_STATE = {
  status: 'idle',
  message: '',
}

const AUTH_MODE_CONFIG = {
  login: {
    endpoint: 'login',
    loadingMessage: 'Signing you in...',
    emptyFieldsMessage: 'Please enter your email and password.',
    successMessage: 'Login completed successfully.',
    buildPayload: (formData) => ({
      email: formData.email,
      password: formData.password,
    }),
    resetFormData: (current) => ({
      ...current,
      password: '',
    }),
  },
  register: {
    endpoint: 'register',
    loadingMessage: 'Creating your account...',
    emptyFieldsMessage: 'Please fill in all registration fields.',
    successMessage: 'Registration completed successfully.',
    buildPayload: (formData) => ({
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      password: formData.password,
    }),
    resetFormData: () => ({
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    }),
  },
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 19C5.5 15.96 8.19 13.5 12 13.5C15.81 13.5 18.5 15.96 18.5 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M8.5 3.75H15.5C16.19 3.75 16.75 4.31 16.75 5V19C16.75 19.69 16.19 20.25 15.5 20.25H8.5C7.81 20.25 7.25 19.69 7.25 19V5C7.25 4.31 7.81 3.75 8.5 3.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M10.5 17H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 6.5L11.16 11.26C11.67 11.62 12.35 11.62 12.86 11.26L19.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M8 10V7.5C8 5.57 9.57 4 11.5 4C13.43 4 15 5.57 15 7.5V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5" y="10" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 14V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M2.75 12C4.45 8.85 7.6 6 12 6C16.4 6 19.55 8.85 21.25 12C19.55 15.15 16.4 18 12 18C7.6 18 4.45 15.15 2.75 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function TextField({ ariaLabel, icon, ...inputProps }) {
  return (
    <label className="field" aria-label={ariaLabel}>
      <span className="field__icon" aria-hidden="true">
        {icon}
      </span>
      <input className="field__input" {...inputProps} />
    </label>
  )
}

function PasswordField({
  ariaLabel,
  name,
  placeholder,
  value,
  onChange,
  disabled,
  isVisible,
  onToggleVisibility,
}) {
  return (
    <label className="field" aria-label={ariaLabel}>
      <span className="field__icon" aria-hidden="true">
        <LockIcon />
      </span>
      <input
        className="field__input"
        type={isVisible ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <button
        className="field__action"
        type="button"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        onClick={onToggleVisibility}
        disabled={disabled}
      >
        <EyeIcon />
      </button>
    </label>
  )
}

function SocialAuthButton({ label, disabled, children }) {
  return (
    <button className="button button--outline button--half" type="button" disabled={disabled}>
      <span className="button__icon" aria-hidden="true">
        {children}
      </span>
      <span>{label}</span>
    </button>
  )
}

function App() {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [submitState, setSubmitState] = useState(INITIAL_SUBMIT_STATE)
  const [toastMessage, setToastMessage] = useState('')

  const isRegisterMode = mode === 'register'
  const currentModeConfig = AUTH_MODE_CONFIG[mode]
  const isSubmitting = submitState.status === 'loading'
  const hasEmailValue = Boolean(formData.email)
  const isLoginFormValid = Boolean(formData.email && formData.password)
  const isRegisterFormValid = Boolean(
    formData.fullName &&
      formData.phone &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      formData.password === formData.confirmPassword
  )
  const isSubmitDisabled = isSubmitting || (isRegisterMode ? !isRegisterFormValid : !isLoginFormValid)

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setShowPassword(false)
    setShowConfirmPassword(false)
    setSubmitState(INITIAL_SUBMIT_STATE)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.email || !formData.password) {
      setSubmitState({
        status: 'error',
        message: currentModeConfig.emptyFieldsMessage,
      })
      return
    }

    if (isRegisterMode && (!formData.fullName || !formData.phone || !formData.confirmPassword)) {
      setSubmitState({
        status: 'error',
        message: AUTH_MODE_CONFIG.register.emptyFieldsMessage,
      })
      return
    }

    if (isRegisterMode && formData.password !== formData.confirmPassword) {
      setSubmitState({
        status: 'error',
        message: 'Passwords do not match.',
      })
      return
    }

    setSubmitState({
      status: 'loading',
      message: currentModeConfig.loadingMessage,
    })

    try {
      const endpoint = currentModeConfig.endpoint
      const payload = currentModeConfig.buildPayload(formData)

      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed.')
      }

      setSubmitState({
        status: 'success',
        message: data.message || currentModeConfig.successMessage,
      })

      if (isRegisterMode && data.toastMessage) {
        setToastMessage(data.toastMessage)
      }

      setFormData((current) => currentModeConfig.resetFormData(current))
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error.message || 'Could not connect to the Python server.',
      })
    }
  }

  return (
    <main className="page">
      {toastMessage ? (
        <div className="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}

      <section className="auth-card">
        <div className="auth-card__left">
          <div className="hero-orb" aria-hidden="true">
            <svg
              width="278"
              height="278"
              viewBox="0 0 278 278"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle opacity="0.6" cx="138.903" cy="138.903" r="138.903" fill="#00227B" />
            </svg>
          </div>

          <img className="hero-illustration" src={illustrationImage} alt="" aria-hidden="true" />

          <div className="brand-mark">
            <div className="brand-mark__frame" aria-hidden="true">
              <svg
                className="brand-mark__piece brand-mark__piece--top"
                width="33"
                height="13"
                viewBox="0 0 33 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M28.5412 10.8415C28.5263 10.0271 28.243 8.29873 27.929 7.56726C27.6149 6.83579 27.1888 6.20614 26.6504 5.67827C26.0971 5.15041 25.4654 4.73944 24.7551 4.44534C24.0448 4.15125 23.2933 4.0042 22.5008 4.0042C17.5018 4.0042 13.7525 4.0042 11.253 4.0042C8.75235 4.0042 5.00134 4.0042 -7.94807e-08 4.0042V0H22.6129C23.9438 0 25.2037 0.248846 26.3925 0.746546C27.5813 1.24425 28.6243 1.94554 29.5215 2.85045C30.4188 3.74027 31.1179 4.78467 31.6188 5.98368C32.1198 7.18268 32.5398 9.66137 32.5398 11.0037V12.9787H28.5412C28.5412 12.5342 28.545 10.9224 28.5412 10.8415Z" fill="white" />
              </svg>
              <svg
                className="brand-mark__piece brand-mark__piece--right"
                width="14"
                height="33"
                viewBox="0 0 14 33"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2.14722 28.4075C2.96548 28.3926 4.70198 28.1106 5.4369 27.798C6.17181 27.4855 6.80443 27.0613 7.33478 26.5255C7.86513 25.9748 8.27804 25.346 8.57352 24.639C8.869 23.932 9.01674 23.1841 9.01674 22.3953V0H13.0398V22.5069C13.0398 23.8316 12.7898 25.0855 12.2897 26.2688C11.7897 27.452 11.0851 28.4901 10.1759 29.3832C9.2819 30.2762 8.23259 30.972 7.02794 31.4706C5.82329 31.9692 3.33292 32.3873 1.98432 32.3873H0V28.4075C0.446595 28.4075 2.06595 28.4112 2.14722 28.4075Z" fill="white" />
              </svg>
              <svg
                className="brand-mark__piece brand-mark__piece--bottom"
                width="33"
                height="13"
                viewBox="0 0 33 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3.99859 2.13716C4.01355 2.95158 4.29684 4.67994 4.61087 5.41141C4.92489 6.14288 5.35107 6.77253 5.88941 7.3004C6.4427 7.82826 7.07448 8.23923 7.78479 8.53333C8.49509 8.82742 9.2465 8.97447 10.0391 8.97447H32.5398V12.9787H9.9269C8.59602 12.9787 7.33618 12.7298 6.14736 12.2321C4.95853 11.7344 3.91552 11.0331 3.0183 10.1282C2.12107 9.2384 1.42199 8.194 0.921042 6.99499C0.420091 5.79599 0 3.3173 0 1.97502V7.91081e-08H3.99859C3.99859 0.444501 3.99486 2.05627 3.99859 2.13716Z" fill="white" />
              </svg>
              <svg
                className="brand-mark__piece brand-mark__piece--left"
                width="14"
                height="33"
                viewBox="0 0 14 33"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M13.0398 3.97985H10.8926C10.0743 3.99473 8.33781 4.27669 7.6029 4.58925C6.86799 4.90181 6.23536 5.32599 5.70502 5.8618C5.17467 6.41249 4.76176 7.04132 4.46628 7.74829C4.1708 8.45527 4.02306 9.20316 4.02306 9.99199C4.02306 12.9772 4.02306 15.2161 4.02306 16.7086C4.02306 20.1928 4.02306 25.419 4.02306 32.3873C3.59794 32.3873 0.149844 32.3873 0 32.3873L0 9.88037C0 8.55572 0.250018 7.30179 0.750062 6.11854C1.25011 4.93529 1.9547 3.89717 2.86387 3.00415C3.75789 2.11113 4.80721 1.41533 6.01186 0.916725C7.21651 0.418122 9.70688 -1.20313e-09 11.0555 -1.20313e-09C11.1973 -1.20313e-09 13.0398 -1.20313e-09 13.0398 -1.20313e-09C13.0398 1.0993 13.0398 3.13314 13.0398 3.97985Z" fill="white" />
              </svg>
            </div>
            <svg
              className="brand-mark__icon"
              width="18"
              height="22"
              viewBox="0 0 18 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M0 6.43005C0 5.54281 0.170272 4.71039 0.510817 3.9328C0.851362 3.15521 1.3121 2.47732 1.89303 1.89911C2.48397 1.31093 3.17007 0.847371 3.95132 0.508423C4.73257 0.169474 5.56891 0 6.46034 0H16.3462V4.29169H6.46034C6.15986 4.29169 5.87941 4.34652 5.61899 4.45618C5.35857 4.56584 5.1282 4.72036 4.92788 4.91974C4.73758 5.10915 4.58734 5.33346 4.47716 5.59265C4.36699 5.85185 4.3119 6.13098 4.3119 6.43005C4.3119 6.72913 4.36699 7.01324 4.47716 7.28241C4.58734 7.54161 4.73758 7.77089 4.92788 7.97028C5.1282 8.15969 5.35857 8.30922 5.61899 8.41888C5.87941 8.52854 6.15986 8.58337 6.46034 8.58337H10.7722C11.6637 8.58337 12.5 8.75285 13.2812 9.0918C14.0725 9.42078 14.7586 9.87935 15.3395 10.4675C15.9305 11.0457 16.3912 11.7286 16.7218 12.5162C17.0623 13.2938 17.2326 14.1262 17.2326 15.0134C17.2326 15.9007 17.0623 16.7331 16.7218 17.5107C16.3912 18.2883 15.9305 18.9712 15.3395 19.5593C14.7586 20.1375 14.0725 20.5961 13.2812 20.9351C12.5 21.274 11.6637 21.4435 10.7722 21.4435H1.20192V17.1518H10.7722C11.0727 17.1518 11.3532 17.097 11.6136 16.9873C11.874 16.8776 12.0994 16.7281 12.2897 16.5387C12.49 16.3393 12.6452 16.11 12.7554 15.8508C12.8656 15.5916 12.9207 15.3125 12.9207 15.0134C12.9207 14.7144 12.8656 14.4352 12.7554 14.176C12.6452 13.9168 12.49 13.6925 12.2897 13.5031C12.0994 13.3037 11.874 13.1492 11.6136 13.0396C11.3532 12.9299 11.0727 12.8751 10.7722 12.8751H6.46034C5.56891 12.8751 4.73257 12.7056 3.95132 12.3666C3.17007 12.0277 2.48397 11.5691 1.89303 10.9909C1.3121 10.4027 0.851362 9.71985 0.510817 8.94226C0.170272 8.1547 0 7.3173 0 6.43005Z"
                fill="white"
              />
            </svg>
          </div>

          <svg
            className="brand-wordmark"
            width="284"
            height="22"
            viewBox="0 0 284 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M24.492 0.480001L19.116 17.76H16.584L12.528 5.352C12.48 5.216 12.432 5.068 12.384 4.908C12.344 4.748 12.304 4.576 12.264 4.392C12.224 4.576 12.18 4.748 12.132 4.908C12.092 5.068 12.048 5.216 12 5.352L7.908 17.76H5.376L-9.53674e-07 0.480001H2.352C2.592 0.480001 2.792 0.540001 2.952 0.660001C3.12 0.772002 3.232 0.928002 3.288 1.128L6.528 12.204C6.592 12.444 6.652 12.704 6.708 12.984C6.764 13.264 6.82 13.556 6.876 13.86C6.932 13.556 6.992 13.264 7.056 12.984C7.128 12.696 7.204 12.436 7.284 12.204L10.992 1.128C11.048 0.968002 11.16 0.820002 11.328 0.684001C11.496 0.548001 11.696 0.480001 11.928 0.480001H12.744C12.992 0.480001 13.192 0.544002 13.344 0.672002C13.496 0.792002 13.612 0.944002 13.692 1.128L17.388 12.204C17.468 12.436 17.54 12.688 17.604 12.96C17.676 13.224 17.74 13.504 17.796 13.8C17.852 13.504 17.904 13.224 17.952 12.96C18.008 12.688 18.068 12.436 18.132 12.204L21.36 1.128C21.408 0.952001 21.516 0.800001 21.684 0.672002C21.86 0.544002 22.064 0.480001 22.296 0.480001H24.492ZM32.9724 10.26C32.9724 9.828 32.9084 9.428 32.7804 9.06C32.6604 8.684 32.4804 8.36 32.2404 8.088C32.0004 7.808 31.7004 7.592 31.3404 7.44C30.9884 7.28 30.5804 7.2 30.1164 7.2C29.1804 7.2 28.4444 7.468 27.9084 8.004C27.3724 8.54 27.0324 9.292 26.8884 10.26H32.9724ZM26.8164 11.844C26.8484 12.54 26.9564 13.144 27.1404 13.656C27.3244 14.16 27.5684 14.58 27.8724 14.916C28.1844 15.252 28.5524 15.504 28.9764 15.672C29.4084 15.832 29.8884 15.912 30.4164 15.912C30.9204 15.912 31.3564 15.856 31.7244 15.744C32.0924 15.624 32.4124 15.496 32.6844 15.36C32.9564 15.216 33.1884 15.088 33.3804 14.976C33.5724 14.856 33.7484 14.796 33.9084 14.796C34.1164 14.796 34.2764 14.876 34.3884 15.036L35.1204 15.984C34.8164 16.344 34.4724 16.648 34.0884 16.896C33.7044 17.144 33.2964 17.348 32.8644 17.508C32.4324 17.66 31.9884 17.768 31.5324 17.832C31.0764 17.904 30.6324 17.94 30.2004 17.94C29.3524 17.94 28.5644 17.8 27.8364 17.52C27.1164 17.232 26.4884 16.812 25.9524 16.26C25.4244 15.708 25.0084 15.024 24.7044 14.208C24.4084 13.392 24.2604 12.452 24.2604 11.388C24.2604 10.54 24.3924 9.748 24.6564 9.012C24.9284 8.276 25.3124 7.636 25.8084 7.092C26.3124 6.548 26.9204 6.12 27.6324 5.808C28.3524 5.488 29.1644 5.328 30.0684 5.328C30.8204 5.328 31.5164 5.452 32.1564 5.7C32.7964 5.94 33.3484 6.296 33.8124 6.768C34.2764 7.24 34.6364 7.82 34.8924 8.508C35.1564 9.188 35.2884 9.964 35.2884 10.836C35.2884 11.236 35.2444 11.504 35.1564 11.64C35.0684 11.776 34.9084 11.844 34.6764 11.844H26.8164ZM40.3224 1.90735e-06V17.76H37.7424V1.90735e-06H40.3224ZM52.1589 7.92C52.0789 8.024 52.0029 8.104 51.9309 8.16C51.8589 8.216 51.7549 8.244 51.6189 8.244C51.4829 8.244 51.3389 8.196 51.1869 8.1C51.0429 8.004 50.8669 7.9 50.6589 7.788C50.4589 7.668 50.2149 7.56 49.9269 7.464C49.6389 7.368 49.2789 7.32 48.8469 7.32C48.2869 7.32 47.7949 7.42 47.3709 7.62C46.9549 7.82 46.6029 8.108 46.3149 8.484C46.0349 8.852 45.8229 9.304 45.6789 9.84C45.5429 10.368 45.4749 10.964 45.4749 11.628C45.4749 12.316 45.5509 12.928 45.7029 13.464C45.8549 14 46.0709 14.452 46.3509 14.82C46.6389 15.188 46.9829 15.468 47.3829 15.66C47.7909 15.852 48.2469 15.948 48.7509 15.948C49.2469 15.948 49.6509 15.888 49.9629 15.768C50.2749 15.648 50.5349 15.516 50.7429 15.372C50.9509 15.228 51.1269 15.096 51.2709 14.976C51.4229 14.856 51.5829 14.796 51.7509 14.796C51.9589 14.796 52.1189 14.876 52.2309 15.036L52.9629 15.984C52.6669 16.344 52.3389 16.648 51.9789 16.896C51.6189 17.144 51.2389 17.348 50.8389 17.508C50.4389 17.66 50.0229 17.768 49.5909 17.832C49.1589 17.904 48.7229 17.94 48.2829 17.94C47.5229 17.94 46.8109 17.8 46.1469 17.52C45.4909 17.232 44.9149 16.82 44.4189 16.284C43.9309 15.74 43.5429 15.08 43.2549 14.304C42.9749 13.52 42.8349 12.628 42.8349 11.628C42.8349 10.724 42.9629 9.888 43.2189 9.12C43.4749 8.344 43.8469 7.676 44.3349 7.116C44.8309 6.556 45.4429 6.12 46.1709 5.808C46.8989 5.488 47.7389 5.328 48.6909 5.328C49.5789 5.328 50.3589 5.472 51.0309 5.76C51.7109 6.048 52.3149 6.456 52.8429 6.984L52.1589 7.92ZM60.1192 5.328C61.0232 5.328 61.8392 5.476 62.5672 5.772C63.3032 6.068 63.9272 6.488 64.4392 7.032C64.9592 7.576 65.3592 8.236 65.6392 9.012C65.9192 9.788 66.0592 10.66 66.0592 11.628C66.0592 12.596 65.9192 13.468 65.6392 14.244C65.3592 15.02 64.9592 15.684 64.4392 16.236C63.9272 16.78 63.3032 17.2 62.5672 17.496C61.8392 17.792 61.0232 17.94 60.1192 17.94C59.2072 17.94 58.3832 17.792 57.6472 17.496C56.9192 17.2 56.2952 16.78 55.7752 16.236C55.2552 15.684 54.8552 15.02 54.5752 14.244C54.2952 13.468 54.1552 12.596 54.1552 11.628C54.1552 10.66 54.2952 9.788 54.5752 9.012C54.8552 8.236 55.2552 7.576 55.7752 7.032C56.2952 6.488 56.9192 6.068 57.6472 5.772C58.3832 5.476 59.2072 5.328 60.1192 5.328Z"
              fill="white"
            />
          </svg>

          <svg
            className="brand-tagline"
            width="210"
            height="13"
            viewBox="0 0 210 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M2.80001 3.22V10.836C2.80001 11.1207 2.76268 11.3843 2.68801 11.627C2.61334 11.8743 2.49434 12.089 2.33101 12.271C2.16768 12.453 1.95768 12.5953 1.70101 12.698C1.44901 12.8053 1.14568 12.859 0.791009 12.859C0.641676 12.859 0.504009 12.8473 0.378009 12.824C0.252009 12.8007 0.126009 12.7657 9.26107e-06 12.719L0.0490093 12.047C0.0583426 12.005 0.0746759 11.9723 0.0980093 11.949C0.116676 11.9303 0.144676 11.9187 0.182009 11.914C0.219343 11.9093 0.268343 11.907 0.329009 11.907C0.385009 11.9117 0.457343 11.914 0.546009 11.914C0.910009 11.914 1.16901 11.8277 1.32301 11.655C1.47701 11.487 1.55401 11.214 1.55401 10.836V3.22H2.80001ZM3.05901 0.993996C3.05901 1.11533 3.03334 1.22966 2.98201 1.337C2.93534 1.43966 2.87001 1.533 2.78601 1.617C2.70668 1.69633 2.61334 1.75933 2.50601 1.806C2.39868 1.85266 2.28434 1.876 2.16301 1.876C2.04168 1.876 1.92734 1.85266 1.82001 1.806C1.71734 1.75933 1.62634 1.69633 1.54701 1.617C1.46768 1.533 1.40468 1.43966 1.35801 1.337C1.31134 1.22966 1.28801 1.11533 1.28801 0.993996C1.28801 0.872663 1.31134 0.75833 1.35801 0.650996C1.40468 0.538997 1.46768 0.44333 1.54701 0.363996C1.62634 0.279997 1.71734 0.214663 1.82001 0.167996C1.92734 0.12133 2.04168 0.0979962 2.16301 0.0979962C2.28434 0.0979962 2.39868 0.12133 2.50601 0.167996C2.61334 0.214663 2.70668 0.279997 2.78601 0.363996C2.87001 0.44333 2.93534 0.538997 2.98201 0.650996C3.03334 0.75833 3.05901 0.872663 3.05901 0.993996ZM10.6783 3.22V10.311H9.93629C9.75896 10.311 9.64696 10.2247 9.60029 10.052L9.50229 9.289C9.19429 9.62966 8.84896 9.905 8.46629 10.115C8.08362 10.3203 7.64496 10.423 7.15029 10.423C6.76296 10.423 6.41996 10.36 6.12129 10.234C5.82729 10.1033 5.57996 9.92133 5.37929 9.688C5.17862 9.45466 5.02696 9.17233 4.92429 8.841C4.82629 8.50966 4.77729 8.14333 4.77729 7.742V3.22H6.02329V7.742C6.02329 8.27866 6.14462 8.694 6.38729 8.988C6.63462 9.282 7.01029 9.429 7.51429 9.429C7.88296 9.429 8.22596 9.34266 8.54329 9.17C8.86529 8.99266 9.16162 8.75 9.43229 8.442V3.22H10.6783ZM16.7839 4.389C16.7279 4.49166 16.6416 4.543 16.5249 4.543C16.4549 4.543 16.3756 4.51733 16.2869 4.466C16.1983 4.41466 16.0886 4.35866 15.9579 4.298C15.8319 4.23266 15.6803 4.17433 15.5029 4.123C15.3256 4.067 15.1156 4.039 14.8729 4.039C14.6629 4.039 14.4739 4.067 14.3059 4.123C14.1379 4.17433 13.9933 4.24666 13.8719 4.34C13.7553 4.43333 13.6643 4.543 13.5989 4.669C13.5383 4.79033 13.5079 4.92333 13.5079 5.068C13.5079 5.25 13.5593 5.40166 13.6619 5.523C13.7693 5.64433 13.9093 5.74933 14.0819 5.838C14.2546 5.92666 14.4506 6.006 14.6699 6.076C14.8893 6.14133 15.1133 6.21366 15.3419 6.293C15.5753 6.36766 15.8016 6.45166 16.0209 6.545C16.2403 6.63833 16.4363 6.755 16.6089 6.895C16.7816 7.035 16.9193 7.20766 17.0219 7.413C17.1293 7.61366 17.1829 7.85633 17.1829 8.141C17.1829 8.46766 17.1246 8.771 17.0079 9.051C16.8913 9.32633 16.7186 9.56666 16.4899 9.772C16.2613 9.97266 15.9813 10.1313 15.6499 10.248C15.3186 10.3647 14.9359 10.423 14.5019 10.423C14.0073 10.423 13.5593 10.3437 13.1579 10.185C12.7566 10.0217 12.4159 9.814 12.1359 9.562L12.4299 9.086C12.4673 9.02533 12.5116 8.97866 12.5629 8.946C12.6143 8.91333 12.6796 8.897 12.7589 8.897C12.8429 8.897 12.9316 8.92966 13.0249 8.995C13.1183 9.06033 13.2303 9.13266 13.3609 9.212C13.4963 9.29133 13.6596 9.36366 13.8509 9.429C14.0423 9.49433 14.2803 9.527 14.5649 9.527C14.8076 9.527 15.0199 9.49666 15.2019 9.436C15.3839 9.37066 15.5356 9.28433 15.6569 9.177C15.7783 9.06966 15.8669 8.946 15.9229 8.806C15.9836 8.666 16.0139 8.51666 16.0139 8.358C16.0139 8.162 15.9603 8.001 15.8529 7.875C15.7503 7.74433 15.6126 7.63466 15.4399 7.546C15.2673 7.45266 15.0689 7.37333 14.8449 7.308C14.6256 7.238 14.3993 7.16566 14.1659 7.091C13.9373 7.01633 13.7109 6.93233 13.4869 6.839C13.2676 6.741 13.0716 6.61966 12.8989 6.475C12.7263 6.33033 12.5863 6.153 12.4789 5.943C12.3763 5.72833 12.3249 5.46933 12.3249 5.166C12.3249 4.89533 12.3809 4.63633 12.4929 4.389C12.6049 4.137 12.7683 3.91766 12.9829 3.731C13.1976 3.53966 13.4613 3.388 13.7739 3.276C14.0866 3.164 14.4436 3.108 14.8449 3.108C15.3116 3.108 15.7293 3.18266 16.0979 3.332C16.4713 3.47666 16.7933 3.67733 17.0639 3.934L16.7839 4.389Z"
              fill="white"
            />
          </svg>

          <h1 className="hero-title">Welcome aboard my friend</h1>
          <p className="hero-subtitle">just a couple of clicks and we start</p>
        </div>

        <div className="auth-card__right">
          <form className="login-panel" onSubmit={handleSubmit}>
            <header className="login-panel__header">
              <h2 className="login-panel__title">{isRegisterMode ? 'Sign up' : 'Log in'}</h2>
            </header>

            <div className="login-panel__inputs">
              {isRegisterMode ? (
                <>
                  <TextField
                    ariaLabel="Full name"
                    icon={<PersonIcon />}
                    type="text"
                    name="fullName"
                    placeholder="Full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />

                  <TextField
                    ariaLabel="Phone number"
                    icon={<PhoneIcon />}
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </>
              ) : null}

              <TextField
                ariaLabel="Email"
                icon={<EmailIcon />}
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />

              <PasswordField
                ariaLabel="Password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                isVisible={showPassword}
                onToggleVisibility={() => setShowPassword((current) => !current)}
              />

              {isRegisterMode ? (
                <PasswordField
                  ariaLabel="Repeat password"
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  isVisible={showConfirmPassword}
                  onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                />
              ) : null}

              {isRegisterMode ? null : (
                <button className="login-panel__forgot" type="button" disabled={!hasEmailValue || isSubmitting}>
                  Forgot password?
                </button>
              )}
            </div>

            <div className="login-panel__actions">
              <button className="button button--primary" type="submit" disabled={isSubmitDisabled}>
                {isRegisterMode ? 'Register' : 'Login'}
              </button>

              {submitState.status !== 'idle' ? (
                <p className={`login-panel__message login-panel__message--${submitState.status}`}>
                  {submitState.message}
                </p>
              ) : null}

              <div className="login-panel__divider" aria-hidden="true">
                <span className="login-panel__divider-line" />
                <span className="login-panel__divider-text">Or</span>
                <span className="login-panel__divider-line" />
              </div>

              <div className="login-panel__socials">
                <SocialAuthButton disabled={isSubmitting} label="Google">
                  <svg viewBox="0 0 18 18" fill="none">
                    <path d="M3.08 9.11L2.54 11.11L0.58 11.15C0.2 10.04 0 8.84 0 7.5C0 6.2 0.19 5.02 0.55 3.94L2.3 4.26L3.07 5.99C2.91 6.46 2.82 6.97 2.82 7.5C2.82 8.08 2.92 8.62 3.08 9.11Z" fill="#FBBB00" />
                    <path d="M17.3 6.11C17.42 6.58 17.49 7.08 17.49 7.5C17.49 8 17.44 8.49 17.33 8.97C16.95 10.66 15.98 12.13 14.61 13.18L12.38 13.07L12.06 11.08C12.97 10.55 13.68 9.76 14.03 8.97H9.23V6.11H14.1H17.3Z" fill="#518EF8" />
                    <path d="M14.61 13.18L14.61 13.18C13.38 14.17 11.84 14.76 10.14 14.76C7.36 14.76 4.95 13.21 3.73 11.15L6.65 8.99C7.24 10.58 8.75 11.72 10.53 11.72C11.3 11.72 12.03 11.52 12.63 11.08L14.61 13.18Z" fill="#28B446" />
                    <path d="M14.73 2.18L11.81 4.33C11.19 3.87 10.43 3.61 9.61 3.61C7.8 3.61 6.26 4.79 5.69 6.43L2.78 4.28H2.77C4 1.97 6.48 0.36 9.39 0.36C11.2 0.36 12.85 0.99 14.73 2.18Z" fill="#F14336" />
                  </svg>
                </SocialAuthButton>

                <SocialAuthButton disabled={isSubmitting} label="Facebook">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M24 12.06C24 5.4 18.63 0 12 0C5.37 0 0 5.4 0 12.06C0 18.08 4.39 23.08 10.13 24V15.56H7.08V12.06H10.13V9.39C10.13 6.37 11.92 4.69 14.66 4.69C15.97 4.69 17.34 4.93 17.34 4.93V7.9H15.83C14.34 7.9 13.88 8.83 13.88 9.78V12.06H17.2L16.67 15.56H13.88V24C19.61 23.08 24 18.08 24 12.06Z" fill="#1877F2" />
                    <path d="M16.67 15.56L17.2 12.06H13.88V9.78C13.88 8.83 14.34 7.9 15.83 7.9H17.34V4.93C17.34 4.93 15.97 4.69 14.66 4.69C11.92 4.69 10.13 6.37 10.13 9.39V12.06H7.08V15.56H10.13V24C11.37 24.2 12.63 24.2 13.88 24V15.56H16.67Z" fill="white" />
                  </svg>
                </SocialAuthButton>
              </div>

              <div className="login-panel__signup">
                {isRegisterMode ? (
                  <>
                    <p className="login-panel__signup-text">Already have an account?</p>
                    <button
                      className="button button--outline"
                      type="button"
                      onClick={() => switchMode('login')}
                      disabled={isSubmitting}
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    <p className="login-panel__signup-text">Have no account yet?</p>
                    <button
                      className="button button--outline"
                      type="button"
                      onClick={() => switchMode('register')}
                      disabled={isSubmitting}
                    >
                      Register
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

export default App
