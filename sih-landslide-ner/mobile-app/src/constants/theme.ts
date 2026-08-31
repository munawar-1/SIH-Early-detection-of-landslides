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
}

export const THREAT_THEMES: Record<ThreatLevel, ThreatTheme> = {
  CRITICAL: {
    level: 'CRITICAL',
    label: 'CRITICAL RED ALERT',
    demoTag: 'CRITICAL HAZARD',
    badgeBg: '#FEE2E2',
    badgeBorder: '#FCA5A5',
    text: '#991B1B',
    accent: '#DC2626',
    cardBg: '#FEF2F2',
    cardBorder: '#EF4444',
    iconText: 'CRITICAL'
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
    cardBorder: '#F59E0B',
    iconText: 'HIGH'
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
    cardBorder: '#EAB308',
    iconText: 'MODERATE'
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
    cardBorder: '#22C55E',
    iconText: 'SAFE'
  }
};

export const getThreatTheme = (level?: string): ThreatTheme => {
  const normalized = (level || '').toUpperCase() as ThreatLevel;
  return THREAT_THEMES[normalized] || THREAT_THEMES.SAFE;
};

// Website Light Mint / Cream / Deep Forest Green Palette Tokens
export const APP_COLORS = {
  // Surfaces
  bgBase: '#B9F2D3',            // Soft Mint Surface
  bgBaseLight: '#D2F8DC',       // Light Mint Tint
  bgSurface: '#FAF9F4',         // Warm Off-White / Cream Main Background
  bgSurfaceElevated: '#FFFFFF', // Pure White Elevated Surface
  bgCard: '#FFFFFF',            // Crisp Clean Card Canvas
  bgCardSubtle: '#F4F3EB',      // Subtle Neutral Card Tint
  bgAccentMint: '#A0F1BD',      // Vibrant Mint
  bgAccentMintSoft: '#E6F8ED',  // Soft Mint Container Fill
  bgAccentPeach: '#FBE9E0',     // Soft Warm Peach / Salmon Tint
  bgAccentPeachBorder: '#E8A88A',

  // Text & Primary Accents (Deep Forest Green, Near-Black)
  textPrimary: '#1E2B18',        // Deep Forest Green Headline & Primary Body
  textSecondary: '#455A3F',      // Muted Forest / Sage Hierarchy
  textMuted: '#6E8268',          // Soft Subdued Metadata
  textSubtle: '#8FA48A',         // Ghost Labels & Inactive Tabs

  // Borders & Separation
  borderDefault: 'rgba(30, 43, 24, 0.10)',
  borderSubtle: 'rgba(30, 43, 24, 0.06)',
  borderStrong: 'rgba(30, 43, 24, 0.20)',
  borderFocus: '#1E2B18',

  // Buttons & Primary CTAs
  buttonPrimaryBg: '#1E2B18',
  buttonPrimaryText: '#FFFFFF',
  accentPrimary: '#1E2B18',      // Forest Green
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
  tabBarBorder: 'rgba(30, 43, 24, 0.08)',
  chipBg: '#F4F3EB',
  chipActiveBg: '#1E2B18',
  chipActiveText: '#FFFFFF'
};
