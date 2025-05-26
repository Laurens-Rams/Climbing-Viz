import * as dat from 'dat.gui';
import { getBoulderList, getBoulderById, generateRandomBoulder } from '../data/boulderData.js';

export class BoulderControlPanel {
    constructor(visualizer) {
        this.visualizer = visualizer;
        this.gui = new dat.GUI();
        this.currentBoulderId = 1; // Default to first boulder
        this.setupControls();
    }
    
    setupControls() {
        // Boulder Selection
        const boulderFolder = this.gui.addFolder('🧗 Boulder Selection');
        
        const boulderList = getBoulderList();
        console.log('Available boulders:', boulderList);
        const boulderNames = {};
        boulderList.forEach(boulder => {
            boulderNames[`${boulder.name} (${boulder.grade})`] = boulder.id;
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
        
        // Color Settings
        const colorFolder = this.gui.addFolder('🎨 Colors');
        
        // Convert hex colors to RGB for dat.GUI
        const colorSettings = {
            cruxColor: this.hexToRgb(this.visualizer.colors.cruxMove),
            normalColor: this.hexToRgb(this.visualizer.colors.normalMove),
            v1Color: this.hexToRgb(this.visualizer.colors.gradeColors.V1),
            v4Color: this.hexToRgb(this.visualizer.colors.gradeColors.V4),
            v7Color: this.hexToRgb(this.visualizer.colors.gradeColors.V7),
            v9Color: this.hexToRgb(this.visualizer.colors.gradeColors.V9)
        };
        
        colorFolder.addColor(colorSettings, 'cruxColor')
            .name('Crux Moves (Turquoise)')
            .onChange((color) => {
                this.visualizer.colors.cruxMove = this.rgbToHex(color);
                this.updateVisualization();
            });
            
        colorFolder.addColor(colorSettings, 'normalColor')
            .name('Normal Moves (White)')
            .onChange((color) => {
                this.visualizer.colors.normalMove = this.rgbToHex(color);
                this.updateVisualization();
            });
            
        colorFolder.addColor(colorSettings, 'v1Color')
            .name('V1 Grade (Green)')
            .onChange((color) => {
                this.visualizer.colors.gradeColors.V1 = this.rgbToHex(color);
                this.updateVisualization();
            });
            
        colorFolder.addColor(colorSettings, 'v4Color')
            .name('V4 Grade (Yellow)')
            .onChange((color) => {
                this.visualizer.colors.gradeColors.V4 = this.rgbToHex(color);
                this.updateVisualization();
            });
            
        colorFolder.addColor(colorSettings, 'v7Color')
            .name('V7 Grade (Red)')
            .onChange((color) => {
                this.visualizer.colors.gradeColors.V7 = this.rgbToHex(color);
                this.updateVisualization();
            });
            
        colorFolder.addColor(colorSettings, 'v9Color')
            .name('V9 Grade (Magenta)')
            .onChange((color) => {
                this.visualizer.colors.gradeColors.V9 = this.rgbToHex(color);
                this.updateVisualization();
            });
            
        colorFolder.open();
        
        // Visual Settings
        const visualFolder = this.gui.addFolder('⚙️ Visual Settings');
        
        visualFolder.add(this.visualizer.settings, 'ringCount', 10, 70, 1)
            .name('Ring Count')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'baseRadius', 1.0, 4.0, 0.1)
            .name('Base Radius')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'ringSpacing', 0.02, 0.15, 0.01)
            .name('Ring Spacing')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'dynamicsMultiplier', 0.5, 8.0, 0.1)
            .name('Dynamics Effect')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'opacity', 0.1, 1.0, 0.05)
            .name('Line Opacity')
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
        
        // Liquid Effect Settings
        const liquidFolder = this.gui.addFolder('🌊 Liquid Effect');
        
        liquidFolder.add(this.visualizer.settings, 'liquidEffect')
            .name('Enable Liquid Effect')
            .onChange(() => this.updateVisualization());
            
        // Advanced liquid settings could go here
        
        liquidFolder.open();
        
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
        
        // Info Display
        const infoFolder = this.gui.addFolder('ℹ️ Boulder Info');
        
        this.boulderInfo = {
            name: '',
            grade: '',
            moveCount: 0,
            cruxMoves: 0,
            avgDynamics: 0
        };
        
        infoFolder.add(this.boulderInfo, 'name').name('Name').listen();
        infoFolder.add(this.boulderInfo, 'grade').name('Grade').listen();
        infoFolder.add(this.boulderInfo, 'moveCount').name('Move Count').listen();
        infoFolder.add(this.boulderInfo, 'cruxMoves').name('Crux Moves').listen();
        infoFolder.add(this.boulderInfo, 'avgDynamics').name('Avg Dynamics').listen();
        
        infoFolder.open();
        
        // Load initial boulder
        this.loadBoulder(this.currentBoulderId);
        
        // Style the GUI
        this.styleGUI();
    }
    
    loadBoulder(boulderId) {
        console.log('Loading boulder with ID:', boulderId, 'Type:', typeof boulderId);
        
        // Convert to number if it's a string
        const numericId = typeof boulderId === 'string' ? parseInt(boulderId) : boulderId;
        console.log('Converted ID:', numericId, 'Type:', typeof numericId);
        
        const boulder = getBoulderById(numericId);
        console.log('Found boulder:', boulder);
        if (boulder) {
            this.currentBoulderId = numericId;
            this.boulderSelection.boulder = numericId; // Sync the dropdown
            this.visualizer.loadBoulder(boulder);
            this.updateBoulderInfo(boulder);
            console.log('Boulder loaded successfully');
        } else {
            console.error('Boulder not found for ID:', numericId);
        }
    }
    
    generateRandomBoulder() {
        const randomBoulder = generateRandomBoulder();
        this.visualizer.loadBoulder(randomBoulder);
        this.updateBoulderInfo(randomBoulder);
    }
    
    updateBoulderInfo(boulder) {
        this.boulderInfo.name = boulder.name;
        this.boulderInfo.grade = boulder.grade;
        this.boulderInfo.moveCount = boulder.moves.length;
        this.boulderInfo.cruxMoves = boulder.moves.filter(move => move.isCrux).length;
        this.boulderInfo.avgDynamics = Math.round(
            boulder.moves.reduce((sum, move) => sum + move.dynamics, 0) / boulder.moves.length * 100
        ) / 100;
    }
    
    updateVisualization() {
        this.visualizer.updateSettings(this.visualizer.settings);
        this.visualizer.updateColors(this.visualizer.colors);
    }
    
    resetCamera() {
        this.visualizer.camera.position.set(0, 0, 15);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    setTopView() {
        this.visualizer.camera.position.set(0, 0, 20);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    setSideView() {
        this.visualizer.camera.position.set(20, 0, 0);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    // Color conversion utilities
    hexToRgb(hex) {
        const result = /^0x([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.toString(16).padStart(8, '0'));
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [255, 255, 255];
    }
    
    rgbToHex(rgb) {
        return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
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
                background: rgba(0, 255, 204, 0.2) !important;
                border-bottom: 1px solid #333 !important;
                color: #00ffcc !important;
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
                background: #00ffcc !important;
            }
            
            .dg .c select {
                background: #1a1a1a !important;
                color: #ffffff !important;
                border: 1px solid #333 !important;
            }
            
            .dg .button {
                background: #00ffcc !important;
                color: #000000 !important;
                border: none !important;
                border-radius: 4px !important;
                font-weight: bold !important;
            }
            
            .dg .button:hover {
                background: #00cc99 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    destroy() {
        this.gui.destroy();
    }
} 