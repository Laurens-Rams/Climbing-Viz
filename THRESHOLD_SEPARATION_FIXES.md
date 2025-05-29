# Threshold Separation Fixes - December 2024

## Problem Statement

The threshold logic was incorrectly implemented in both the visualizer (frontend) and data analysis panel (backend), causing:
1. **Redundant calculations** - threshold-based move detection happening in two places
2. **Architecture confusion** - visualizer should only display data, not analyze it
3. **Live data issues** - visualizer not updating when move count changes
4. **Synchronization problems** - competing threshold logic between components

## Solution: Clean Separation of Concerns

### ✅ Backend (DataVizPanel) - KEEPS Thresholds
- **Purpose**: Data analysis and threshold-based move detection
- **Location**: `src/components/DataVizPanel.tsx`
- **Responsibilities**:
  - User-adjustable threshold slider (8-50 m/s²)
  - Real-time move detection from CSV acceleration data
  - Statistical analysis and move counting
  - Threshold persistence in boulder data (`appliedThreshold`)

### ✅ Frontend (Visualizer) - REMOVES Thresholds
- **Purpose**: 3D visualization of processed data
- **Location**: `src/hooks/useBoulderVisualizer.ts`
- **Responsibilities**:
  - Render 3D rings based on boulder move data
  - Display move count from boulder data (not calculate it)
  - Handle visual effects and animations
  - Update when move count changes (crucial for live data)

## Key Changes Made

### 1. Removed Threshold Logic from Visualizer

**Before:**
```typescript
// useBoulderVisualizer.ts - REMOVED
const detectMovesFromCSV = (boulderData, threshold) => {
  // Complex threshold-based move detection
}

const actualMoveCount = settings.useThresholdBasedMoveCount && boulderData.csvData 
  ? detectMovesFromCSV(boulderData, currentThreshold)
  : moveCount;
```

**After:**
```typescript
// useBoulderVisualizer.ts - SIMPLIFIED
const displayText = moveCount.toString(); // Just use the provided move count
```

### 2. Cleaned VisualizerSettings Interface

**Removed Properties:**
- `moveThreshold: number`
- `useThresholdBasedMoveCount: boolean`

**Result:** Visualizer settings now only contain visual/animation properties.

### 3. Enhanced Move Count Change Detection

**Added:**
```typescript
// Check if move count changed (important for live data)
const currentMoveCount = boulderData?.moves?.length || 0;
if (currentMoveCount !== prevMoveCountRef.current) {
    needsRecreation = true;
    prevMoveCountRef.current = currentMoveCount;
}
```

**Purpose:** Ensures visualization rebuilds when move count changes, critical for:
- Live data streaming from Phyphox
- CSV file threshold adjustments
- Real-time move detection updates

### 4. Removed App-level Threshold Synchronization

**Before:**
```typescript
// App.tsx - REMOVED complex threshold sync
if (settings.moveThreshold !== undefined) {
  setGlobalThreshold(settings.moveThreshold)
  setVisualizerSettings(prev => ({
    ...prev,
    moveThreshold: settings.moveThreshold || globalThreshold
  }))
}
```

**After:**
```typescript
// App.tsx - SIMPLIFIED
setVisualizerSettings(prevSettings => ({
  ...prevSettings,
  ...settings
}))
```

## Data Flow After Changes

### Backend Analysis Flow:
1. **User adjusts threshold** in DataVizPanel (8-50 m/s²)
2. **Move detection runs** on CSV acceleration data
3. **Boulder data updated** with new move count and `appliedThreshold`
4. **Statistics updated** in analysis panel

### Frontend Visualization Flow:
1. **Receives boulder data** with processed move count
2. **Detects move count change** (including live data)
3. **Recreates 3D visualization** with new ring layout
4. **Displays move count** in center text/sphere

### Live Data Integration:
1. **Phyphox streams data** → CSV processing
2. **DataVizPanel detects moves** → Updates boulder data
3. **Visualizer detects change** → Rebuilds rings automatically
4. **Real-time updates** without manual refresh

## Benefits

### 🏗️ **Architecture**
- **Clear separation** of analysis vs. visualization
- **Single source of truth** for move detection (DataVizPanel)
- **Simplified interfaces** and fewer dependencies

### 🚀 **Performance**
- **No duplicate calculations** - threshold logic only runs once
- **Efficient updates** - visualizer only rebuilds when necessary
- **Reduced infinite loops** - cleaner dependency chains

### 🔄 **Live Data Support**
- **Automatic visualization updates** when move count changes
- **Responsive to threshold adjustments** during live recording
- **Real-time visual feedback** for move detection tuning

### 🧪 **Testing & Development**
- **Easier debugging** - threshold logic isolated to one place
- **Clearer component responsibilities** - analysis vs. display
- **Better development experience** - fewer cross-component dependencies

## Migration Guide

### For Developers Adding Features:

1. **Threshold-related features** → Add to `DataVizPanel.tsx`
2. **Visual effects** → Add to `useBoulderVisualizer.ts`
3. **Move count changes** → Ensure boulder data updates trigger visualization refresh

### For Users:

- **Threshold adjustments** → Use DataVizPanel (📊 Data Analysis tab)
- **Visual customization** → Use ControlPanel in Visualizer view
- **Live data recording** → Threshold changes apply automatically

## Files Modified

- ✏️ `src/hooks/useBoulderVisualizer.ts` - Removed threshold logic
- ✏️ `src/App.tsx` - Simplified settings handling  
- ✏️ `src/components/DataVizPanel.tsx` - Kept as threshold authority
- 📄 `THRESHOLD_SEPARATION_FIXES.md` - This documentation

## Testing Checklist

- ✅ Threshold slider works in DataVizPanel
- ✅ Visualizer updates when move count changes
- ✅ Live data streaming updates visualization
- ✅ No infinite console logs
- ✅ CSV threshold adjustments rebuild visualization
- ✅ No CORS errors or font loading issues

This separation ensures the climbing data visualizer has a clean, maintainable architecture with proper separation between data analysis and visualization concerns. 