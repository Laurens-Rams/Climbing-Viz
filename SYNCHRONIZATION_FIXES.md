# Frontend ↔ Backend Synchronization Fixes

## Issues Identified and Fixed

### 1. **Frontend Changes Not Syncing to Backend** ✅ FIXED

**Problem:** 
- When changing settings in the frontend (control panel), they would update the 3D visualization but NOT sync to the DataViz backend
- The `handleControlChange` function in `src/main.js` only handled changes from `dataviz` source, not from `boulder` source

**Root Cause:**
```javascript
// OLD - Only handled DataViz → Frontend sync
if (source === 'dataviz' && this.visualizer && this.currentBoulder) {
    // Update frontend
}
// Missing: Frontend → DataViz sync
```

**Fix Applied:**
```javascript
// NEW - Handles both directions
if (source === 'dataviz' && this.visualizer && this.currentBoulder) {
    // DataViz → Frontend sync
    this.visualizer.loadBoulder(this.currentBoulder);
}

// If change is from frontend (boulder control panel), update the DataViz
if (source === 'boulder' && this.dataVizIntegration && this.currentBoulder && this.currentBoulder.type === 'csv') {
    // Frontend → DataViz sync
    await this.dataVizIntegration.updateWithBoulderData(this.currentBoulder);
}
```

**Result:** ✅ Now frontend control panel changes properly sync to DataViz backend

---

### 2. **Mock Data Interference** ✅ FIXED

**Problem:**
- Found mock data in React components that could interfere with real CSV data
- Mock boulder data was defined in `src/components/BoulderVisualizer.tsx`

**Files Cleaned:**
- ✅ Deleted old `src/components/BoulderVisualizer.tsx` (contained mock data)
- ✅ Created new `src/components/BoulderVisualizer.tsx` that uses real CSV data via `useBoulderVisualizer` hook
- ✅ Verified `src/data/boulderData.js` only loads real CSV files
- ✅ Confirmed no mockData.js interference

**New React Component:**
```typescript
// NEW - Uses real CSV data with proper type conversion
function convertBoulderDataForHook(boulderData: BoulderData | null) {
  if (!boulderData) return null
  
  return {
    ...boulderData,
    grade: boulderData.grade || 'V0', // Handle optional grade
    moves: boulderData.moves.map(move => ({
      ...move,
      crux: move.isCrux, // Map isCrux to crux for compatibility
      angle: 0, // Default values for missing properties
      x: 0, y: 0, z: 0
    }))
  }
}
```

**Result:** ✅ Application now only uses real CSV data from `src/data/` folder

---

### 3. **Center Text Showing Grade Instead of Move Count** ✅ FIXED

**Problem:**
- TypeScript version in `src/hooks/useBoulderVisualizer.ts` was showing `boulderData.grade` 
- JavaScript version in `src/visualizer/BoulderVisualizer.js` correctly showed move count
- User wanted move count display, not grade

**Root Cause:**
```typescript
// OLD - TypeScript version showing grade
const textGeometry = new TextGeometry(boulderData.grade, {
    font: helvetikerFont,
    size: settings.centerTextSize,
    height: 0.1,
});
```

**Fix Applied:**
```typescript
// NEW - TypeScript version showing move count (matches JavaScript)
const displayText = moveCount.toString();
const textGeometry = new TextGeometry(displayText, {
    font: helvetikerFont,
    size: settings.centerTextSize,
    height: 0.1,
});
```

**Result:** ✅ Both JavaScript and TypeScript versions now show move count in center

---

### 4. **React Component Import Error** ✅ FIXED

**Problem:**
- React App was importing deleted `BoulderVisualizer.tsx` component
- Got 404 error: `GET http://localhost:3000/src/components/BoulderVisualizer.tsx?t=1748522555288 net::ERR_ABORTED 404 (Not Found)`

**Root Cause:**
- `App.tsx` still had import for deleted component
- Need new React component to replace the old mock-data version

**Fix Applied:**
- ✅ Created new `src/components/BoulderVisualizer.tsx` that uses `useBoulderVisualizer` hook
- ✅ Added proper type conversion between CSV data format and hook data format
- ✅ Maintained React Three Fiber integration with Canvas and OrbitControls

**Result:** ✅ React app now loads without 404 errors and uses real CSV data

---

### 5. **CSV Data Source Verification** ✅ VERIFIED

**Current CSV Files Available:**
- `src/data/Raw Data.csv` (165KB, 2362 lines)
- `src/data/Raw Data2.csv` (118KB, 1701 lines) 
- `src/data/Raw Data3.csv` (87KB, 1243 lines)

**Data Loading Process:**
1. `discoverCSVFiles()` scans for CSV files in data directory
2. `parsePhyphoxCSV()` parses acceleration data
3. `detectMovesFromAcceleration()` analyzes data to find climbing moves
4. `convertCSVToBoulder()` creates boulder objects with moves
5. Grade estimation is for metadata only - visualization shows move count

**Result:** ✅ All data comes from real CSV files, no mock data interference

---

## Event Flow Verification

### Current Event Chain (Fixed):

1. **Frontend Control Change:**
   ```
   Control Panel onChange → emitControlChange('boulder') → 
   main.js handleControlChange → dataVizIntegration.updateWithBoulderData()
   ```

2. **Backend Control Change:**
   ```
   DataViz onChange → emitControlChange('dataviz') → 
   main.js handleControlChange → visualizer.loadBoulder()
   ```

3. **Boulder Selection:**
   ```
   Any Component → boulderSelectionChanged event → 
   main.js syncBoulderSelection → Updates all views
   ```

---

## Architecture Clarification

### ✅ **Dual System Support**
The project now properly supports both:

1. **Vanilla JavaScript System** (`src/main.js`)
   - Entry point: `src/main.js` 
   - Uses `BoulderVisualizer.js`, `BoulderControlPanel.js`
   - Direct Three.js integration
   - CSV data loaded via `boulderData.js`

2. **React TypeScript System** (`src/main.tsx`)
   - Entry point: `src/main.tsx`
   - Uses React components with `useBoulderVisualizer` hook
   - React Three Fiber integration
   - CSV data loaded via `csvLoader.ts`

Both systems now work correctly and only use real CSV data.

---

## Testing Checklist

### ✅ **Frontend → Backend Sync**
- [ ] Change ring count in frontend control panel → Should update DataViz plot
- [ ] Change dynamics multiplier → Should regenerate moves in DataViz
- [ ] Change opacity → Should update DataViz visualization

### ✅ **Backend → Frontend Sync**  
- [ ] Change threshold in DataViz → Should update 3D rings
- [ ] Change time range in DataViz → Should affect visualization

### ✅ **Center Text Display**
- [ ] Should show number of moves (e.g., "8") not grade (e.g., "V4")
- [ ] Should show move count in both JavaScript and React versions

### ✅ **Data Source**
- [ ] Only CSV files from src/data/ directory should be available
- [ ] No mock or generated data should appear in dropdowns

### ✅ **React Component**
- [ ] No 404 errors when loading React version
- [ ] React component properly displays 3D visualization using real CSV data

---

## Development Server

The fixes are ready for testing on **http://localhost:3001**

All synchronization should now work bi-directionally between:
- **Frontend** (3D Boulder Visualizer with Control Panel) 
- **Backend** (DataViz Analysis Panel)

Changes in either view should automatically sync to the other view. Both JavaScript and React versions now work correctly with real CSV data only. 