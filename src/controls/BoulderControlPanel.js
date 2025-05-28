import * as dat from 'dat.gui';
import { getBoulderList, getBoulderById, generateRandomBoulder, updateAnalyzerSettings, getAccelerationAnalyzer } from '../data/boulderData.js';

export class BoulderControlPanel {
    constructor(visualizer, dataVizIntegration = null) {
        this.visualizer = visualizer;
        this.dataVizIntegration = dataVizIntegration;
        this.gui = new dat.GUI();
        this.currentBoulderId = 1; // Default to first boulder
        this.updateTimeout = null; // For debouncing updates
        
        this.setupControls();
    }
    
    setupControls() {
        // Boulder Selection
        const boulderFolder = this.gui.addFolder('🧗 Boulder Selection');
        
        const boulderList = getBoulderList();
        console.log('Available boulders:', boulderList);
        const boulderNames = {};
        boulderList.forEach(boulder => {
            const displayName = `${boulder.name} (${boulder.grade}) - Real Data`;
            boulderNames[displayName] = boulder.id;
        });
        console.log('Boulder names for dropdown:', boulderNames);
        
        // Create a persistent object for the dropdown
        this.boulderSelection = { boulder: this.currentBoulderId };
        
        boulderFolder.add(this.boulderSelection, 'boulder', boulderNames)
            .name('Select Boulder')
            .onChange((boulderId) => {
                console.log('Boulder selection changed to:', boulderId);
                this.currentBoulderId = boulderId;
                this.loadBoulder(boulderId);
            });
            
        const boulderControls = {
            randomBoulder: () => this.generateRandomBoulder(),
            reloadCurrent: () => this.loadBoulder(this.currentBoulderId)
        };
        
        boulderFolder.add(boulderControls, 'randomBoulder').name('🎲 Random Boulder');
        boulderFolder.add(boulderControls, 'reloadCurrent').name('🔄 Reload');
        
        boulderFolder.open();

        // Acceleration Analysis Settings
        const analysisFolder = this.gui.addFolder('🔬 Analysis Settings');
        
        const analyzer = getAccelerationAnalyzer();
        const analysisSettings = {
            smoothingWindow: analyzer.smoothingWindow,
            peakThreshold: analyzer.peakThreshold,
            minPeakDistance: analyzer.minPeakDistance,
            speedCalculationRadius: analyzer.speedCalculationRadius,
            maxMoves: analyzer.maxMoves
        };
        
        analysisFolder.add(analysisSettings, 'smoothingWindow', 3, 15, 1)
            .name('Smoothing Window')
            .onChange(() => this.updateAnalysisSettings(analysisSettings));
            
        analysisFolder.add(analysisSettings, 'peakThreshold', 0.1, 2.0, 0.1)
            .name('Peak Threshold')
            .onChange(() => this.updateAnalysisSettings(analysisSettings));
            
        analysisFolder.add(analysisSettings, 'minPeakDistance', 5, 50, 1)
            .name('Min Peak Distance')
            .onChange(() => this.updateAnalysisSettings(analysisSettings));
            
        analysisFolder.add(analysisSettings, 'speedCalculationRadius', 10, 50, 1)
            .name('Speed Calc Radius')
            .onChange(() => this.updateAnalysisSettings(analysisSettings));
            
        analysisFolder.add(analysisSettings, 'maxMoves', 5, 25, 1)
            .name('Max Moves')
            .onChange(() => this.updateAnalysisSettings(analysisSettings));
        
        analysisFolder.open();
        
        // Visual Settings
        const visualFolder = this.gui.addFolder('⚙️ Visual Settings');
        
        visualFolder.add(this.visualizer.settings, 'ringCount', 10, 70, 1)
            .name('Ring Count')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'baseRadius', 1.0, 4.0, 0.1)
            .name('Base Radius')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'ringSpacing', 0.00, 0.15, 0.005)
            .name('Ring Spacing')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'dynamicsMultiplier', 0.5, 8.0, 0.1)
            .name('Dynamics Effect')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'opacity', 0.1, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'radiusMultiplier', 0.5, 3.0, 0.1)
            .name('Overall Size')
            .onChange(() => this.updateVisualization());
            
        visualFolder.open();
        
        // Dynamic Effects Settings
        const effectsFolder = this.gui.addFolder('🌊 Dynamic Effects');
        
        effectsFolder.add(this.visualizer.settings, 'organicNoise', 0.0, 1.0, 0.05)
            .name('Organic Noise')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'cruxEmphasis', 0.5, 3.0, 0.1)
            .name('Crux Emphasis')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'moveEmphasis', 0.0, 10.0, 0.1)
            .name('Move Emphasis (All)')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'waveComplexity', 0.5, 4.0, 0.1)
            .name('Wave Complexity')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'depthEffect', 0.0, 2.0, 0.1)
            .name('3D Depth Effect')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'centerFade', 0.0, 1.0, 0.05)
            .name('Center Fade (Slab)')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.open();
        
        // Move Segments Settings
        const segmentsFolder = this.gui.addFolder('🍕 Move Segments');
        
        segmentsFolder.add(this.visualizer.settings, 'showMoveSegments')
            .name('Show Move Segments')
            .onChange(() => this.updateVisualization());
            
        segmentsFolder.add(this.visualizer.settings, 'segmentOpacity', 0.0, 0.5, 0.01)
            .name('Segment Opacity')
            .onChange(() => this.updateVisualization());
            
        segmentsFolder.add(this.visualizer.settings, 'segmentGap', 0.0, 0.2, 0.01)
            .name('Gap Between Segments')
            .onChange(() => this.updateVisualization());
            
        segmentsFolder.open();
        
        // Move Lines Settings
        const linesFolder = this.gui.addFolder('📍 Move Lines');
        
        linesFolder.add(this.visualizer.settings, 'showMoveLines')
            .name('Show Move Lines')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'lineLength', 1.0, 6.0, 0.1)
            .name('Line Length')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'lineOpacity', 0.0, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'dotSize', 0.02, 0.2, 0.01)
            .name('Dot Size')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'dotOpacity', 0.0, 1.0, 0.05)
            .name('Dot Opacity')
            .onChange(() => this.updateVisualization());
            
        linesFolder.open();
        
        // Attempt Visualization Settings
        const attemptsFolder = this.gui.addFolder('🎯 Attempt Visualization');
        
        attemptsFolder.add(this.visualizer.settings, 'showAttempts')
            .name('Show Attempts')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'maxAttempts', 10, 200, 5)
            .name('Number of Attempts')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptOpacity', 0.0, 1.0, 0.05)
            .name('Attempt Opacity')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptWaviness', 0.001, 0.2, 0.001)
            .name('Line Waviness')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptFadeStrength', 0.0, 2.0, 0.1)
            .name('Multiple Try Effect')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptThickness', 0.1, 5.0, 0.1)
            .name('Line Thickness')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptIntensity', 0.5, 3.0, 0.1)
            .name('Visual Intensity')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptRadius', 0.5, 2.0, 0.1)
            .name('Max Radius')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.open();
        
        // Camera Controls
        const cameraFolder = this.gui.addFolder('📷 Camera');
        
        const cameraControls = {
            resetView: () => this.resetCamera(),
            topView: () => this.setTopView(),
            sideView: () => this.setSideView()
        };
        
        cameraFolder.add(cameraControls, 'resetView').name('🔄 Reset View');
        cameraFolder.add(cameraControls, 'topView').name('⬆️ Top View');
        cameraFolder.add(cameraControls, 'sideView').name('➡️ Side View');
        
        cameraFolder.open();
        
        // Load initial boulder
        this.loadBoulder(this.currentBoulderId);
        
        // Setup keyboard controls
        this.setupKeyboardControls();
        
        // Style the GUI
        this.styleGUI();
    }
    
    async loadBoulder(boulderId) {
        try {
            console.log('Loading boulder with ID:', boulderId);
            
            // Show loading state
            this.showLoadingState(true);
            
            // Load boulder data (now async)
            const boulder = await getBoulderById(boulderId);
            
            if (boulder) {
                console.log('Boulder loaded successfully:', boulder.name);
                console.log('Boulder moves:', boulder.moves?.length || 0);
                
                // Load into visualizer
                this.visualizer.loadBoulder(boulder);
                
                // Update boulder info display
                this.updateBoulderInfo(boulder);
                
                // Update DataViz integration if available
                if (this.dataVizIntegration && boulder.type === 'csv') {
                    console.log('Updating DataViz integration with boulder data');
                    this.dataVizIntegration.updateWithBoulderData(boulder);
                }
                
            } else {
                console.error('Failed to load boulder with ID:', boulderId);
                this.showError('Failed to load boulder data');
            }
            
        } catch (error) {
            console.error('Error loading boulder:', error);
            this.showError(`Error loading boulder: ${error.message}`);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    updateAnalysisSettings(settings) {
        console.log('Updating analysis settings:', settings);
        
        // Debounce updates to avoid too frequent reprocessing
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            updateAnalyzerSettings(settings);
            // Reload current boulder with new settings
            this.loadBoulder(this.currentBoulderId);
        }, 500);
    }
    
    async generateRandomBoulder() {
        try {
            console.log('Generating random boulder...');
            this.showLoadingState(true);
            
            const randomBoulder = await generateRandomBoulder();
            
            if (randomBoulder) {
                console.log('Random boulder generated:', randomBoulder.name);
                
                // Update the dropdown selection
                this.currentBoulderId = randomBoulder.id;
                this.boulderSelection.boulder = randomBoulder.id;
                
                // Update the GUI dropdown
                this.gui.updateDisplay();
                
                // Load the boulder
                this.visualizer.loadBoulder(randomBoulder);
                this.updateBoulderInfo(randomBoulder);
                
                if (this.dataVizIntegration && randomBoulder.type === 'csv') {
                    this.dataVizIntegration.updateWithBoulderData(randomBoulder);
                }
            }
            
        } catch (error) {
            console.error('Error generating random boulder:', error);
            this.showError(`Error generating random boulder: ${error.message}`);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    updateBoulderInfo(boulder) {
        // Create or update boulder info display
        let infoElement = document.getElementById('boulder-info');
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.id = 'boulder-info';
            infoElement.style.cssText = `
                position: fixed;
                top: 80px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ffcc;
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #00ffcc;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 999;
                max-width: 300px;
            `;
            document.body.appendChild(infoElement);
        }
        
        const moveCount = boulder.moves?.length || 0;
        const analysisInfo = boulder.analysisMetadata ? `
            <div style="margin-top: 10px; font-size: 12px; color: #888;">
                <strong>Analysis:</strong><br>
                • Data Points: ${boulder.rawDataPoints || 'N/A'}<br>
                • Detected Peaks: ${boulder.analysisMetadata.detectedPeaks || 'N/A'}<br>
                • Processed Moves: ${boulder.analysisMetadata.processedMoves || 'N/A'}
            </div>
        ` : '';
        
        infoElement.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #00ffcc;">${boulder.name}</h3>
            <div><strong>Grade:</strong> ${boulder.grade}</div>
            <div><strong>Type:</strong> ${boulder.type === 'csv' ? 'Real Sensor Data' : 'Mock Data'}</div>
            <div><strong>Moves:</strong> ${moveCount}</div>
            <div style="margin-top: 8px; font-size: 12px;">${boulder.description}</div>
            ${analysisInfo}
        `;
    }
    
    showLoadingState(isLoading) {
        let loadingElement = document.getElementById('boulder-loading');
        if (isLoading) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'boulder-loading';
                loadingElement.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: #00ffcc;
                    padding: 20px;
                    border-radius: 10px;
                    border: 2px solid #00ffcc;
                    font-family: Arial, sans-serif;
                    z-index: 1001;
                    text-align: center;
                `;
                document.body.appendChild(loadingElement);
            }
            loadingElement.innerHTML = `
                <div style="font-size: 18px; margin-bottom: 10px;">🔬 Analyzing Climbing Data...</div>
                <div style="font-size: 14px;">Processing acceleration data and detecting moves</div>
            `;
            loadingElement.style.display = 'block';
        } else {
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    }
    
    showError(message) {
        let errorElement = document.getElementById('boulder-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'boulder-error';
            errorElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(139, 0, 0, 0.9);
                color: #fff;
                padding: 20px;
                border-radius: 10px;
                border: 2px solid #ff4444;
                font-family: Arial, sans-serif;
                z-index: 1002;
                text-align: center;
                max-width: 400px;
            `;
            document.body.appendChild(errorElement);
        }
        
        errorElement.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 10px;">⚠️ Error</div>
            <div style="font-size: 14px; margin-bottom: 15px;">${message}</div>
            <button onclick="document.getElementById('boulder-error').style.display='none'" 
                    style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        `;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, 5000);
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'r':
                case 'R':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.generateRandomBoulder();
                        event.preventDefault();
                    }
                    break;
                case 'c':
                case 'C':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.resetCamera();
                        event.preventDefault();
                    }
                    break;
                case '1':
                    this.setTopView();
                    event.preventDefault();
                    break;
                case '2':
                    this.setSideView();
                    event.preventDefault();
                    break;
                case '3':
                    this.resetCamera();
                    event.preventDefault();
                    break;
            }
        });
    }
    
    updateVisualization() {
        // Debounce updates for better performance
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this.visualizer.updateSettings(this.visualizer.settings);
        }, 100);
    }
    
    resetCamera() {
        this.visualizer.camera.position.set(0, 0, 15);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    setTopView() {
        this.visualizer.camera.position.set(0, 15, 0);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    setSideView() {
        this.visualizer.camera.position.set(15, 0, 0);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    styleGUI() {
        // Enhanced GUI styling
        const guiElement = this.gui.domElement;
        guiElement.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 1000 !important;
            background: rgba(0, 0, 0, 0.9) !important;
            border: 2px solid #00ffcc !important;
            border-radius: 10px !important;
            box-shadow: 0 0 20px rgba(0, 255, 204, 0.3) !important;
            font-family: 'Courier New', monospace !important;
        `;
        
        // Style folder titles
        const folders = guiElement.querySelectorAll('.folder .title');
        folders.forEach(folder => {
            folder.style.cssText += `
                background: linear-gradient(90deg, #00ffcc, #0099aa) !important;
                color: #000 !important;
                font-weight: bold !important;
                text-shadow: none !important;
            `;
        });
        
        // Style controls
        const controls = guiElement.querySelectorAll('.controller');
        controls.forEach(control => {
            control.style.cssText += `
                border-bottom: 1px solid rgba(0, 255, 204, 0.2) !important;
            `;
        });
        
        // Style property names
        const propertyNames = guiElement.querySelectorAll('.property-name');
        propertyNames.forEach(name => {
            name.style.cssText += `
                color: #00ffcc !important;
                text-shadow: 0 0 5px rgba(0, 255, 204, 0.5) !important;
            `;
        });
    }
    
    destroy() {
        if (this.gui) {
            this.gui.destroy();
        }
        
        // Clean up info elements
        const infoElement = document.getElementById('boulder-info');
        if (infoElement) {
            infoElement.remove();
        }
        
        const loadingElement = document.getElementById('boulder-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        const errorElement = document.getElementById('boulder-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    show() {
        if (this.gui) {
            this.gui.domElement.style.display = 'block';
        }
        
        const infoElement = document.getElementById('boulder-info');
        if (infoElement) {
            infoElement.style.display = 'block';
        }
    }
    
    hide() {
        if (this.gui) {
            this.gui.domElement.style.display = 'none';
        }
        
        const infoElement = document.getElementById('boulder-info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }
} 