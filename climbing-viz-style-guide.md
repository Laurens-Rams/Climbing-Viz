# Climbing Viz Style Guide - React Native + Tailwind + Tamagui

## Overview
This style guide captures the complete design system from the Climbing Viz web app, adapted for React Native development using Tailwind CSS and Tamagui. The design features a dark, glassy, cyberpunk-inspired aesthetic with subtle animations and glassmorphism effects.

## Design Philosophy
- **Dark Theme**: Deep gradients with subtle noise textures
- **Glassmorphism**: Translucent panels with backdrop blur effects
- **Cyberpunk Aesthetic**: Teal/cyan accents with subtle glows
- **Subtle Animations**: Smooth transitions and micro-interactions
- **Modern Typography**: Space Grotesk and Noto Sans font families

## Color Palette

### Primary Colors
```typescript
const colors = {
  // Primary Teal/Cyan System
  teal: {
    light: '#1adeba',    // Primary accent color
    DEFAULT: '#0a9181',  // Primary brand color
    dark: '#16514d',     // Darker variant
  },
  
  // Accent Colors
  accent: {
    purple: '#751fec',
    yellow: '#ded91a', 
    pink: '#d818dc',
    orange: '#de501b',
  },
  
  // Background System
  background: {
    primary: '#16181c',    // Main background
    secondary: '#23272f',  // Secondary background
    tertiary: '#1a1e24',   // Tertiary background
  },
  
  // Glass Effects
  glass: {
    bg: 'rgba(20, 26, 31, 0.85)',
    border: 'rgba(26, 222, 186, 0.15)',
    borderHover: 'rgba(26, 222, 186, 0.4)',
    borderActive: 'rgba(26, 222, 186, 0.25)',
  },
  
  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b', 
  error: '#ef4444',
  info: '#3b82f6',
}
```

### Tailwind Config Extension
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'cyber-cyan': '#00ffcc',
        'cyber-blue': '#0066ff', 
        'cyber-purple': '#6600ff',
        'teal-light': '#1adeba',
        'teal': '#0a9181',
        'teal-dark': '#16514d',
        'bg-primary': '#16181c',
        'bg-secondary': '#23272f',
        'bg-tertiary': '#1a1e24',
      },
      fontFamily: {
        'sans': ['Space Grotesk', 'Noto Sans', 'system-ui'],
        'mono': ['Space Grotesk', 'monospace'],
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
    },
  },
}
```

## Typography

### Font Families
- **Primary**: Space Grotesk (modern, geometric)
- **Secondary**: Noto Sans (clean, readable)
- **Monospace**: Space Grotesk (consistent with primary)

### Text Styles
```typescript
const textStyles = {
  // Headers
  h1: 'text-3xl font-bold text-white font-sans',
  h2: 'text-2xl font-semibold text-white font-sans',
  h3: 'text-xl font-medium text-white font-sans',
  h4: 'text-lg font-medium text-white font-sans',
  
  // Body Text
  body: 'text-base text-white font-sans',
  bodySmall: 'text-sm text-white font-sans',
  caption: 'text-xs text-gray-400 font-sans',
  
  // Accent Text
  accent: 'text-teal-light font-medium',
  muted: 'text-gray-400',
  subtle: 'text-gray-500',
  
  // Special
  mono: 'font-mono text-sm text-teal-light',
}
```

## Spacing System

### Design Tokens
```typescript
const spacing = {
  xs: 4,    // 0.25rem
  sm: 12,   // 0.75rem  
  md: 16,   // 1rem
  lg: 24,   // 1.5rem
  xl: 32,   // 2rem
  '2xl': 48, // 3rem
  '3xl': 64, // 4rem
}

const borderRadius = {
  sm: 8,    // 0.5rem
  md: 12,   // 0.75rem
  lg: 16,   // 1rem
  xl: 20,   // 1.25rem
  '2xl': 24, // 1.5rem
}
```

## Component Styles

### Glass Panel (Base Component)
```typescript
// Tamagui Theme
const glassPanelTheme = {
  backgroundColor: 'rgba(20, 26, 31, 0.85)',
  borderColor: 'rgba(26, 222, 186, 0.15)',
  borderWidth: 1.5,
  borderRadius: '$2xl',
  padding: '$xl',
  // Note: backdrop-filter not available in RN, use alternative
}

// React Native Style
const glassPanelStyle = {
  backgroundColor: 'rgba(20, 26, 31, 0.85)',
  borderColor: 'rgba(26, 222, 186, 0.15)',
  borderWidth: 1.5,
  borderRadius: 24,
  padding: 32,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 32,
  elevation: 8, // Android shadow
}

