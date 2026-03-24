const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services-script'
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export const GOOGLE_SCRIPT_UNAVAILABLE = 'Google sign-in is not configured for this environment.'

function getGoogleApi() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.google?.accounts?.id || null
}

export function loadGoogleIdentityScript() {
  if (getGoogleApi()) {
    return Promise.resolve()
  }

  if (typeof document === 'undefined') {
    return Promise.reject(new Error(GOOGLE_SCRIPT_UNAVAILABLE))
  }

  const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID)

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GOOGLE_IDENTITY_SCRIPT_ID
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google sign-in.'))
    document.head.appendChild(script)
  })
}

export async function renderGoogleButton(container, clientId, onCredentialResponse) {
  if (!clientId) {
    throw new Error(GOOGLE_SCRIPT_UNAVAILABLE)
  }

  await loadGoogleIdentityScript()

  const googleApi = getGoogleApi()

  if (!googleApi) {
    throw new Error('Google sign-in is unavailable right now.')
  }

  googleApi.initialize({
    client_id: clientId,
    callback: onCredentialResponse,
  })

  container.innerHTML = ''
  googleApi.renderButton(container, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    width: 232,
  })
}
