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
            this.showLoading('Loading acceleration data...');
            await this.loadInitialBoulder();
            
            // Setup control panel
            this.showLoading('Setting up controls...');
            await this.setupControls();
            
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
        try {
            console.log('Loading initial boulder...');
            
            // Load first boulder (now async)
            this.currentBoulder = await getBoulderById(1);
            
            if (this.currentBoulder) {
                console.log('Loaded initial boulder:', this.currentBoulder.name);
                console.log('Boulder moves:', this.currentBoulder.moves?.length || 0);
                
                // Load into visualizer
                this.visualizer.loadBoulder(this.currentBoulder);
                
                // Update DataViz integration
                if (this.dataVizIntegration && this.currentBoulder.type === 'csv') {
                    this.dataVizIntegration.updateWithBoulderData(this.currentBoulder);
                }
            } else {
                console.error('Failed to load initial boulder');
                throw new Error('No boulder data available');
            }
            
        } catch (error) {
            console.error('Error loading initial boulder:', error);
            throw error;
        }
    }
    
    async setupControls() {
        this.controlPanel = new BoulderControlPanel(this.visualizer, this.dataVizIntegration);
        // The control panel now handles its own async setup
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
            <p style="margin: 0 0 15px 0; line-height: 1.4;">
                Real acceleration data from CSV files is now being analyzed and visualized.
            </p>
            <div style="font-size: 14px; color: #888; margin-bottom: 20px;">
                <strong>Features:</strong><br>
                • Real-time move detection from CSV acceleration data<br>
                • Dynamic visualization based on climbing intensity<br>
                • Adjustable analysis parameters<br>
                • Switch between Boulder and Data views<br>
                • Support for multiple CSV files (Raw Data.csv, Raw Data1.csv, etc.)
            </div>
            <div style="font-size: 12px; color: #666;">
                <strong>Controls:</strong> R = Random CSV | C = Reset Camera | 1/2/3 = Camera Views
            </div>
            <button onclick="this.parentElement.remove()" 
                    style="margin-top: 20px; background: #00ffcc; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                Start Exploring
            </button>
        `;
        
        document.body.appendChild(welcome);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (welcome.parentElement) {
                welcome.remove();
            }
        }, 8000);
    }
    
    // Export boulder data (for future use)
    exportBoulder() {
        if (!this.currentBoulder) return;
        
        const dataStr = JSON.stringify(this.currentBoulder, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentBoulder.name.replace(/\s+/g, '_')}_boulder_data.json`;
        link.click();
    }
    
    // Import boulder data (for future use)
    importBoulder(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const boulderData = JSON.parse(e.target.result);
                this.visualizer.loadBoulder(boulderData);
                this.currentBoulder = boulderData;
                console.log('Imported boulder:', boulderData.name);
            } catch (error) {
                console.error('Error importing boulder:', error);
                alert('Error importing boulder file');
            }
        };
        reader.readAsText(file);
    }
    
    // Update boulder with DataViz data (for integration)
    updateBoulderWithDataVizData(boulder) {
        if (this.dataVizIntegration) {
            this.dataVizIntegration.updateWithBoulderData(boulder);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Boulder Visualizer App...');
    new BoulderVisualizerApp();
});

// Export for global access if needed
window.BoulderVisualizerApp = BoulderVisualizerApp; 