// Tailwind Classes (with NativeWind)
const glassPanelClasses = 'bg-black/85 border border-teal-light/15 rounded-2xl p-8 shadow-xl'
```

### Button Variants

#### Primary Button
```typescript
const primaryButton = {
  // Tamagui
  backgroundColor: 'rgba(26, 222, 186, 0.2)',
  borderColor: 'rgba(26, 222, 186, 0.4)',
  borderWidth: 1,
  borderRadius: '$lg',
  paddingHorizontal: '$lg',
  paddingVertical: '$md',
  
  // Hover/Press states
  hoverStyle: {
    backgroundColor: 'rgba(26, 222, 186, 0.3)',
    transform: [{ translateY: -1 }],
  },
  
  pressStyle: {
    backgroundColor: 'rgba(26, 222, 186, 0.4)',
    transform: [{ scale: 0.98 }],
  }
}

// Tailwind Classes
const primaryButtonClasses = 'bg-teal-light/20 border border-teal-light/40 rounded-lg px-6 py-4 active:scale-98'
```

#### Secondary Button
```typescript
const secondaryButton = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderColor: 'rgba(255, 255, 255, 0.2)',
  borderWidth: 1,
  borderRadius: '$lg',
  paddingHorizontal: '$lg',
  paddingVertical: '$md',
}
```

#### Danger Button
```typescript
const dangerButton = {
  backgroundColor: 'rgba(239, 68, 68, 0.8)',
  borderColor: 'rgba(239, 68, 68, 0.6)',
  borderWidth: 1,
  borderRadius: '$lg',
  paddingHorizontal: '$lg',
  paddingVertical: '$md',
}
```

### Input Components

#### Glass Input
```typescript
const glassInput = {
  backgroundColor: 'rgba(20, 26, 31, 0.7)',
  borderColor: 'rgba(26, 222, 186, 0.2)',
  borderWidth: 1,
  borderRadius: '$md',
  paddingHorizontal: '$md',
  paddingVertical: '$sm',
  color: '#ffffff',
  fontSize: 16,
  
  focusStyle: {
    borderColor: 'rgba(26, 222, 186, 0.4)',
    shadowColor: 'rgba(26, 222, 186, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  }
}

// Placeholder styling
const placeholderStyle = {
  color: 'rgba(255, 255, 255, 0.5)',
}
```

#### Glass Select/Picker
```typescript
const glassSelect = {
  backgroundColor: 'rgba(20, 26, 31, 0.7)',
  borderColor: 'rgba(26, 222, 186, 0.2)',
  borderWidth: 1,
  borderRadius: '$md',
  paddingHorizontal: '$md',
  paddingVertical: '$sm',
}
```

### Slider Component (Custom)
```typescript
const elasticSlider = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  
  track: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    borderRadius: 3,
    position: 'relative',
  },
  
  range: {
    height: '100%',
    backgroundColor: '#22d3ee', // teal-light
    borderRadius: 3,
  },
  
  thumb: {
    width: 20,
    height: 20,
    backgroundColor: '#1adeba',
    borderRadius: 10,
    position: 'absolute',
    top: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  icon: {
    color: '#888888',
    fontSize: 18,
  }
}
```

### Card Components

#### Glass Card
```typescript
const glassCard = {
  backgroundColor: 'rgba(20, 26, 31, 0.8)',
  borderColor: 'rgba(26, 222, 186, 0.15)',
  borderWidth: 1,
  borderRadius: '$xl',
  padding: '$lg',
  marginVertical: '$sm',
  
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 16,
  elevation: 6,
}
```

#### Compact Card
```typescript
const compactCard = {
  ...glassCard,
  padding: '$md',
  borderRadius: '$lg',
}
```

### Toggle/Switch Components

#### Glass Toggle
```typescript
const glassToggle = {
  inactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  active: {
    backgroundColor: 'rgba(26, 222, 186, 0.2)',
    borderColor: 'rgba(26, 222, 186, 0.4)',
  },
  
  success: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  }
}
```

## Layout Patterns

### Control Panel Layout
```typescript
const controlPanelLayout = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 400,
    height: '100%',
    backgroundColor: 'rgba(20, 26, 31, 0.95)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(26, 222, 186, 0.2)',
    paddingTop: 60, // Account for status bar
    paddingHorizontal: 20,
  },
  
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1adeba',
    marginBottom: 12,
  }
}
```

### Grid Layouts
```typescript
const gridLayouts = {
  twoColumn: {
    flexDirection: 'row',
    gap: 16,
    children: {
      flex: 1,
    }
  },
  
  threeColumn: {
    flexDirection: 'row',
    gap: 12,
    children: {
      flex: 1,
    }
  },
  
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    children: {
      minWidth: 280,
      flex: 1,
    }
  }
}
```

## Animation Patterns

### Micro-interactions
```typescript
const animations = {
  // Button press
  buttonPress: {
    scale: 0.98,
    duration: 100,
  },
  
  // Hover/focus
  hover: {
    scale: 1.02,
    duration: 200,
  },
  
  // Slide in from left
  slideInLeft: {
    from: { translateX: -300, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: 300,
    easing: 'easeOutCubic',
  },
  
  // Fade in
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 200,
  },
  
  // Elastic bounce
  elasticBounce: {
    type: 'spring',
    damping: 15,
    stiffness: 200,
    mass: 1,
  }
}
```

### Reanimated 3 Patterns
```typescript
import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

