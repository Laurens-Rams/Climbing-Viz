import * as dat from 'dat.gui';

export class ControlPanel {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.gui = new dat.GUI();
        this.setupControls();
    }
    
    setupControls() {
        // Visual Style
        const styleFolder = this.gui.addFolder('🎨 Visual Style');
        
        styleFolder.add(this.visualizer.settings, 'colorMode', ['difficulty', 'grade', 'volume', 'week'])
            .name('Color Mode')
            .onChange(() => this.updateVisualization());
            
        styleFolder.add(this.visualizer.settings, 'opacity', 0.1, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => this.updateVisualization());

        styleFolder.add(this.visualizer.settings, 'colorSaturation', 0.0, 1.0, 0.05)
            .name('Color Saturation')
            .onChange(() => this.updateVisualization());

        styleFolder.add(this.visualizer.settings, 'colorLightness', 0.2, 1.0, 0.05)
            .name('Color Brightness')
            .onChange(() => this.updateVisualization());
            
        styleFolder.open();
        
        // Shape & Scale
        const shapeFolder = this.gui.addFolder('📐 Shape & Scale');
        
        shapeFolder.add(this.visualizer.settings, 'baseRadius', 0.2, 3, 0.05)
            .name('Inner Radius')
            .onChange(() => this.updateVisualization());
            
        shapeFolder.add(this.visualizer.settings, 'radiusMultiplier', 0.01, 0.8, 0.01)
            .name('Climb Sensitivity')
            .onChange(() => this.updateVisualization());
            
        shapeFolder.add(this.visualizer.settings, 'weekRadiusIncrement', 0, 0.02, 0.0005)
            .name('Week Growth')
            .onChange(() => this.updateVisualization());

        shapeFolder.add(this.visualizer.settings, 'maxClimbsForScale', 5, 50, 1)
            .name('Max Climbs Scale')
            .onChange(() => this.updateVisualization());
            
        shapeFolder.open();
        
        // Layout & Spacing
        const layoutFolder = this.gui.addFolder('📏 Layout & Spacing');
        
        layoutFolder.add(this.visualizer.settings, 'ringSpacing', 0.001, 0.05, 0.0005)
            .name('Week Spacing')
            .onChange(() => this.updateVisualization());

        layoutFolder.add(this.visualizer.settings, 'curveResolution', 12, 120, 6)
            .name('Curve Smoothness')
            .onChange(() => this.updateVisualization());

        layoutFolder.add(this.visualizer.settings, 'showGradeLabels')
            .name('Grade Markers')
            .onChange(() => this.updateVisualization());
            
        layoutFolder.open();
        

        
        // Data Filtering & Display
        const dataFolder = this.gui.addFolder('📊 Data & Filtering');
        
        dataFolder.add(this.visualizer.settings, 'gradeFilter', ['all', 'V1-V4', 'V5-V8', 'V9-V12', 'easy', 'hard'])
            .name('Grade Filter')
            .onChange(() => this.updateVisualization());

        dataFolder.add(this.visualizer.settings, 'scaleMode', ['linear', 'logarithmic'])
            .name('Scale Mode')
            .onChange(() => this.updateVisualization());

        dataFolder.add(this.visualizer.settings, 'showWeekNumbers')
            .name('Week Numbers')
            .onChange(() => this.updateVisualization());

        dataFolder.add(this.visualizer.settings, 'showStatistics')
            .name('Hover Stats')
            .onChange(() => this.updateVisualization());
            
        dataFolder.open();
        
        // Highlighting & Emphasis
        const highlightFolder = this.gui.addFolder('🎯 Highlighting');
        
        highlightFolder.add(this.visualizer.settings, 'highlightMaxGrade')
            .name('Highlight Max Grade')
            .onChange(() => this.updateVisualization());

        highlightFolder.add(this.visualizer.settings, 'showProgressionLine')
            .name('Progression Line')
            .onChange(() => this.updateVisualization());

        highlightFolder.add(this.visualizer.settings, 'emphasizeBreakthroughs')
            .name('Emphasize Breakthroughs')
            .onChange(() => this.updateVisualization());

        highlightFolder.add(this.visualizer.settings, 'colorByProgress')
            .name('Color by Progress')
            .onChange(() => this.updateVisualization());
            
        highlightFolder.open();
        
        // Advanced Controls
        const advancedFolder = this.gui.addFolder('⚙️ Advanced');
        
        advancedFolder.add(this.visualizer.settings, 'gradeSpread', 0.1, 2.0, 0.05)
            .name('Grade Spread')
            .onChange(() => this.updateVisualization());

        advancedFolder.add(this.visualizer.settings, 'heightOffset', -5, 5, 0.1)
            .name('Height Offset')
            .onChange(() => this.updateVisualization());

        advancedFolder.add(this.visualizer.settings, 'backgroundGrid')
            .name('Background Grid')
            .onChange(() => this.updateVisualization());
            
        advancedFolder.open();
        
        // Presets
        const presetsFolder = this.gui.addFolder('🎯 Presets');
        
        const presets = {
            spiral: () => this.applySpiral(),
            tight: () => this.applyTight(),
            spread: () => this.applySpread(),
            minimal: () => this.applyMinimal(),
            progression: () => this.applyProgression()
        };
        
        presetsFolder.add(presets, 'spiral').name('🌀 Spiral View');
        presetsFolder.add(presets, 'tight').name('🔥 Dramatic');
        presetsFolder.add(presets, 'spread').name('🌊 Smooth Flow');
        presetsFolder.add(presets, 'progression').name('📈 Progression Story');
        presetsFolder.add(presets, 'minimal').name('✨ Minimal');
        
        presetsFolder.open();
        
        // View Controls
        const viewFolder = this.gui.addFolder('🎮 Camera & Data');
        
        const viewControls = {
            resetView: () => this.resetView(),
            topView: () => this.setTopView(),
            sideView: () => this.setSideView(),
            regenerateData: () => this.regenerateData(),
            exportData: () => this.exportCurrentData()
        };
        
        viewFolder.add(viewControls, 'resetView').name('🔄 Reset Camera');
        viewFolder.add(viewControls, 'topView').name('⬆️ Top View');
        viewFolder.add(viewControls, 'sideView').name('➡️ Side View');
        viewFolder.add(viewControls, 'regenerateData').name('🎲 New Data');
        viewFolder.add(viewControls, 'exportData').name('💾 Export Data');
        
        viewFolder.open();
        
        // Info Panel
        const infoFolder = this.gui.addFolder('Information');
        
        const info = {
            totalWeeks: 52,
            gradeRange: 'V1 - V12',
            dataSource: 'CSV Sensor Data'
        };
        
        infoFolder.add(info, 'totalWeeks').name('Total Weeks').listen();
        infoFolder.add(info, 'gradeRange').name('Grade Range').listen();
        infoFolder.add(info, 'dataSource').name('Data Source').listen();
        
        // Style the GUI
        this.styleGUI();
    }
    
    styleGUI() {
        // Position the GUI
        this.gui.domElement.style.position = 'absolute';
        this.gui.domElement.style.top = '20px';
        this.gui.domElement.style.right = '20px';
        this.gui.domElement.style.zIndex = '1000';
        
        // Custom styling
        const style = document.createElement('style');
        style.textContent = `
            .dg.ac {
                background: rgba(0, 0, 0, 0.9) !important;
                border: 1px solid #333 !important;
                border-radius: 8px !important;
            }
            
            .dg .folder-title {
                background: rgba(0, 255, 136, 0.2) !important;
                border-bottom: 1px solid #333 !important;
                color: #00ff88 !important;
            }
            
            .dg .c {
                border-bottom: 1px solid #222 !important;
            }
            
            .dg .property-name {
                color: #cccccc !important;
            }
            
            .dg .c input[type=text] {
                background: #1a1a1a !important;
                color: #ffffff !important;
                border: 1px solid #333 !important;
            }
            
            .dg .c .slider {
                background: #333 !important;
            }
            
            .dg .c .slider-fg {
                background: #00ff88 !important;
            }
            
            .dg .c select {
                background: #1a1a1a !important;
                color: #ffffff !important;
                border: 1px solid #333 !important;
            }
            
            .dg .button {
                background: #00ff88 !important;
                color: #000000 !important;
                border: none !important;
                border-radius: 4px !important;
                font-weight: bold !important;
            }
            
            .dg .button:hover {
                background: #00cc6a !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    updateVisualization() {
        this.visualizer.updateSettings(this.visualizer.settings);
    }
    
    refreshControllers() {
        // Refresh all controllers to show updated values
        for (let i in this.gui.__controllers) {
            this.gui.__controllers[i].updateDisplay();
        }
        
        // Refresh folder controllers
        for (let folderName in this.gui.__folders) {
            const folder = this.gui.__folders[folderName];
            for (let i in folder.__controllers) {
                folder.__controllers[i].updateDisplay();
            }
        }
    }
    
    resetView() {
        this.visualizer.camera.position.set(0, 13, 15);
        this.visualizer.camera.lookAt(0, 13, 0);
    }
    
    setTopView() {
        this.visualizer.camera.position.set(0, 25, 0);
        this.visualizer.camera.lookAt(0, 13, 0);
    }
    
    setSideView() {
        this.visualizer.camera.position.set(15, 13, 0);
        this.visualizer.camera.lookAt(0, 13, 0);
    }
    
    regenerateData() {
        // This will be called from main.js to regenerate data
        if (this.onRegenerateData) {
            this.onRegenerateData();
        }
    }
    
    setRegenerateCallback(callback) {
        this.onRegenerateData = callback;
    }
    
    // Preset configurations
    applySpiral() {
        Object.assign(this.visualizer.settings, {
            baseRadius: 1,
            radiusMultiplier: 0.15,
            weekRadiusIncrement: 0.002,
            ringSpacing: 0.001,
            opacity: 0.8,
            curveResolution: 60,
            colorMode: 'week',
            colorSaturation: 0.9,
            colorLightness: 0.7,
            rotationSpeed: 0.005
        });
        this.updateVisualization();
        this.refreshControllers();
    }
    
    applyTight() {
        Object.assign(this.visualizer.settings, {
            baseRadius: 0.5,
            radiusMultiplier: 0.4,
            weekRadiusIncrement: 0.001,
            ringSpacing: 0.002,
            opacity: 0.9,
            curveResolution: 72,
            colorMode: 'volume',
            colorSaturation: 1.0,
            colorLightness: 0.6,
            rotationSpeed: 0
        });
        this.updateVisualization();
        this.refreshControllers();
    }
    
    applySpread() {
        Object.assign(this.visualizer.settings, {
            baseRadius: 1.2,
            radiusMultiplier: 0.08,
            weekRadiusIncrement: 0.003,
            ringSpacing: 0.001,
            opacity: 0.7,
            curveResolution: 96,
            colorMode: 'grade',
            colorSaturation: 0.8,
            colorLightness: 0.8,
            rotationSpeed: 0.002
        });
        this.updateVisualization();
        this.refreshControllers();
    }
    
    applyMinimal() {
        Object.assign(this.visualizer.settings, {
            baseRadius: 0.8,
            radiusMultiplier: 0.05,
            weekRadiusIncrement: 0,
            ringSpacing: 0.001,
            opacity: 0.6,
            curveResolution: 36,
            colorMode: 'week',
            colorSaturation: 0.5,
            colorLightness: 0.9,
            rotationSpeed: 0
        });
        this.updateVisualization();
        this.refreshControllers();
    }
    
    applyProgression() {
        Object.assign(this.visualizer.settings, {
            baseRadius: 0.6,
            radiusMultiplier: 0.25,
            weekRadiusIncrement: 0.004,
            ringSpacing: 0.003,
            opacity: 0.85,
            curveResolution: 48,
            colorMode: 'grade',
            colorSaturation: 1.0,
            colorLightness: 0.65,
            rotationSpeed: 0.003,
            gradeSpread: 1.0,
            heightOffset: 0
        });
        this.updateVisualization();
        this.refreshControllers();
    }
    
    exportCurrentData() {
        if (window.climbingApp && window.climbingApp.exportData) {
            window.climbingApp.exportData();
        }
    }
    
    destroy() {
        this.gui.destroy();
    }
} 