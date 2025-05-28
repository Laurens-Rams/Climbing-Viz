import { BoulderVisualizer } from './visualizer/BoulderVisualizer.js';
import { BoulderControlPanel } from './controls/BoulderControlPanel.js';
import { getBoulderById } from './data/boulderData.js';
import { DataVizIntegration } from './visualizer/DataVizIntegration.js';

class BoulderVisualizerApp {
    constructor() {
        this.container = document.getElementById('container');
        this.loadingElement = document.getElementById('loading');
        this.visualizer = null;
        this.controlPanel = null;
        this.dataVizIntegration = null;
        this.currentBoulder = null;
        this.currentView = 'boulder'; // 'boulder' or 'dataviz'
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading
            this.showLoading('Initializing climbing visualizer...');
            
            // Create tab system
            this.createTabSystem();
            
            // Initialize boulder visualizer
            this.visualizer = new BoulderVisualizer(this.container);
            
            // Initialize DataViz integration
            this.dataVizIntegration = new DataVizIntegration(this.container);
            
            // Load initial boulder
            this.showLoading('Loading boulder data...');
            await this.loadInitialBoulder();
            
            // Setup control panel
            this.showLoading('Setting up controls...');
            this.setupControls();
            
            // Start the visualization
            this.showLoading('Starting visualization...');
            this.visualizer.start();
            
            // Hide loading
            this.hideLoading();
            
            // Show welcome message
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Failed to initialize boulder visualizer:', error);
            this.showError('Failed to load the visualization. Please refresh the page.');
        }
    }
    
    createTabSystem() {
        // Create tab container
        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 10px;
            padding: 5px;
            gap: 5px;
        `;
        
        // Create boulder tab
        const boulderTab = document.createElement('button');
        boulderTab.textContent = '🧗‍♂️ Boulder Visualizer';
        boulderTab.style.cssText = `
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            background: #00ffcc;
            color: #000;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        // Create DataViz tab
        const dataVizTab = document.createElement('button');
        dataVizTab.textContent = '📊 Acceleration Data';
        dataVizTab.style.cssText = `
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        // Tab switching logic
        boulderTab.addEventListener('click', () => {
            this.switchToView('boulder');
            boulderTab.style.background = '#00ffcc';
            boulderTab.style.color = '#000';
            dataVizTab.style.background = 'rgba(255, 255, 255, 0.2)';
            dataVizTab.style.color = '#fff';
        });
        
        dataVizTab.addEventListener('click', () => {
            this.switchToView('dataviz');
            dataVizTab.style.background = '#00ffcc';
            dataVizTab.style.color = '#000';
            boulderTab.style.background = 'rgba(255, 255, 255, 0.2)';
            boulderTab.style.color = '#fff';
        });
        
        tabContainer.appendChild(boulderTab);
        tabContainer.appendChild(dataVizTab);
        document.body.appendChild(tabContainer);
        
        this.tabContainer = tabContainer;
        this.boulderTab = boulderTab;
        this.dataVizTab = dataVizTab;
    }
    
    switchToView(view) {
        this.currentView = view;
        
        if (view === 'boulder') {
            // Show boulder visualizer
            this.container.style.display = 'block';
            this.dataVizIntegration.hide();
            if (this.controlPanel) {
                this.controlPanel.show();
            }
            
            // Refresh the boulder visualizer with latest acceleration data
            if (this.currentBoulder && this.visualizer) {
                console.log('Refreshing boulder visualizer with acceleration data');
                this.visualizer.updateDynamicsFromAcceleration();
                this.visualizer.createVisualization();
            }
        } else if (view === 'dataviz') {
            // Show DataViz
            this.container.style.display = 'none';
            this.dataVizIntegration.show();
            if (this.controlPanel) {
                this.controlPanel.hide();
            }
        }
    }
    
    async loadInitialBoulder() {
        return new Promise((resolve) => {
            // Simulate loading time for better UX
            setTimeout(() => {
                this.currentBoulder = getBoulderById(1); // Load first boulder
                if (this.currentBoulder) {
                    this.visualizer.loadBoulder(this.currentBoulder);
                    console.log('Loaded initial boulder:', this.currentBoulder);
                }
                resolve();
            }, 500);
        });
    }
    
    setupControls() {
        this.controlPanel = new BoulderControlPanel(this.visualizer, this.dataVizIntegration);
        
        // Set up boulder change listener
        this.controlPanel.onBoulderChange = (boulder) => {
            this.updateCurrentBoulder(boulder);
        };
    }
    
    updateCurrentBoulder(boulder) {
        this.currentBoulder = boulder;
        
        // Notify DataViz integration if it exists
        if (this.dataVizIntegration) {
            this.dataVizIntegration.updateFromMainApp(boulder);
        }
        
        console.log('Current boulder updated:', boulder.name);
    }
    
    showLoading(message = 'Loading...') {
        this.loadingElement.textContent = message;
        this.loadingElement.classList.remove('hidden');
    }
    
    hideLoading() {
        this.loadingElement.classList.add('hidden');
    }
    
    showError(message) {
        this.loadingElement.textContent = message;
        this.loadingElement.style.color = '#ff4444';
        this.loadingElement.classList.remove('hidden');
    }
    
    showWelcomeMessage() {
        // Create a temporary welcome overlay
        const welcome = document.createElement('div');
        welcome.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #00ffcc;
            padding: 30px;
            border-radius: 15px;
            border: 2px solid #00ffcc;
            text-align: center;
            z-index: 1000;
            font-family: Arial, sans-serif;
            max-width: 500px;
        `;
        
        welcome.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #00ffcc;">🧗‍♂️ Climbing Visualizer Ready!</h2>
            <p style="margin: 0 0 15px 0; color: #cccccc;">
                Two visualization modes available:<br>
                <strong>Boulder Visualizer:</strong> Liquid-like concentric rings<br>
                <strong>Acceleration Data:</strong> Real sensor data analysis
            </p>
            <p style="margin: 0 0 15px 0; color: #cccccc; font-size: 14px;">
                • <span style="color: #00ffcc;">Turquoise</span> = Crux moves<br>
                • <span style="color: #ffffff;">White</span> = Normal moves<br>
                • Spikes = Dynamic/powerful moves<br>
                • Switch tabs to explore both views<br>
                • Upload CSV files for real data analysis
            </p>
            <button id="start-exploring" style="
                background: #00ffcc;
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-weight: bold;
                cursor: pointer;
                font-size: 16px;
            ">Start Exploring</button>
        `;
        
        document.body.appendChild(welcome);
        
        // Remove welcome message when button is clicked
        document.getElementById('start-exploring').addEventListener('click', () => {
            welcome.remove();
        });
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (welcome.parentNode) {
                welcome.remove();
            }
        }, 15000);
    }
    
    // Export boulder data functionality
    exportBoulder() {
        if (this.currentBoulder) {
            const dataStr = JSON.stringify(this.currentBoulder, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `boulder-${this.currentBoulder.name.replace(/\s+/g, '-').toLowerCase()}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
        }
    }
    
    // Import boulder data functionality
    importBoulder(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const boulder = JSON.parse(e.target.result);
                this.currentBoulder = boulder;
                this.visualizer.loadBoulder(boulder);
                console.log('Imported boulder:', boulder);
            } catch (error) {
                console.error('Failed to import boulder:', error);
                alert('Failed to import boulder data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }
    
    // Method to update boulder visualizer with DataViz data
    updateBoulderWithDataVizData(boulder) {
        if (boulder.type === 'csv' && this.dataVizIntegration) {
            // Get move averages from DataViz
            const moveAverages = this.dataVizIntegration.getCurrentMoveAverages();
            const heatmapData = this.dataVizIntegration.getCurrentHeatmapData();
            
            if (moveAverages.length > 0) {
                // Convert DataViz move averages to boulder moves format
                boulder.moves = moveAverages.map(avg => ({
                    sequence: avg.sequence,
                    dynamics: Math.min(avg.average, 1.0), // Normalize to 0-1 range
                    isCrux: avg.average > (heatmapData?.avgAcceleration || 0.5), // Use heatmap for crux detection
                    type: avg.type || (avg.average > 0.7 ? 'dynamic' : 'static'),
                    description: `Move ${avg.sequence} - ${avg.average.toFixed(2)}g`
                }));
                
                console.log('Updated boulder with DataViz data:', boulder);
            }
        }
        
        return boulder;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new BoulderVisualizerApp();
    
    // Expose app globally for DataViz integration
    window.app = app;
});

// Handle page visibility changes to pause/resume animation
document.addEventListener('visibilitychange', () => {
    if (window.app && window.app.visualizer) {
        if (document.hidden) {
            // Page is hidden, could pause animation here if needed
        } else {
            // Page is visible again
        }
    }
});

// Export for potential external use
export { BoulderVisualizerApp }; 