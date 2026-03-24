jest.mock('../constants/auth', () => ({
  AUTH_MODE_CONFIG: {
    login: {
      emptyFieldsMessage: 'Please enter your email and password.',
    },
    register: {
      emptyFieldsMessage: 'Please fill out every field before continuing.',
    },
  },
}))

import { buildSubmitState, getAuthFormMeta, validateAuthForm } from './authForm'


describe('authForm', () => {
  it('buildSubmitState returns a normalized status object', () => {
    expect(buildSubmitState('error', 'Something went wrong.')).toEqual({
      status: 'error',
      message: 'Something went wrong.',
    })
  })

  it('getAuthFormMeta disables register submit when passwords do not match', () => {
    const meta = getAuthFormMeta(
      'register',
      {
        fullName: 'Gal Halifa',
        phone: '0501234567',
        email: 'gal@example.com',
        password: 'secure123',
        confirmPassword: 'different123',
      },
      false,
    )

    expect(meta.isRegisterMode).toBe(true)
    expect(meta.hasEmailValue).toBe(true)
    expect(meta.isSubmitDisabled).toBe(true)
  })

  it('getAuthFormMeta enables login submit when email and password exist', () => {
    const meta = getAuthFormMeta(
      'login',
      {
        email: 'gal@example.com',
        password: 'secure123',
      },
      false,
    )

    expect(meta.isRegisterMode).toBe(false)
    expect(meta.isSubmitDisabled).toBe(false)
  })

  it('validateAuthForm rejects missing register fields', () => {
    expect(
      validateAuthForm('register', {
        fullName: 'Gal',
        phone: '',
        email: 'gal@example.com',
        password: 'secure123',
        confirmPassword: 'secure123',
      }),
    ).toEqual({
      status: 'error',
      message: 'Please fill out every field before continuing.',
    })
  })

  it('validateAuthForm rejects mismatched passwords', () => {
    expect(
      validateAuthForm('register', {
        fullName: 'Gal',
        phone: '0501234567',
        email: 'gal@example.com',
        password: 'secure123',
        confirmPassword: 'mismatch123',
      }),
    ).toEqual({
      status: 'error',
      message: 'Passwords do not match.',
    })
  })

  it('validateAuthForm accepts a valid login payload', () => {
    expect(
      validateAuthForm('login', {
        email: 'gal@example.com',
        password: 'secure123',
      }),
    ).toBeNull()
  })
})
