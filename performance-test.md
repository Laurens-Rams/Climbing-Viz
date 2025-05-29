# Performance Test Guide

## Issues Fixed

### 1. Double Animation Loops ✅
- **Problem**: Two `requestAnimationFrame` loops running simultaneously
- **Solution**: Integrated camera updates into main animation loop
- **Test**: Check browser dev tools for single animation frame rate

### 2. Excessive Visualization Updates ✅
- **Problem**: Control panel triggered updates every 50ms
- **Solution**: Increased debounce to 200ms
- **Test**: Adjust controls and monitor console for update frequency

### 3. Memory Leaks ✅
- **Problem**: Geometries and materials not properly disposed
- **Solution**: Added proper cleanup in `clearScene()` and `dispose()` methods
- **Test**: Monitor memory usage in browser dev tools over time

### 4. Complex Geometry Creation ✅
- **Problem**: Excessive detail levels causing performance bottlenecks
- **Solution**: Reduced curve resolution from 480 to 240, capped detail levels
- **Test**: Load complex boulders and monitor FPS

## Performance Monitoring Features

### Keyboard Shortcuts
- `P` - Toggle performance monitor display
- `H` - Toggle UI visibility
- `ESC` - Emergency stop animation
- `SPACE` - Pause/resume animation

### Performance Monitor
- Shows FPS, render time, and object count
- Automatically appears when FPS drops below 45
- Color-coded FPS indicator (red < 30, orange < 50, green ≥ 50)

## Testing Steps

1. **Load the application**
   ```bash
   npm run dev
   ```

2. **Test basic performance**
   - Press `P` to show performance monitor
   - Should show 60 FPS with green color
   - Render time should be < 10ms

3. **Test control responsiveness**
   - Adjust "Dynamics Effect" slider
   - Should update smoothly without freezing
   - Check console for update frequency (should be limited)

4. **Test memory stability**
   - Switch between different boulders multiple times
   - Monitor memory usage in browser dev tools
   - Memory should not continuously increase

5. **Test complex visualizations**
   - Increase "Ring Count" to maximum (70)
   - Increase "Dynamics Effect" to maximum
   - FPS should remain above 30

6. **Emergency controls**
   - If browser starts to freeze, press `ESC` to stop animation
   - Press `SPACE` to pause/resume as needed

## Expected Results

- **No browser freezing** during normal operation
- **Smooth 60 FPS** for most configurations
- **Responsive controls** with immediate visual feedback
- **Stable memory usage** when switching between boulders
- **Graceful degradation** when performance drops

## Performance Thresholds

- **Good**: FPS ≥ 50, Render time < 10ms
- **Acceptable**: FPS ≥ 30, Render time < 20ms
- **Poor**: FPS < 30, Render time > 20ms (monitor will show automatically)

If performance is still poor, try:
1. Reducing "Ring Count" setting
2. Lowering "Dynamics Effect" setting
3. Disabling "Move Segments" or "Move Lines"
4. Using a simpler boulder with fewer moves 