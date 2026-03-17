import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

export function BrandLogo() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.square}>
        <View style={[styles.cornerPiece, styles.topRight]} />
        <View style={[styles.cornerPiece, styles.bottomRight]} />
        <View style={[styles.cornerPiece, styles.bottomLeft]} />
        <View style={[styles.cornerPiece, styles.topLeft]} />
        <View style={styles.sShape}>
          <View style={[styles.sPiece, styles.sTop]} />
          <View style={[styles.sPiece, styles.sUpperLeft]} />
          <View style={[styles.sPiece, styles.sMiddle]} />
          <View style={[styles.sPiece, styles.sLowerRight]} />
          <View style={[styles.sPiece, styles.sBottom]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: 50,
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: 49.23,
    height: 49,
    position: 'relative',
  },
  cornerPiece: {
    position: 'absolute',
    borderColor: colors.primary,
    borderWidth: 4,
  },
  topRight: {
    left: '33.9%',
    right: 0.2,
    top: 0,
    bottom: '66.1%',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 8,
  },
  bottomRight: {
    left: '66.4%',
    right: 0.2,
    top: '33.9%',
    bottom: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    left: 0,
    right: '33.9%',
    top: '66.2%',
    bottom: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 6,
  },
  topLeft: {
    left: 0,
    right: '66.1%',
    top: 0.2,
    bottom: '33.8%',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 6,
  },
  sShape: {
    position: 'absolute',
    left: '33.95%',
    right: '31.04%',
    top: '28.11%',
    bottom: '28.12%',
  },
  sPiece: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  sTop: {
    top: 0,
    left: 0,
    right: 0,
    height: '18%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 1.5,
  },
  sUpperLeft: {
    top: '18%',
    left: 0,
    width: '23%',
    height: '24%',
    borderBottomLeftRadius: 1.5,
  },
  sMiddle: {
    top: '41%',
    left: 0,
    right: 0,
    height: '18%',
    borderRadius: 2.5,
  },
  sLowerRight: {
    top: '59%',
    right: 0,
    width: '23%',
    height: '24%',
    borderTopRightRadius: 1.5,
  },
  sBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: '18%',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 1.5,
  },
})
