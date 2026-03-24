import React from 'react'

export function PersonIcon() {
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

export function PhoneIcon() {
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

export function EmailIcon() {
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

export function LockIcon() {
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

export function EyeIcon() {
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

export function TextField({ ariaLabel, icon, ...inputProps }) {
  return (
    <label className="field" aria-label={ariaLabel}>
      <span className="field__icon" aria-hidden="true">
        {icon}
      </span>
      <input className="field__input" {...inputProps} />
    </label>
  )
}

export function PasswordField({
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

export function SocialAuthButton({ label, disabled, children }) {
  return (
    <button className="button button--outline button--half" type="button" disabled={disabled}>
      <span className="button__icon" aria-hidden="true">
        {children}
      </span>
      <span>{label}</span>
    </button>
  )
}

export function GoogleIdentityButton({ buttonRef, isLoading, isDisabled, isAvailable, message }) {
  return (
    <div className="google-auth">
      <div className={`google-auth__shell${isDisabled ? ' google-auth__shell--disabled' : ''}`}>
        <div className="google-auth__visual button button--outline button--half" aria-hidden="true">
          <span className="button__icon">
            <svg viewBox="0 0 18 18" fill="none">
              <path d="M3.08 9.11L2.54 11.11L0.58 11.15C0.2 10.04 0 8.84 0 7.5C0 6.2 0.19 5.02 0.55 3.94L2.3 4.26L3.07 5.99C2.91 6.46 2.82 6.97 2.82 7.5C2.82 8.08 2.92 8.62 3.08 9.11Z" fill="#FBBB00" />
              <path d="M17.3 6.11C17.42 6.58 17.49 7.08 17.49 7.5C17.49 8 17.44 8.49 17.33 8.97C16.95 10.66 15.98 12.13 14.61 13.18L12.38 13.07L12.06 11.08C12.97 10.55 13.68 9.76 14.03 8.97H9.23V6.11H14.1H17.3Z" fill="#518EF8" />
              <path d="M14.61 13.18L14.61 13.18C13.38 14.17 11.84 14.76 10.14 14.76C7.36 14.76 4.95 13.21 3.73 11.15L6.65 8.99C7.24 10.58 8.75 11.72 10.53 11.72C11.3 11.72 12.03 11.52 12.63 11.08L14.61 13.18Z" fill="#28B446" />
              <path d="M14.73 2.18L11.81 4.33C11.19 3.87 10.43 3.61 9.61 3.61C7.8 3.61 6.26 4.79 5.69 6.43L2.78 4.28H2.77C4 1.97 6.48 0.36 9.39 0.36C11.2 0.36 12.85 0.99 14.73 2.18Z" fill="#F14336" />
            </svg>
          </span>
          <span>Google</span>
        </div>
        <div
          ref={buttonRef}
          className="google-auth__button-shell"
          aria-hidden={!isAvailable}
        />
      </div>
      {!isAvailable ? (
        <p className="google-auth__message google-auth__message--muted">
          {message || 'Google sign-in is not configured yet.'}
        </p>
      ) : null}
      {isLoading ? (
        <p className="google-auth__message google-auth__message--loading">Preparing Google sign-in...</p>
      ) : null}
    </div>
  )
}
