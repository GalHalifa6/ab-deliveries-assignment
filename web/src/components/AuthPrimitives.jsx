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
