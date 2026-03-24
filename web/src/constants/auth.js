export const INITIAL_FORM_DATA = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export const INITIAL_SUBMIT_STATE = {
  status: 'idle',
  message: '',
}

export const INITIAL_CHAT_MESSAGES = [
  {
    id: 'assistant-intro',
    role: 'assistant',
    content: 'Hi, I can help you track shipments and answer delivery questions right here on the website.',
  },
]

export const WEB_CLIENT_TYPE = 'web'

export const AUTH_MODE_CONFIG = {
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
