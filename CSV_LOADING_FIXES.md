# CSV File Loading Fixes

## Problem Summary

The climbing visualization application had issues when users tried to click and load another CSV file, resulting in "loaded error" messages and failed file switching.

## Root Causes Identified

### 1. File Input Not Reset
- **Issue**: The file input element retained the previous file selection
- **Impact**: Subsequent selections of the same file wouldn't trigger the `change` event
- **Location**: File upload handling in the visualizer components

### 2. Poor Error Handling
- **Issue**: Generic error messages without specific details
- **Impact**: Users couldn't understand what went wrong
- **Location**: Multiple files handling CSV loading

### 3. Cache Not Cleared
- **Issue**: Boulder data cache wasn't cleared when switching between files
- **Impact**: Old data persisted when loading new files
- **Location**: `src/data/boulderData.js` - cache management

### 4. CSV Format Detection Issues
- **Issue**: Header detection didn't handle scientific notation format properly
- **Impact**: Valid CSV files were rejected
- **Location**: CSV parsing logic in visualizer components

### 5. Static File Discovery
- **Issue**: System only looked for hardcoded file names
- **Impact**: Random file names couldn't be discovered
- **Location**: `src/data/boulderData.js` - file discovery system

## Solutions Implemented

### 1. Enhanced File Upload Handler
- ✅ **File input reset**: Clear input value after processing
- ✅ **Better error handling**: Detailed error messages with troubleshooting info
- ✅ **Loading indicators**: Visual feedback during file processing
- ✅ **Graceful fallback**: Continue operation even with errors

### 2. Improved CSV Format Detection
- ✅ **Scientific notation support**: Properly parse values like `1.428608333E-2`
- ✅ **Flexible header matching**: Handle headers with units like `"Acceleration x (m/s^2)"`
- ✅ **Better column detection**: More robust column identification
- ✅ **Detailed logging**: Comprehensive parsing information

### 3. Dynamic File Discovery System
- ✅ **Pattern-based discovery**: Try common CSV file name patterns
- ✅ **Random name support**: Handle any valid CSV file name
- ✅ **Auto-discovery**: Automatically find new files
- ✅ **Fallback mechanism**: Graceful handling when files aren't found

### 4. Auto-Refresh Functionality
- ✅ **File change detection**: Monitor files for modifications
- ✅ **Cache invalidation**: Clear cache when files change
- ✅ **Automatic updates**: Refresh file list when changes detected
- ✅ **User controls**: Manual refresh and auto-refresh toggle

### 5. Enhanced Cache Management
- ✅ **Smart caching**: Cache processed data for performance
- ✅ **Cache clearing**: Clear cache when switching files
- ✅ **Force refresh**: Manual cache clearing options
- ✅ **Memory management**: Efficient cache handling

## Key Features Added

### CSV File Support
- **Any file name**: Support for random CSV file names (not just hardcoded ones)
- **Scientific notation**: Proper parsing of scientific notation values
- **Flexible headers**: Handle various header formats with units
- **Error recovery**: Skip bad rows and continue processing

### File Management
- **Dynamic discovery**: Automatically find CSV files in the data directory
- **Auto-refresh**: Detect file changes and update automatically
- **Manual controls**: User can manually refresh file list
- **Cache management**: Smart caching with invalidation

### User Experience
- **Better error messages**: Detailed, actionable error information
- **Loading indicators**: Visual feedback during operations
- **Success notifications**: Confirmation when operations complete
- **Graceful fallback**: Continue working even with errors

## File Structure

```
src/
├── data/
│   ├── Raw Data.csv          # Main climbing data
│   ├── Raw Data2.csv         # Additional climbing data
│   ├── boulderData.js        # Enhanced file discovery and caching
│   └── accelerationAnalyzer.js
├── visualizer/
│   └── DataVizIntegration.js # Integrated visualization system
├── controls/
│   └── BoulderControlPanel.js # Enhanced with auto-refresh
└── main.js                   # Main application
```

## Usage Instructions

### For Random File Names
1. Place any CSV file with climbing data in `src/data/`
2. File can have any name (e.g., `my_awesome_climb_2025.csv`)
3. System will automatically discover it
4. Use "🔍 Scan for New Files" button to refresh manually

### For File Replacement
1. Replace any CSV file in `src/data/` using Finder
2. System will detect the change automatically (if auto-refresh is enabled)
3. Or use "🔄 Reload" button to refresh manually
4. Cache will be cleared and new data loaded

### CSV Format Requirements
- Headers must include: `Time (s)`, `Acceleration x (m/s^2)`, `Acceleration y (m/s^2)`, `Acceleration z (m/s^2)`
- Scientific notation is supported (e.g., `1.428608333E-2`)
- Values should be in m/s² (will be converted to g-force automatically)

## Testing

The improvements have been tested with:
- ✅ Scientific notation parsing
- ✅ Random file name support
- ✅ File discovery system
- ✅ Auto-refresh functionality
- ✅ Error handling and recovery
- ✅ Cache management
- ✅ File replacement detection

## Benefits

1. **Flexibility**: Support any CSV file name, not just hardcoded ones
2. **Reliability**: Better error handling and recovery
3. **User-friendly**: Clear error messages and visual feedback
4. **Automatic**: Auto-discovery and refresh of files
5. **Performance**: Smart caching with proper invalidation
6. **Robust**: Handles various CSV formats and edge cases 