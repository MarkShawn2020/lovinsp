/**
 * Design Tokens - Claude Design System Integration
 *
 * Based on Anthropic Claude design guide:
 * - Warm, professional, trustworthy aesthetic
 * - Soft backgrounds, serif headings, ample whitespace
 * - Maintains Code Inspector's functional requirements
 */

export const DesignTokens = {
  /**
   * Color System
   * Integrates Claude's soft palette while preserving mode distinction
   */
  colors: {
    // Primary brand colors from Claude design system
    primary: '#D97757',

    // Background colors
    background: {
      main: '#F9F9F7',        // Claude main background (warm ivory)
      ivory: '#F0EEE6',       // Claude ivory-medium
      dark: '#141413',        // Claude dark theme
      oat: '#F7F4EC',         // Claude oat
      overlay: 'rgba(249, 250, 251, 0.95)', // Elevated overlay with soft transparency
    },

    // Text colors
    text: {
      main: '#181818',        // Claude main text
      faded: '#87867F',       // Claude secondary/faded text
      white: '#FFFFFF',
    },

    // Mode colors - using Claude swatch colors for mode distinction
    // Maintains functional color-coding while adopting soft palette
    mode: {
      copy: {
        base: '#B49FD8',      // Claude fig (purple - warm, creative)
        light: 'rgba(180, 159, 216, 0.15)',
        accent: '#9B7EC9',
      },
      locate: {
        base: '#629A90',      // Claude cactus (green - stable, reliable)
        light: 'rgba(98, 154, 144, 0.15)',
        accent: '#4F8078',
      },
      target: {
        base: '#97B5D5',      // Claude sky (blue - open, clear)
        light: 'rgba(151, 181, 213, 0.15)',
        accent: '#7A9BC4',
      },
    },

    // Border colors
    border: {
      subtle: 'rgba(0, 0, 0, 0.05)',   // Very soft border
      default: '#E8E6DC',              // Claude cloud-light
      medium: 'rgba(0, 0, 0, 0.08)',   // Medium emphasis
    },

    // Accent colors
    accent: {
      hotkey: '#00B42A',      // Keep current green for high recognition
      success: '#629A90',     // Claude cactus
      info: '#97B5D5',        // Claude sky
    },

    // Swatch colors (for future use)
    swatch: {
      slate: {
        light: '#87867F',
      },
      cloud: {
        light: '#E8E6DC',
      },
      fig: '#B49FD8',
      olive: '#C2C07D',
      cactus: '#629A90',
      sky: '#97B5D5',
      heather: '#D2BEDF',
    },
  },

  /**
   * Border Radius
   * Claude design system standard values
   */
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.75rem',    // 12px - Claude standard
    lg: '1.5rem',     // 24px - Claude standard
    full: '9999px',
  },

  /**
   * Shadows
   * Softer shadows aligned with Claude's gentle aesthetic
   */
  shadows: {
    // Soft elevation for popper/overlay
    popper: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',

    // Medium elevation for cards
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

    // Keep original for backward compatibility
    original: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
  },

  /**
   * Spacing
   * Balanced spacing system (slightly more compact than Claude for dev tool density)
   */
  spacing: {
    xs: '0.25rem',    // 4px
    s: '0.5rem',      // 8px
    m: '1rem',        // 16px
    l: '1.5rem',      // 24px
    xl: '2rem',       // 32px
    xxl: '3rem',      // 48px
  },

  /**
   * Typography
   * Font weights aligned with Claude's system
   */
  fontWeight: {
    regular: 400,
    medium: 500,      // Claude standard medium weight
    semibold: 600,
    bold: 700,
  },

  /**
   * Transitions
   * Smooth transitions for interactions
   */
  transitions: {
    fast: '0.15s ease-in-out',
    normal: '0.2s ease-in-out',
    slow: '0.3s ease-in-out',
  },
} as const;

/**
 * Helper type for mode colors
 */
export type ModeColorSet = {
  badge: string;
  badgeText: string;
  accent: string;
  overlay: string;
};

/**
 * Get mode-specific color set
 */
export function getModeColors(mode: 'copy' | 'locate' | 'target'): ModeColorSet {
  const modeColor = DesignTokens.colors.mode[mode];

  return {
    badge: modeColor.base,
    badgeText: DesignTokens.colors.text.white,
    accent: modeColor.accent,
    overlay: modeColor.light,
  };
}
