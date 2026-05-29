import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function GameCardComponent({ game, onPress, isRTL = false, variant = 'list', width, compact = false }) {
  const isGrid = variant === 'grid';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={game.title}
      onPress={onPress}
      style={[
        styles.card,
        isGrid ? styles.gridCard : styles.listCard,
        isGrid && width ? { width } : null,
        isGrid && compact && styles.gridCardCompact,
        isRTL && styles.cardRtl,
        {
          borderColor: `${game.themeColor}99`,
          backgroundColor: game.accentColor,
          shadowColor: game.themeColor,
        },
      ]}
    >
      <View style={[styles.glowOrb, { backgroundColor: `${game.themeColor}22` }]} />
      <View style={[styles.iconWrap, isGrid && styles.iconWrapGrid, isGrid && compact && styles.iconWrapGridCompact, { backgroundColor: `${game.themeColor}22`, borderColor: `${game.themeColor}77` }]}>
        <MaterialCommunityIcons color="#fff7ed" name={game.icon} size={isGrid ? (compact ? 24 : 30) : 24} />
      </View>
      <View style={[styles.textWrap, isRTL && styles.textWrapRtl, isGrid && styles.textWrapGrid]}>
        <Text maxFontSizeMultiplier={1.08} numberOfLines={2} style={[styles.title, isGrid && styles.titleGrid, isGrid && compact && styles.titleGridCompact, isRTL && styles.textRtl]}>
          {game.title}
        </Text>
        <Text maxFontSizeMultiplier={1.08} numberOfLines={2} style={[styles.tag, isGrid && styles.tagGrid, isGrid && compact && styles.tagGridCompact, isRTL && styles.textRtl]}>
          {game.homeTag}
        </Text>
      </View>
      {!isGrid ? <MaterialCommunityIcons color="#f8fafc" name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} /> : null}
    </Pressable>
  );
}

export const GameCard = memo(GameCardComponent);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  listCard: {
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gridCard: {
    position: 'relative',
    width: '48%',
    minHeight: 204,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#0d0b17',
  },
  gridCardCompact: {
    minHeight: 178,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 22,
  },
  cardRtl: {
    flexDirection: 'row-reverse',
  },
  glowOrb: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    width: 110,
    height: 110,
    borderRadius: 999,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconWrapGrid: {
    width: 58,
    height: 58,
    borderRadius: 18,
  },
  iconWrapGridCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  textWrapGrid: {
    justifyContent: 'flex-end',
    gap: 8,
  },
  textWrapRtl: {
    alignItems: 'flex-end',
  },
  title: {
    color: '#f8fafc',
    fontSize: 21,
    fontFamily: 'Sora_800ExtraBold',
  },
  titleGrid: {
    fontSize: 20,
    lineHeight: 23,
    textTransform: 'uppercase',
  },
  titleGridCompact: {
    fontSize: 16,
    lineHeight: 19,
  },
  tag: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
  },
  tagGrid: {
    color: '#d9d2ef',
    fontSize: 12,
    lineHeight: 17,
  },
  tagGridCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  textRtl: {
    textAlign: 'right',
  },
});
