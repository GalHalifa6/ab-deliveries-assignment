import { Feather } from '@expo/vector-icons'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { colors } from '../constants/theme'

export function AuthField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  disabled = false,
  onToggleVisibility,
  isPasswordField = false,
  isPasswordVisible = false,
}) {
  return (
    <View style={[styles.wrapper, disabled && styles.wrapperDisabled]}>
      <Feather name={icon} size={20} color={colors.inputPlaceholder} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        secureTextEntry={secureTextEntry}
      />
      {isPasswordField ? (
        <Pressable
          onPress={onToggleVisibility}
          disabled={disabled}
          hitSlop={8}
          style={({ pressed }) => [styles.eyeButton, pressed && !disabled && styles.eyeButtonPressed]}
        >
          <Feather
            name={isPasswordVisible ? 'eye-off' : 'eye'}
            size={20}
            color={colors.inputPlaceholder}
          />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
    backgroundColor: colors.white,
  },
  wrapperDisabled: {
    backgroundColor: colors.disabledFill,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    lineHeight: 17,
    color: colors.bodyText,
    paddingVertical: 0,
  },
  eyeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  eyeButtonPressed: {
    backgroundColor: '#EEF1FF',
  },
})
