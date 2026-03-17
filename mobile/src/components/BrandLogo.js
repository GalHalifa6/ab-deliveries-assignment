import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

export function BrandLogo() {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.framePiece, styles.top]} />
      <View style={[styles.framePiece, styles.right]} />
      <View style={[styles.framePiece, styles.bottom]} />
      <View style={[styles.framePiece, styles.left]} />
      <View style={styles.centerMark} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: 49,
    height: 49,
    position: 'relative',
  },
  framePiece: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  top: {
    top: 0,
    left: 17,
    width: 32,
    height: 13,
  },
  right: {
    top: 17,
    right: 0,
    width: 13,
    height: 32,
  },
  bottom: {
    bottom: 0,
    left: 0,
    width: 32,
    height: 13,
  },
  left: {
    top: 0,
    left: 0,
    width: 13,
    height: 32,
  },
  centerMark: {
    position: 'absolute',
    top: 14,
    left: 17,
    width: 17,
    height: 21,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
})
