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
  const isGoogle = provider === 'Google'

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
        {isGoogle ? (
          <View style={styles.googleIcon}>
            <View style={[styles.googleBlock, styles.googleBlockRed]} />
            <View style={[styles.googleBlock, styles.googleBlockYellow]} />
            <View style={[styles.googleBlock, styles.googleBlockGreen]} />
            <View style={[styles.googleBlock, styles.googleBlockBlue]} />
            <View style={styles.googleCenterCutout} />
            <View style={styles.googleGapCutout} />
            <View style={styles.googleBar} />
          </View>
        ) : (
          <View style={styles.facebookBadge}>
            <FontAwesome name="facebook" size={16} color={colors.white} />
          </View>
        )}
        <Text style={isGoogle ? styles.googleLabel : styles.outlineLabel}>{provider}</Text>
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
    width: 146,
    flexShrink: 0,
  },
  socialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 76,
    justifyContent: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  googleBlock: {
    position: 'absolute',
    borderRadius: 4,
  },
  googleBlockRed: {
    left: 5,
    top: 2,
    width: 13,
    height: 6,
    backgroundColor: '#F14336',
  },
  googleBlockYellow: {
    left: 2,
    top: 7,
    width: 5,
    height: 9,
    backgroundColor: '#FBBB00',
  },
  googleBlockGreen: {
    left: 5,
    top: 16,
    width: 13,
    height: 6,
    backgroundColor: '#28B446',
  },
  googleBlockBlue: {
    right: 2,
    top: 9,
    width: 9,
    height: 9,
    backgroundColor: '#518EF8',
  },
  googleCenterCutout: {
    position: 'absolute',
    left: 7,
    top: 6,
    width: 8,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  googleGapCutout: {
    position: 'absolute',
    left: 7,
    top: 8,
    width: 7,
    height: 8,
    backgroundColor: colors.white,
  },
  googleBar: {
    position: 'absolute',
    right: 2,
    top: 10,
    width: 9,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#518EF8',
  },
  facebookBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
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
  googleLabel: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '400',
  },
})
