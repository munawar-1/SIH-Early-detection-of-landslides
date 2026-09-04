import React from 'react';
import { Text, View, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { ThreatLevel, getThreatTheme, RADIUS, SPACING } from '../constants/theme';

export interface ThreatBadgeProps {
  level: ThreatLevel | string;
  size?: 'small' | 'medium' | 'large';
  showDemoPrefix?: boolean;
  showDot?: boolean;
  style?: ViewStyle;
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({
  level,
  size = 'medium',
  showDemoPrefix = false,
  showDot = true,
  style
}) => {
  const theme = getThreatTheme(level);

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const badgeStyle: ViewStyle = {
    backgroundColor: theme.badgeBg,
    borderColor: theme.badgeBorder,
    borderWidth: 1,
    borderRadius: isSmall ? RADIUS.sm : isLarge ? RADIUS.md : RADIUS.sm + 2,
    paddingHorizontal: isSmall ? 7 : isLarge ? 12 : 9,
    paddingVertical: isSmall ? 3 : isLarge ? 5 : 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start'
  };

  const dotStyle: ViewStyle = {
    width: isSmall ? 5 : isLarge ? 7 : 6,
    height: isSmall ? 5 : isLarge ? 7 : 6,
    borderRadius: RADIUS.pill,
    backgroundColor: theme.accent,
    marginRight: isSmall ? 4 : 6
  };

  const textStyle: TextStyle = {
    color: theme.text,
    fontSize: isSmall ? 10 : isLarge ? 12 : 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  };

  const displayText = showDemoPrefix
    ? `[DEMO] ${theme.label}`
    : theme.label;

  return (
    <View
      style={[badgeStyle, style]}
      accessibilityRole="text"
      accessibilityLabel={`Threat Level: ${theme.label}`}
    >
      {showDot && <View style={dotStyle} />}
      <Text style={textStyle}>{displayText}</Text>
    </View>
  );
};