// Elastic slider animation
const useElasticSlider = () => {
  const scale = useSharedValue(1);
  const overflow = useSharedValue(0);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: overflow.value }
    ],
  }));
  
  const onPressIn = () => {
    scale.value = withSpring(1.05);
  };
  
  const onPressOut = () => {
    scale.value = withSpring(1);
    overflow.value = withSpring(0);
  };
  
  return { animatedStyle, onPressIn, onPressOut };
};
```

## Tamagui Theme Configuration

```typescript
import { createTamagui, createTokens } from '@tamagui/core'

const tokens = createTokens({
  color: {
    tealLight: '#1adeba',
    teal: '#0a9181', 
    tealDark: '#16514d',
    bgPrimary: '#16181c',
    bgSecondary: '#23272f',
    bgTertiary: '#1a1e24',
    glassBg: 'rgba(20, 26, 31, 0.85)',
    glassBorder: 'rgba(26, 222, 186, 0.15)',
    white: '#ffffff',
    gray400: '#9ca3af',
    gray500: '#6b7280',
  },
  
  space: {
    xs: 4,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  
  size: {
    xs: 4,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
  },
  
  zIndex: {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
  }
})

const config = createTamagui({
  tokens,
  themes: {
    dark: {
      background: tokens.color.bgPrimary,
      backgroundHover: tokens.color.bgSecondary,
      backgroundPress: tokens.color.bgTertiary,
      backgroundFocus: tokens.color.glassBg,
      color: tokens.color.white,
      colorHover: tokens.color.tealLight,
      colorPress: tokens.color.teal,
      colorFocus: tokens.color.tealLight,
      borderColor: tokens.color.glassBorder,
      borderColorHover: tokens.color.tealLight,
      borderColorPress: tokens.color.teal,
      borderColorFocus: tokens.color.tealLight,
    }
  },
  defaultTheme: 'dark',
})
```

## Component Examples

### Glass Button Component
```typescript
import { Button } from '@tamagui/button'
import { styled } from '@tamagui/core'

const GlassButton = styled(Button, {
  backgroundColor: '$glassBg',
  borderColor: '$glassBorder',
  borderWidth: 1.5,
  borderRadius: '$lg',
  color: '$color',
  
  variants: {
    variant: {
      primary: {
        backgroundColor: 'rgba(26, 222, 186, 0.2)',
        borderColor: 'rgba(26, 222, 186, 0.4)',
        
        hoverStyle: {
          backgroundColor: 'rgba(26, 222, 186, 0.3)',
        },
        
        pressStyle: {
          backgroundColor: 'rgba(26, 222, 186, 0.4)',
          scale: 0.98,
        }
      },
      
      secondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      
      danger: {
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 0.6)',
      }
    },
    
    size: {
      small: {
        paddingHorizontal: '$sm',
        paddingVertical: '$xs',
        fontSize: 14,
      },
      
      medium: {
        paddingHorizontal: '$md',
        paddingVertical: '$sm',
        fontSize: 16,
      },
      
      large: {
        paddingHorizontal: '$lg',
        paddingVertical: '$md',
        fontSize: 18,
      }
    }
  },
  
  defaultVariants: {
    variant: 'primary',
    size: 'medium',
  }
})
```

### Glass Panel Component
```typescript
import { View } from '@tamagui/core'
import { styled } from '@tamagui/core'

const GlassPanel = styled(View, {
  backgroundColor: '$glassBg',
  borderColor: '$glassBorder',
  borderWidth: 1.5,
  borderRadius: '$2xl',
  padding: '$xl',
  
  variants: {
    size: {
      compact: {
        padding: '$lg',
        borderRadius: '$lg',
      },
      
      large: {
        padding: '$2xl',
        borderRadius: '$2xl',
      }
    },
    
    elevated: {
      true: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
        elevation: 8,
      }
    }
  },
  
  defaultVariants: {
    elevated: true,
  }
})
```

## Usage Guidelines

### Do's
- Use the glass panel as the base for all major UI sections
- Maintain consistent spacing using the defined tokens
- Use teal/cyan for primary actions and accents
- Apply subtle animations to enhance user experience
- Keep text high contrast against dark backgrounds
- Use the defined color palette consistently

### Don'ts
- Don't use bright colors that clash with the dark theme
- Avoid heavy shadows that break the glass aesthetic
- Don't use too many different border radius values
- Avoid animations that are too aggressive or distracting
- Don't use pure white backgrounds
- Avoid breaking the established visual hierarchy

### Accessibility
- Ensure sufficient color contrast (4.5:1 minimum)
- Use semantic colors for status indicators
- Provide haptic feedback for important interactions
- Support dynamic type sizing
- Test with screen readers
- Ensure touch targets are at least 44pt

### Performance
- Use native driver for animations when possible
- Optimize shadow usage (prefer elevation on Android)
- Use Reanimated 3 for complex animations
- Minimize re-renders with proper memoization
- Use FlatList for long scrollable content

This style guide provides everything needed to recreate the Climbing Viz aesthetic in React Native while maintaining the sophisticated, modern feel of the original web application. 