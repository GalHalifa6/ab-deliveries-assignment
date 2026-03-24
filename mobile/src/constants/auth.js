export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://ab-python-server.salmonmoss-0b293592.northeurope.azurecontainerapps.io'

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

export const AUTH_MODE_CONFIG = {
  login: {
    title: 'Log in',
    endpoint: 'login',
    submitLabel: 'Login',
    switchPrompt: 'Have no account yet?',
    switchActionLabel: 'Register',
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
    title: 'Register',
    endpoint: 'register',
    submitLabel: 'Register',
    switchPrompt: 'Already have an account?',
    switchActionLabel: 'Log in',
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
