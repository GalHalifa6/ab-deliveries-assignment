import { AUTH_MODE_CONFIG } from '../constants/auth'

export function buildSubmitState(status, message) {
  return { status, message }
}

export function getAuthFormMeta(mode, formData, isSubmitting) {
  const isRegisterMode = mode === 'register'
  const currentModeConfig = AUTH_MODE_CONFIG[mode]
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

  return {
    isRegisterMode,
    currentModeConfig,
    hasEmailValue,
    isSubmitDisabled: isSubmitting || (isRegisterMode ? !isRegisterFormValid : !isLoginFormValid),
  }
}

export function validateAuthForm(mode, formData) {
  const currentModeConfig = AUTH_MODE_CONFIG[mode]
  const isRegisterMode = mode === 'register'

  if (!formData.email || !formData.password) {
    return buildSubmitState('error', currentModeConfig.emptyFieldsMessage)
  }

  if (isRegisterMode && (!formData.fullName || !formData.phone || !formData.confirmPassword)) {
    return buildSubmitState('error', AUTH_MODE_CONFIG.register.emptyFieldsMessage)
  }

  if (isRegisterMode && formData.password !== formData.confirmPassword) {
    return buildSubmitState('error', 'Passwords do not match.')
  }

  return null
}
