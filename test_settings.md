# Settings Testing Checklist

## 🧗 Data & Live Tab
- [x] Move Threshold slider - ✅ Working (updates live)
- [x] Statistics display - ✅ Working
- [x] Live mode connection - ✅ Working

## ⚙️ Basics Tab
Test each slider to see if it affects the visualization:

1. **Overall Radius** (baseRadius: 0.1-2.0)
   - Should change the base size of all rings
   - Expected: Smaller/larger overall visualization

2. **Dynamics Effect** (dynamicsMultiplier: 0.5-15.0) 
   - Should change how much acceleration affects ring size
   - Expected: More/less dramatic size variations

3. **Overall Size** (combinedSize: 0.5-5.0)
   - Should scale the entire visualization
   - Expected: Bigger/smaller overall size

4. **Ring Count** (ringCount: 10-150)
   - Should change number of concentric rings
   - Expected: More/fewer rings visible

5. **Ring Spacing** (ringSpacing: 0.0-0.05)
   - Should change spacing between rings
   - Expected: Tighter/looser ring spacing

## 🎨 Visuals Tab
1. **Line Opacity** (opacity: 0.1-1.0)
   - Expected: More/less transparent lines

2. **Center Fade** (centerFade: 0.0-1.0)
   - Expected: Inner rings fade more/less

3. **3D Depth Effect** (depthEffect: 0.0-8.0)
   - Expected: More/less Z-axis variation

4. **Organic Noise** (organicNoise: 0.0-2.0)
   - Expected: More/less organic shape variation

5. **Move Color** & **Crux Color**
   - Expected: Color changes in visualization

## 🌊 Dynamic Effects Tab
1. **Crux Emphasis** (cruxEmphasis: 0.5-50.0)
   - Expected: Crux moves more/less emphasized

## 🔄 Animation Tab
1. **Rotation Speed** (rotationSpeed: 0.0-2.0)
   - Expected: Visualization rotates faster/slower

2. **Animation Speed** (liquidSpeed: 0.0-10.0)
   - Expected: Liquid effects animate faster/slower

3. **Liquid Size** (liquidSize: 0.1-5.0)
   - Expected: Liquid wave effects bigger/smaller

## 🎯 Attempts Tab
1. **Show Attempt Lines** toggle
   - Expected: Attempt lines appear/disappear

2. **Attempt Count** (attemptCount: 0-200)
   - Expected: More/fewer attempt lines

3. **Z-Height Effect** (attemptZHeight: 0.0-3.0)
   - Expected: Attempt lines higher/lower

4. **Wave Effect** (attemptWaveEffect: 0.0-1.0)
   - Expected: Attempt lines wave more/less

5. **Overall Radius** (maxRadiusScale: 0.5-3.0)
   - Expected: Attempt lines closer/farther from center 