import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { AuthField } from '../components/AuthField'
import { BrandLogo } from '../components/BrandLogo'
import { OutlineButton, PrimaryButton, SocialButton } from '../components/AuthButton'
import {
  API_BASE_URL,
  INITIAL_FORM_DATA,
  INITIAL_SUBMIT_STATE,
} from '../constants/auth'
import { sendClientTelemetry } from '../services/clientTelemetry'
import { authenticatedFetch, persistAuthResponse } from '../services/authClient'
import { clearAuthTokens } from '../services/authStorage'
import { buildSubmitState, getAuthFormMeta, validateAuthForm } from '../services/authForm'
import { showMobileToast, tryFetchToastMessageWithFallback } from '../services/toastService'
import { colors, spacing, typography } from '../constants/theme'

export function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [submitState, setSubmitState] = useState(INITIAL_SUBMIT_STATE)

  const isSubmitting = submitState.status === 'loading'
  const { isRegisterMode, currentModeConfig, hasEmailValue, isSubmitDisabled } = getAuthFormMeta(
    mode,
    formData,
    isSubmitting
  )

  const statusStyle = useMemo(() => {
    if (submitState.status === 'success') {
      return styles.statusSuccess
    }
    if (submitState.status === 'error') {
      return styles.statusError
    }
    if (submitState.status === 'loading') {
      return styles.statusLoading
    }
    return null
  }, [submitState.status])

  const updateField = (name, value) => {
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

  const handleSubmit = async () => {
    const validationError = validateAuthForm(mode, formData)

    if (validationError) {
      setSubmitState(validationError)
      return
    }

    setSubmitState(buildSubmitState('loading', currentModeConfig.loadingMessage))
    sendClientTelemetry({
      event: 'auth_submit_started',
      mode,
      endpoint: `/${currentModeConfig.endpoint}`,
      email: formData.email,
      phone: isRegisterMode ? formData.phone : undefined,
    })

    try {
      const response = await fetch(`${API_BASE_URL}/${currentModeConfig.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'mobile',
        },
        body: JSON.stringify(currentModeConfig.buildPayload(formData)),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed.')
      }

      setSubmitState(buildSubmitState('success', data.message || currentModeConfig.successMessage))
      sendClientTelemetry({
        event: 'auth_submit_succeeded',
        mode,
        endpoint: `/${currentModeConfig.endpoint}`,
        email: formData.email,
        phone: isRegisterMode ? formData.phone : undefined,
        success: true,
      })

      if (data.auth?.accessToken && data.refreshToken) {
        await persistAuthResponse(data)
      } else if (mode === 'login') {
        await clearAuthTokens()
      }

      if (isRegisterMode) {
        if (data.toastMessage) {
          showMobileToast(data.toastMessage)
        } else if (data.toastPending) {
          void tryFetchToastMessageWithFallback()
        }
      }

      setFormData((current) => currentModeConfig.resetFormData(current))
    } catch (error) {
      if (error.message === 'Your session has expired. Please sign in again.') {
        await clearAuthTokens()
      }

      sendClientTelemetry({
        event: 'auth_submit_failed',
        mode,
        endpoint: `/${currentModeConfig.endpoint}`,
        email: formData.email,
        phone: isRegisterMode ? formData.phone : undefined,
        success: false,
        detail: error.message || 'Could not connect to the Python server.',
      })

      setSubmitState(buildSubmitState('error', error.message || 'Could not connect to the Python server.'))
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.screen}>
        <View style={styles.logoRow}>
          <BrandLogo />
        </View>

        <Text style={styles.title}>{currentModeConfig.title}</Text>

        <View style={styles.inputs}>
          {isRegisterMode ? (
            <>
              <AuthField
                icon="user"
                placeholder="Full name"
                value={formData.fullName}
                onChangeText={(value) => updateField('fullName', value)}
                disabled={isSubmitting}
              />
              <AuthField
                icon="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChangeText={(value) => updateField('phone', value)}
                keyboardType="phone-pad"
                disabled={isSubmitting}
              />
            </>
          ) : null}

          <AuthField
            icon="mail"
            placeholder="Email"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            keyboardType="email-address"
            disabled={isSubmitting}
          />

          <AuthField
            icon="lock"
            placeholder="Password"
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            secureTextEntry={!showPassword}
            disabled={isSubmitting}
            isPasswordField
            isPasswordVisible={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
          />

          {isRegisterMode ? (
            <AuthField
              icon="lock"
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              disabled={isSubmitting}
              isPasswordField
              isPasswordVisible={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
            />
          ) : (
            <Pressable
              disabled={!hasEmailValue || isSubmitting}
              style={({ pressed }) => [
                styles.forgotPassword,
                !hasEmailValue || isSubmitting ? styles.forgotPasswordDisabled : null,
                pressed && hasEmailValue && !isSubmitting ? styles.forgotPasswordPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.forgotPasswordText,
                  !hasEmailValue || isSubmitting
                    ? styles.forgotPasswordTextDisabled
                    : styles.forgotPasswordTextDefault,
                  hasEmailValue && !isSubmitting ? styles.forgotPasswordTextEnabled : null,
                ]}
              >
                Forgot password?
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={currentModeConfig.submitLabel}
            disabled={isSubmitDisabled}
            onPress={handleSubmit}
          />

          {submitState.status !== 'idle' ? (
            <Text style={[styles.statusMessage, statusStyle]}>{submitState.message}</Text>
          ) : null}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton provider="Google" disabled={isSubmitting} />
            <SocialButton provider="Facebook" disabled={isSubmitting} />
          </View>

          <View style={styles.switchSection}>
            <Text style={styles.switchPrompt}>{currentModeConfig.switchPrompt}</Text>
            <OutlineButton
              label={currentModeConfig.switchActionLabel}
              disabled={isSubmitting}
              onPress={() => switchMode(isRegisterMode ? 'login' : 'register')}
              isCompact
            />
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.screenTop,
    paddingBottom: 48,
    paddingHorizontal: 24,
    backgroundColor: colors.pageBackground,
  },
  logoRow: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.titleTop,
    color: colors.primary,
    textAlign: 'center',
    ...typography.title,
  },
  inputs: {
    width: spacing.panelWidth,
    marginTop: 56,
    gap: spacing.fieldGap,
    alignItems: 'flex-end',
  },
  forgotPassword: {
    minHeight: 17,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  forgotPasswordPressed: {
    opacity: 0.9,
  },
  forgotPasswordDisabled: {
    opacity: 1,
  },
  forgotPasswordText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'right',
  },
  forgotPasswordTextDefault: {
    color: colors.primarySoft,
  },
  forgotPasswordTextEnabled: {
    color: colors.primarySoft,
  },
  forgotPasswordTextDisabled: {
    color: colors.disabledText,
  },
  actions: {
    width: spacing.panelWidth,
    marginTop: 33,
    gap: 16,
    alignItems: 'center',
  },
  statusMessage: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  statusLoading: {
    backgroundColor: colors.infoBg,
    color: colors.primary,
  },
  statusSuccess: {
    backgroundColor: colors.successBg,
    color: colors.successText,
  },
  statusError: {
    backgroundColor: colors.errorBg,
    color: colors.errorText,
  },
  dividerRow: {
    width: 215,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    color: colors.inputPlaceholder,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '400',
  },
  socialRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchSection: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  switchPrompt: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  },
})
