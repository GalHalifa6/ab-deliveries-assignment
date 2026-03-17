import { FontAwesome } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/theme'

export function PrimaryButton({ label, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        styles.primaryButton,
        pressed && !disabled && styles.primaryButtonPressed,
        disabled && styles.primaryButtonDisabled,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  )
}

export function OutlineButton({ label, disabled, onPress, isCompact = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        styles.outlineButton,
        isCompact && styles.compactButton,
        pressed && !disabled && styles.outlineButtonPressed,
        disabled && styles.outlineButtonDisabled,
      ]}
    >
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  )
}

export function SocialButton({ provider, disabled, onPress }) {
  const iconName = provider === 'Google' ? 'google' : 'facebook'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        styles.outlineButton,
        styles.socialButton,
        pressed && !disabled && styles.outlineButtonPressed,
        disabled && styles.outlineButtonDisabled,
      ]}
    >
      <View style={styles.socialContent}>
        <FontAwesome
          name={iconName}
          size={18}
          color={provider === 'Google' ? colors.primary : '#1877F2'}
        />
        <Text style={styles.outlineLabel}>{provider}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  buttonBase: {
    height: 40,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  primaryButtonDisabled: {
    backgroundColor: '#B8BFDC',
  },
  outlineButton: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButtonPressed: {
    backgroundColor: '#F0F0F0',
  },
  outlineButtonDisabled: {
    opacity: 0.4,
  },
  compactButton: {
    width: '100%',
  },
  socialButton: {
    flex: 1,
  },
  socialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  },
  outlineLabel: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '400',
  },
})
