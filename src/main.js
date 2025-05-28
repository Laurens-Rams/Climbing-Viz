console.log('main.js file started executing');

import { BoulderVisualizer } from './visualizer/BoulderVisualizer.js';
import { BoulderControlPanel } from './controls/BoulderControlPanel.js';
import { getBoulderById } from './data/boulderData.js';
import { DataVizIntegration } from './visualizer/DataVizIntegration.js';

console.log('main.js imports completed');

class BoulderVisualizerApp {
    constructor() {
        console.log('BoulderVisualizerApp constructor started');
        
        try {
            this.container = document.getElementById('container');
            console.log('Container element:', this.container);
            
            this.loadingElement = document.getElementById('loading');
            console.log('Loading element:', this.loadingElement);
            
            this.visualizer = null;
            this.controlPanel = null;
            this.dataVizIntegration = null;
            this.currentBoulder = null;
            this.currentView = 'boulder'; // 'boulder' or 'dataviz'
            
            // Global state management
            this.globalState = {
                selectedBoulderId: 1,
                autoUpdateEnabled: true,
                lastUpdateTime: Date.now()
            };
            
            // Event listeners for cross-view communication
            this.setupGlobalEventListeners();
            
            console.log('BoulderVisualizerApp properties initialized, calling init()');
            this.init();
        } catch (error) {
            console.error('Error in BoulderVisualizerApp constructor:', error);
            throw error;
        }
    }
    
