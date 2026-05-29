import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function HeaderBarComponent({ title, onBack, onHome, onHelp, isRTL = false, backLabel = 'Back', homeLabel = 'Home', helpLabel = 'Help' }) {
  return (
    <View style={[styles.headerBar, isRTL && styles.headerBarRtl]}>
      <View style={[styles.leftActions, isRTL && styles.leftActionsRtl]}>
        {onHelp ? (
          <Pressable accessibilityRole="button" accessibilityLabel={helpLabel} style={styles.navButton} onPress={onHelp}>
            <MaterialCommunityIcons color="#22f3ff" name="help-circle-outline" size={18} />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} style={styles.navButton} onPress={onBack}>
          <MaterialCommunityIcons color="#22f3ff" name={isRTL ? 'arrow-right' : 'arrow-left'} size={18} />
        </Pressable>
      </View>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.rightActions, isRTL && styles.rightActionsRtl]}>
        <Pressable accessibilityRole="button" accessibilityLabel={homeLabel} style={styles.navButton} onPress={onHome}>
          <MaterialCommunityIcons color="#22f3ff" name="home-outline" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

export const HeaderBar = memo(HeaderBarComponent);

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBarRtl: {
    flexDirection: 'row-reverse',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  leftActionsRtl: {
    flexDirection: 'row-reverse',
  },
  rightActionsRtl: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    color: '#fff5ff',
    fontSize: 20,
    fontFamily: 'Sora_800ExtraBold',
    flex: 1,
    textAlign: 'center',
  },
  navButton: {
    width: 42,
    height: 42,
    backgroundColor: '#030305',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#22f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22f3ff',
    shadowOpacity: 0.54,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
