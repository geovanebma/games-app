import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function GameCardComponent({ game, onPress, isRTL = false, variant = 'list' }) {
  const isGrid = variant === 'grid';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={game.title}
      onPress={onPress}
      style={[
        styles.card,
        isGrid ? styles.gridCard : styles.listCard,
        isRTL && styles.cardRtl,
        {
          borderColor: `${game.themeColor}99`,
          backgroundColor: game.accentColor,
          shadowColor: game.themeColor,
        },
      ]}
    >
      <View style={[styles.glowOrb, { backgroundColor: `${game.themeColor}22` }]} />
      <View style={[styles.iconWrap, isGrid && styles.iconWrapGrid, { backgroundColor: `${game.themeColor}22`, borderColor: `${game.themeColor}77` }]}>
        <MaterialCommunityIcons color="#fff7ed" name={game.icon} size={isGrid ? 30 : 24} />
      </View>
      <View style={[styles.textWrap, isRTL && styles.textWrapRtl, isGrid && styles.textWrapGrid]}>
        <Text numberOfLines={2} style={[styles.title, isGrid && styles.titleGrid, isRTL && styles.textRtl]}>
          {game.title}
        </Text>
        <Text numberOfLines={2} style={[styles.tag, isGrid && styles.tagGrid, isRTL && styles.textRtl]}>
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
    borderWidth: 1,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
  textRtl: {
    textAlign: 'right',
  },
});
