import { BoulderVisualizer } from './visualizer/BoulderVisualizer.js';
import { BoulderControlPanel } from './controls/BoulderControlPanel.js';
import { getBoulderById } from './data/boulderData.js';

class BoulderVisualizerApp {
    constructor() {
        this.container = document.getElementById('container');
        this.loadingElement = document.getElementById('loading');
        this.visualizer = null;
        this.controlPanel = null;
        this.currentBoulder = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading
            this.showLoading('Initializing 3D boulder visualizer...');
            
            // Initialize visualizer
            this.visualizer = new BoulderVisualizer(this.container);
            
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
        this.controlPanel = new BoulderControlPanel(this.visualizer);
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
            max-width: 450px;
        `;
        
        welcome.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #00ffcc;">🧗‍♂️ Boulder Visualizer Ready!</h2>
            <p style="margin: 0 0 15px 0; color: #cccccc;">
                Visualize boulder problems with liquid-like concentric rings.<br>
                Each ring shows the move sequence and dynamics.
            </p>
            <p style="margin: 0 0 20px 0; color: #cccccc; font-size: 14px;">
                • <span style="color: #00ffcc;">Turquoise</span> = Crux moves<br>
                • <span style="color: #ffffff;">White</span> = Normal moves<br>
                • Spikes = Dynamic/powerful moves<br>
                • Center = Grade with color coding<br>
                • Use controls to change boulders & settings
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
        
        // Auto-remove after 12 seconds
        setTimeout(() => {
            if (welcome.parentNode) {
                welcome.remove();
            }
        }, 12000);
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
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.boulderApp = new BoulderVisualizerApp();
});

// Handle page visibility changes to pause/resume animation
document.addEventListener('visibilitychange', () => {
    if (window.boulderApp && window.boulderApp.visualizer) {
        if (document.hidden) {
            // Page is hidden, could pause animation here if needed
        } else {
            // Page is visible again
        }
    }
});

// Export for potential external use
export { BoulderVisualizerApp }; 