    async init() {
        try {
            console.log('BoulderVisualizerApp.init() started');
            
            // Show loading
            this.showLoading('Initializing climbing visualizer...');
            console.log('Loading message shown');
            
            // Create tab system
            console.log('Creating tab system...');
            this.createTabSystem();
            console.log('Tab system created');
            
            // Initialize boulder visualizer
            console.log('Initializing boulder visualizer...');
            this.visualizer = new BoulderVisualizer(this.container);
            console.log('Boulder visualizer created');
            
            // Initialize DataViz integration
            console.log('Initializing DataViz integration...');
            this.dataVizIntegration = new DataVizIntegration(this.container);
            console.log('DataViz integration created');
            
            // Load initial boulder
            this.showLoading('Loading acceleration data...');
            console.log('Loading initial boulder...');
            await this.loadInitialBoulder();
            console.log('Initial boulder loaded');
            
            // Setup control panel
            this.showLoading('Setting up controls...');
            console.log('Setting up controls...');
            await this.setupControls();
            console.log('Controls set up');
            
            // Start the visualization
            this.showLoading('Starting visualization...');
            console.log('Starting visualization...');
            this.visualizer.start();
            console.log('Visualization started');
            
            // Hide loading
            this.hideLoading();
            console.log('Loading hidden');
            
            console.log('BoulderVisualizerApp.init() completed successfully');
            
        } catch (error) {
            console.error('Failed to initialize boulder visualizer:', error);
            console.error('Error stack:', error.stack);
            this.showError('Failed to load the visualization. Please refresh the page.');
            throw error;
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
        boulderTab.className = 'tab-button';
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
        dataVizTab.className = 'tab-button';
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
        
        // Add keyboard controls
        this.setupKeyboardControls();
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
            
            // Auto-reload the boulder visualization when switching back
            if (this.currentBoulder && this.visualizer) {
                console.log('Auto-reloading boulder visualization on view switch');
                this.visualizer.loadBoulder(this.currentBoulder);
            }
            
            // Ensure Three.js renderer is properly resized after showing (immediate)
            if (this.visualizer && this.visualizer.renderer) {
                this.visualizer.renderer.setSize(window.innerWidth, window.innerHeight);
                this.visualizer.camera.aspect = window.innerWidth / window.innerHeight;
                this.visualizer.camera.updateProjectionMatrix();
                console.log('Boulder visualizer renderer resized');
            }
            
        } else if (view === 'dataviz') {
            // Show DataViz (instant switch)
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
                    try {
                        await this.dataVizIntegration.updateWithBoulderData(this.currentBoulder);
                    } catch (dataVizError) {
                        console.error('Error updating DataViz integration:', dataVizError);
                        // Don't fail the entire load for DataViz errors
                    }
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
    
    // Debug function to check current state
    async debugBoulderState() {
        console.log('=== Boulder State Debug ===');
        try {
            const { debugBoulderState, getBoulderList } = await import('./data/boulderData.js');
            const state = debugBoulderState();
            const boulderList = await getBoulderList();
            
            console.log('Boulder State:', state);
            console.log('Available Boulders:', boulderList);
            console.log('Current Boulder:', this.currentBoulder?.name || 'None');
            
            return { state, boulderList, currentBoulder: this.currentBoulder };
        } catch (error) {
            console.error('Debug error:', error);
            return { error: error.message };
        }
    }
    
    setupGlobalEventListeners() {
        // Listen for boulder selection changes from any component
        document.addEventListener('boulderSelectionChanged', (event) => {
            const { boulderId, source } = event.detail;
            console.log(`Global boulder selection changed to ${boulderId} from ${source}`);
            this.syncBoulderSelection(boulderId, source);
        });
        
        // Listen for control changes that should trigger auto-reload
        document.addEventListener('controlChanged', (event) => {
            const { source, controlName, value } = event.detail;
            console.log(`Control changed: ${controlName} = ${value} from ${source}`);
            if (this.globalState.autoUpdateEnabled) {
                this.handleControlChange(source, controlName, value);
            }
        });
        
        // Listen for data updates that should sync between views
        document.addEventListener('dataUpdated', (event) => {
            const { source, data } = event.detail;
            console.log(`Data updated from ${source}`);
            if (this.globalState.autoUpdateEnabled) {
                this.syncDataBetweenViews(source, data);
            }
        });
    }
    
    async syncBoulderSelection(boulderId, source) {
        if (this.globalState.selectedBoulderId === boulderId) {
            return; // Already selected
        }
        
        this.globalState.selectedBoulderId = boulderId;
        this.globalState.lastUpdateTime = Date.now();
        
        // Show sync notification
        this.showNotification(`Syncing boulder selection across views...`, 'sync');
        
        try {
            // Load the boulder data
            const boulder = await getBoulderById(boulderId);
            if (boulder) {
                this.currentBoulder = boulder;
                
                // Update both views (except the source)
                if (source !== 'boulder' && this.visualizer) {
                    console.log('Syncing boulder to visualizer');
                    this.visualizer.loadBoulder(boulder);
                }
                
                if (source !== 'dataviz' && this.dataVizIntegration) {
                    console.log('Syncing boulder to DataViz');
                    this.dataVizIntegration.syncCSVSelection(boulderId);
                    await this.dataVizIntegration.updateWithBoulderData(boulder);
                }
                
                // Update control panel if it wasn't the source
                if (source !== 'controlPanel' && this.controlPanel) {
                    console.log('Syncing boulder to control panel');
                    this.controlPanel.syncBoulderSelection(boulderId);
                }
                
                // Show success notification
                setTimeout(() => {
                    this.showNotification(`✅ Synced to: ${boulder.name}`, 'success');
                }, 500);
            }
        } catch (error) {
            console.error('Error syncing boulder selection:', error);
            this.showNotification('❌ Sync failed: ' + error.message, 'error');
        }
    }
    
    handleControlChange(source, controlName, value) {
        console.log(`Handling control change: ${controlName} from ${source}`);
        
        // Show control change notification
        this.showNotification(`🎛️ ${controlName} changed - auto-reloading...`, 'sync');
        
        // If change is from boulder controls, auto-reload the visualization
        if (source === 'boulder' && this.visualizer) {
            setTimeout(() => {
                console.log('Auto-reloading boulder visualization due to control change');
                this.visualizer.updateSettings(this.visualizer.settings);
            }, 100); // Small delay to allow control to update
        }
        
        // If change is from DataViz, update the boulder view
        if (source === 'dataviz' && this.visualizer && this.currentBoulder) {
            setTimeout(() => {
                console.log('Auto-updating boulder view due to DataViz change');
                this.visualizer.loadBoulder(this.currentBoulder);
            }, 100);
        }
    }
    
    async syncDataBetweenViews(source, data) {
        console.log(`Syncing data between views from ${source}`);
        
        if (source === 'dataviz' && this.visualizer && data.boulder) {
            // DataViz updated, sync to boulder view
            console.log('Syncing DataViz changes to boulder view');
            this.visualizer.loadBoulder(data.boulder);
        }
        
        if (source === 'boulder' && this.dataVizIntegration && data.boulder) {
            // Boulder view updated, sync to DataViz
            console.log('Syncing boulder changes to DataViz');
            await this.dataVizIntegration.updateWithBoulderData(data.boulder);
        }
    }
    
    toggleUI() {
        // Toggle control panel visibility
        if (this.controlPanel) {
            const guiElement = this.controlPanel.gui.domElement;
            const isVisible = guiElement.style.display !== 'none';
            
            if (isVisible) {
                this.controlPanel.hide();
                this.hideUIElements();
                this.showNotification('UI Hidden - Press O to show', 'info');
            } else {
                this.controlPanel.show();
                this.showUIElements();
                this.showNotification('UI Shown - Press O to hide', 'info');
            }
        }
    }
    
    hideUIElements() {
        // Hide tab container
        if (this.tabContainer) {
            this.tabContainer.style.display = 'none';
        }
        
        // Hide info panel
        const infoElement = document.getElementById('info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
        
        // Hide stats panel
        const statsElement = document.getElementById('stats');
        if (statsElement) {
            statsElement.style.display = 'none';
        }
        
        // Hide boulder info
        const boulderInfoElement = document.getElementById('boulder-info');
        if (boulderInfoElement) {
            boulderInfoElement.style.display = 'none';
        }
    }
    
    showUIElements() {
        // Show tab container
        if (this.tabContainer) {
            this.tabContainer.style.display = 'flex';
        }
        
        // Show info panel
        const infoElement = document.getElementById('info');
        if (infoElement) {
            infoElement.style.display = 'block';
        }
        
        // Show stats panel
        const statsElement = document.getElementById('stats');
        if (statsElement) {
            statsElement.style.display = 'block';
        }
        
        // Show boulder info
        const boulderInfoElement = document.getElementById('boulder-info');
        if (boulderInfoElement) {
            boulderInfoElement.style.display = 'block';
        }
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.global-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'global-notification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1005;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;

        const colors = {
            success: 'rgba(40, 167, 69, 0.95)',
            error: 'rgba(220, 53, 69, 0.95)',
            info: 'rgba(23, 162, 184, 0.95)',
            sync: 'rgba(255, 193, 7, 0.95)'
        };

        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }
    
    // Add keyboard controls
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // Only handle if not typing in an input field
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key.toLowerCase()) {
                case 'o':
                    this.toggleUI();
                    event.preventDefault();
                    break;
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Boulder Visualizer App...');
    
    try {
        window.app = new BoulderVisualizerApp();
        console.log('BoulderVisualizerApp instance created successfully');
    } catch (error) {
        console.error('Failed to create BoulderVisualizerApp:', error);
        console.error('Error stack:', error.stack);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(139, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #ff4444;
            font-family: Arial, sans-serif;
            z-index: 10000;
            max-width: 500px;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h3>Application Failed to Load</h3>
            <p>Error: ${error.message}</p>
            <p style="font-size: 12px; margin-top: 10px;">Check browser console for details</p>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    console.error('Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    console.error('Promise:', event.promise);
});

// Export for global access if needed
window.BoulderVisualizerApp = BoulderVisualizerApp; 