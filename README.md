# 🧗‍♂️ Climbing Data Visualizer

A stunning 3D visualization tool for climbing data that displays your climbing progress as concentric rings in 3D space. Each ring represents a week of climbing activity, with the radius varying based on climbing volume and grades achieved.

![Climbing Visualizer Preview](https://via.placeholder.com/800x400/0a0a0a/00ff88?text=3D+Climbing+Rings+Visualization)

## ✨ Features

- **3D Ring Visualization**: Each week is represented as a ring with radius based on climbing data
- **Interactive Controls**: Mouse controls for rotation, zoom, and exploration
- **Real-time Statistics**: Hover over rings to see detailed climbing stats
- **Customizable Settings**: Adjust visualization parameters with intuitive sliders
- **Multiple Color Modes**: Color rings by grade, volume, or week progression
- **Responsive Design**: Works on desktop and mobile devices
- **Export/Import**: Save and load your climbing data

## 🎯 Data Structure

The visualizer expects climbing data in the following format:

```json
[
  {
    "week": 1,
    "grades": {
      "V1": 5,
      "V2": 3,
      "V3": 2,
      "V4": 1,
      "V5": 0,
      ...
      "V12": 0
    }
  },
  ...
]
```

Each week object contains:
- `week`: Week number (1-52)
- `grades`: Object with grade counts (V1-V12)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd climbing-viz
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deployment

Deploy to GitHub Pages:
```bash
npm run deploy
```

## 🎮 Controls

### Mouse Controls
- **Left Click + Drag**: Rotate the view
- **Scroll Wheel**: Zoom in/out
- **Hover**: View detailed statistics for each week

### Control Panel
- **Visualization Settings**: Toggle wireframe mode, change color schemes
- **Ring Properties**: Adjust ring sizes, spacing, and scaling
- **Data Weighting**: Balance between volume and grade influence
- **View Controls**: Quick camera presets and data regeneration

## 🎨 Customization

### Color Modes
- **Grade Mode**: Colors based on average climbing grade (blue to red)
- **Volume Mode**: Colors based on total climbs (green to yellow)
- **Week Mode**: Colors based on week progression (full spectrum)

### Ring Sizing
Ring radius is calculated using:
```
radius = baseRadius + (volumeFactor * volumeWeight + gradeFactor * gradeWeight) * (maxRadius - baseRadius)
```

Where:
- `volumeFactor`: Normalized climbing volume (0-1)
- `gradeFactor`: Normalized average grade (0-1)
- `volumeWeight` + `gradeWeight` = 1.0

## 📊 Data Analysis

The visualizer provides several ways to analyze your climbing data:

1. **Seasonal Patterns**: View climbing activity throughout the year
2. **Grade Progression**: Track improvement in climbing grades over time
3. **Volume Trends**: Identify periods of high/low climbing activity
4. **Performance Correlation**: See relationships between volume and grade achievement

## 🛠️ Technical Details

### Built With
- **Three.js**: 3D graphics and WebGL rendering
- **Vite**: Fast build tool and development server
- **dat.GUI**: Interactive control panel
- **Vanilla JavaScript**: No heavy frameworks, pure performance

### Architecture
```
src/
├── data/
│   └── mockData.js          # Data generation and processing
├── visualizer/
│   └── RingVisualizer.js    # Main 3D visualization class
├── controls/
│   └── ControlPanel.js      # GUI controls and settings
└── main.js                  # Application entry point
```

### Performance
- Optimized for 60fps rendering
- Efficient geometry reuse
- Minimal DOM manipulation
- WebGL hardware acceleration

## 📝 Data Format Example

Here's an example of real climbing data structure:

```json
[
  {
    "week": 1,
    "grades": {
      "V1": 8,
      "V2": 6,
      "V3": 4,
      "V4": 2,
      "V5": 1,
      "V6": 0,
      "V7": 0,
      "V8": 0,
      "V9": 0,
      "V10": 0,
      "V11": 0,
      "V12": 0
    }
  },
  {
    "week": 2,
    "grades": {
      "V1": 5,
      "V2": 7,
      "V3": 5,
      "V4": 3,
      "V5": 2,
      "V6": 1,
      "V7": 0,
      "V8": 0,
      "V9": 0,
      "V10": 0,
      "V11": 0,
      "V12": 0
    }
  }
]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by data visualization principles and climbing community
- Three.js community for excellent 3D graphics library
- Climbing grade system based on V-scale bouldering grades

## 🐛 Troubleshooting

### Common Issues

**Visualization not loading**
- Check browser console for errors
- Ensure WebGL is supported in your browser
- Try refreshing the page

**Performance issues**
- Reduce ring spacing in settings
- Switch to wireframe mode
- Close other browser tabs

**Data import errors**
- Verify JSON format matches expected structure
- Check that all weeks have grade objects
- Ensure grade values are numbers

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed description

## Live Data Recording

The application supports real-time data streaming from Phyphox mobile app:

1. **Setup**: Ensure your phone and computer are on the same WiFi network
2. **Connect**: Open Phyphox → Acceleration (without g) → Allow remote access
3. **Configure**: Update the IP address in the remote handler if needed
4. **Record**: Click "Remote: OFF" to start live data collection

### Performance Optimization

The live data system uses intelligent throttling to maintain smooth performance:

- **Data Collection**: Polls sensor data every 200ms for responsiveness
- **Visual Updates**: Updates visualizations every 1-3 seconds (configurable)
- **Status Updates**: Updates counters and status displays in real-time

You can adjust the visual update rate using the dropdown in the recording controls:
- **0.5s**: Very responsive, higher CPU usage
- **1s**: Balanced (default)
- **2s**: Conservative, lower CPU usage  
- **3s**: Minimal updates, lowest CPU usage

This separation ensures all data is captured while keeping the interface responsive during long recording sessions.

---

Happy climbing and visualizing! 🧗‍♂️📊 