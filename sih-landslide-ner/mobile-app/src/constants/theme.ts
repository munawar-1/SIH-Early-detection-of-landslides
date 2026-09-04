export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'SAFE';

export interface ThreatTheme {
  level: ThreatLevel;
  label: string;
  demoTag: string;
  badgeBg: string;
  badgeBorder: string;
  text: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  iconText: string;
  iconSymbol: string;
}

export const THREAT_THEMES: Record<ThreatLevel, ThreatTheme> = {
  CRITICAL: {
    level: 'CRITICAL',
    label: 'CRITICAL HAZARD',
    demoTag: 'CRITICAL HAZARD',
    badgeBg: '#FEE2E2',
    badgeBorder: '#FCA5A5',
    text: '#991B1B',
    accent: '#DC2626',
    cardBg: '#FEF2F2',
    cardBorder: '#F87171',
    iconText: 'CRITICAL',
    iconSymbol: '🚨'
  },
  HIGH: {
    level: 'HIGH',
    label: 'HIGH WARNING',
    demoTag: 'HIGH HAZARD',
    badgeBg: '#FEF3C7',
    badgeBorder: '#FCD34D',
    text: '#92400E',
    accent: '#D97706',
    cardBg: '#FFFBEB',
    cardBorder: '#FBBF24',
    iconText: 'HIGH',
    iconSymbol: '⚠️'
  },
  MODERATE: {
    level: 'MODERATE',
    label: 'MODERATE ADVISORY',
    demoTag: 'MODERATE RISK',
    badgeBg: '#FEF9C3',
    badgeBorder: '#FDE047',
    text: '#854D0E',
    accent: '#CA8A04',
    cardBg: '#FEFCE8',
    cardBorder: '#FACC15',
    iconText: 'MODERATE',
    iconSymbol: '⚡'
  },
  SAFE: {
    level: 'SAFE',
    label: 'SAFE MONITORING',
    demoTag: 'NORMAL CONDITIONS',
    badgeBg: '#DCFCE7',
    badgeBorder: '#86EFAC',
    text: '#166534',
    accent: '#16A34A',
    cardBg: '#F0FDF4',
    cardBorder: '#4ADE80',
    iconText: 'SAFE',
    iconSymbol: '🛡️'
  }
};

export const getThreatTheme = (level?: string): ThreatTheme => {
  const normalized = (level || '').toUpperCase() as ThreatLevel;
  return THREAT_THEMES[normalized] || THREAT_THEMES.SAFE;
};

// Polished Emergency & Field Management Palette Tokens
export const APP_COLORS = {
  // Surfaces
  bgBase: '#B9F2D3',            // Soft Mint Surface
  bgBaseLight: '#D2F8DC',       // Light Mint Tint
  bgSurface: '#F8FAF8',         // Clean Off-White Background
  bgSurfaceElevated: '#FFFFFF', // Pure White Elevated Surface
  bgCard: '#FFFFFF',            // Crisp Clean Card Canvas
  bgCardSubtle: '#F1F5F2',      // Subtle Neutral Card Tint
  bgAccentMint: '#A0F1BD',      // Vibrant Mint
  bgAccentMintSoft: '#E6F8ED',  // Soft Mint Container Fill
  bgAccentPeach: '#FBE9E0',     // Soft Warm Peach / Salmon Tint
  bgAccentPeachBorder: '#E8A88A',

  // Text & Primary Accents (Deep Forest Slate, Near-Black)
  textPrimary: '#0F2417',        // Deep Forest Slate Headline & Primary Body
  textSecondary: '#3B5245',      // Muted Forest / Slate Hierarchy
  textMuted: '#6B8074',          // Soft Subdued Metadata
  textSubtle: '#8EA096',         // Ghost Labels & Inactive Tabs

  // Borders & Separation
  borderDefault: 'rgba(15, 36, 23, 0.08)',
  borderSubtle: 'rgba(15, 36, 23, 0.04)',
  borderStrong: 'rgba(15, 36, 23, 0.16)',
  borderFocus: '#0F2417',

  // Buttons & Primary CTAs
  buttonPrimaryBg: '#0F2417',
  buttonPrimaryText: '#FFFFFF',
  accentPrimary: '#0F2417',      // Forest Green
  accentMint: '#10B981',
  accentLight: '#059669',
  accentDark: '#064E3B',

  // Semantic Colors
  colorRed: '#DC2626',
  colorRedBg: '#FEE2E2',
  colorRedBorder: '#FCA5A5',

  colorAmber: '#D97706',
  colorAmberBg: '#FEF3C7',
  colorAmberBorder: '#FCD34D',

  colorGreen: '#16A34A',
  colorGreenBg: '#DCFCE7',
  colorGreenBorder: '#86EFAC',

  colorBlue: '#2563EB',
  colorBlueBg: '#DBEAFE',
  colorBlueBorder: '#BFDBFE',

  // Chrome & Navigation
  navBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(15, 36, 23, 0.08)',
  chipBg: '#F1F5F2',
  chipActiveBg: '#0F2417',
  chipActiveText: '#FFFFFF'
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  card: {
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  elevated: {
    shadowColor: '#0F2417',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4
  }
};

export const TYPOGRAPHY = {
  // Screen & Major Headings
  h1: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: APP_COLORS.textPrimary,
    letterSpacing: -0.3
  },
  h2: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: APP_COLORS.textPrimary,
    letterSpacing: -0.2
  },
  h3: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: APP_COLORS.textPrimary,
    letterSpacing: -0.1
  },
  // Subtitles & Secondary Headers
  subheading: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: APP_COLORS.textSecondary,
    lineHeight: 17
  },
  // Body Text
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: APP_COLORS.textPrimary,
    lineHeight: 19
  },
  bodyMedium: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: APP_COLORS.textPrimary,
    lineHeight: 19
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: APP_COLORS.textSecondary,
    lineHeight: 17
  },
  // Metadata, Labels & Badges
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: APP_COLORS.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: APP_COLORS.textMuted
  },
  // Button Typography
  button: {
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 0.2
  }
};

export const BUTTONS = {
  primaryHeight: 48,
  compactHeight: 36,
  minTouchTarget: 44
};


