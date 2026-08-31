import React from 'react';
import { Text, View, ViewStyle, TextStyle } from 'react-native';
import { ThreatLevel, getThreatTheme } from '../constants/theme';

export interface ThreatBadgeProps {
  level: ThreatLevel | string;
  size?: 'small' | 'medium' | 'large';
  showDemoPrefix?: boolean;
  style?: ViewStyle;
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({
  level,
  size = 'medium',
  showDemoPrefix = false,
  style
}) => {
  const theme = getThreatTheme(level);

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const badgeStyle: ViewStyle = {
    backgroundColor: theme.badgeBg,
    borderColor: theme.badgeBorder,
    borderWidth: 1,
    borderRadius: isSmall ? 6 : isLarge ? 12 : 8,
    paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
    paddingVertical: isSmall ? 3 : isLarge ? 6 : 4,
    alignSelf: 'flex-start'
  };

  const textStyle: TextStyle = {
    color: theme.text,
    fontSize: isSmall ? 10 : isLarge ? 13 : 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  };

  const displayText = showDemoPrefix
    ? `[DEMO] ${theme.label}`
    : theme.label;

  return (
    <View style={[badgeStyle, style]} accessibilityRole="text" accessibilityLabel={`Threat Level: ${theme.label}`}>
      <Text style={textStyle}>{displayText}</Text>
    </View>
  );
};
