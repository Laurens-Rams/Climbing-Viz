console.log('main.js file started executing');

import { BoulderVisualizer } from './visualizer/BoulderVisualizer.js';
import { BoulderControlPanel } from './controls/BoulderControlPanel.js';
import { getBoulderById, addBoulderFromRemoteData } from './data/boulderData.js';
import { DataVizIntegration } from './visualizer/DataVizIntegration.js';
import RemoteDataHandler from './data/RemoteDataHandler.js';

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
            this.isRemoteMode = false;
            this.liveDataInitialized = false; // Track if live data mode has been initialized
            this.lastRemoteDataTime = 0; // Track when we last received data
            this.connectionMonitorInterval = null; // For connection monitoring
            this.syncTimeout = null; // For debouncing sync calls
            
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
            
            // Send clear command to all servers on page reload
            await this.clearAllServersOnReload();
            
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
            
            // Initialize remote data handler
            this.remoteHandler = new RemoteDataHandler();
            
            // Set initial server URL (default to first server)
            this.currentServerUrl = 'http://10.237.1.101';
            this.remoteHandler.setRemoteUrl(this.currentServerUrl);
            
            this.setupRemoteHandlers();
            
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
            
            // Setup cross-view synchronization
            this.setupGlobalSync();
            
            console.log('BoulderVisualizerApp.init() completed successfully');
            
        } catch (error) {
            console.error('Failed to initialize boulder visualizer:', error);
            console.error('Error stack:', error.stack);
            this.showError('Failed to load the visualization. Please refresh the page.');
            throw error;
        }
    }
    
    createTabSystem() {
        // Create new comprehensive server control module
        this.createServerControlModule();
        
        // Add CSS for remote button states
        this.addRemoteStyles();
        
        // Add keyboard controls
        this.setupKeyboardControls();
    }
    
    createServerControlModule() {
        // Create main server control container
        const serverControlModule = document.createElement('div');
        serverControlModule.id = 'server-control-module';
        serverControlModule.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 20px;
            background: rgba(0, 0, 0, 0.95);
            border-radius: 15px;
            border: 2px solid rgba(0, 255, 204, 0.4);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
            font-family: Arial, sans-serif;
        `;

        // Backend/Frontend Switch (Left side)
        const modeSection = document.createElement('div');
        modeSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding-right: 15px;
            border-right: 1px solid rgba(0, 255, 204, 0.3);
        `;

        const modeLabel = document.createElement('span');
        modeLabel.textContent = 'Mode:';
        modeLabel.style.cssText = `
            color: #00ffcc;
            font-size: 12px;
            font-weight: bold;
        `;

        const modeSwitch = document.createElement('button');
        modeSwitch.id = 'mode-switch';
        modeSwitch.textContent = 'Frontend';
        modeSwitch.style.cssText = `
            padding: 6px 12px;
            border: none;
            border-radius: 8px;
            background: rgba(239, 68, 68, 0.8);
            color: white;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 70px;
        `;

        // Initialize mode state
        this.isBackendMode = false;

        modeSwitch.onclick = () => {
            this.isBackendMode = !this.isBackendMode;
            if (this.isBackendMode) {
                modeSwitch.textContent = 'Backend';
                modeSwitch.style.background = 'rgba(34, 197, 94, 0.8)';
                
                // Switch to DataViz view when in backend mode
                this.switchToView('dataviz');
                
            } else {
                modeSwitch.textContent = 'Frontend';
                modeSwitch.style.background = 'rgba(239, 68, 68, 0.8)';
                
                // Switch to boulder view when in frontend mode
                this.switchToView('boulder');
            }
        };

        modeSection.appendChild(modeLabel);
        modeSection.appendChild(modeSwitch);

        // Server Toggle Section
        const serverSection = document.createElement('div');
        serverSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding-right: 15px;
            border-right: 1px solid rgba(0, 255, 204, 0.3);
        `;

        const serverLabel = document.createElement('span');
        serverLabel.textContent = 'Server:';
        serverLabel.style.cssText = `
            color: #00ffcc;
            font-size: 12px;
            font-weight: bold;
        `;

        const serverToggle = document.createElement('button');
        serverToggle.id = 'server-toggle';
        serverToggle.textContent = 'OFF';
        serverToggle.style.cssText = `
            padding: 6px 12px;
            border: none;
            border-radius: 8px;
            background: rgba(239, 68, 68, 0.8);
            color: white;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 50px;
        `;

        // Initialize server state
        this.isServerConnected = false;

        serverToggle.onclick = () => this.toggleServerConnection();

        serverSection.appendChild(serverLabel);
        serverSection.appendChild(serverToggle);

        // Server Dropdown Section
        const dropdownSection = document.createElement('div');
        dropdownSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding-right: 15px;
            border-right: 1px solid rgba(0, 255, 204, 0.3);
        `;

        const dropdownLabel = document.createElement('span');
        dropdownLabel.textContent = 'Select:';
        dropdownLabel.style.cssText = `
            color: #00ffcc;
            font-size: 12px;
            font-weight: bold;
        `;

        const serverDropdown = document.createElement('select');
        serverDropdown.id = 'server-dropdown';
        serverDropdown.style.cssText = `
            padding: 6px 10px;
            border: 1px solid rgba(0, 255, 204, 0.5);
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ffcc;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            min-width: 120px;
        `;

        // Server options
        const servers = [
            { name: 'Server 1 (192.168.1.36)', url: 'http://10.237.1.101' },
            { name: 'Server 2 (10.237.1.101)', url: 'http://10.237.1.101' },
            { name: 'Server 3 (192.168.1.100)', url: 'http://192.168.1.100' },
            { name: 'Server 4 (172.20.10.1)', url: 'http://172.20.10.1' },
            { name: 'Server 5 (10.224.1.221)', url: 'http://10.224.1.221' }
        ];

        servers.forEach((server, index) => {
            const option = document.createElement('option');
            option.value = server.url;
            option.textContent = server.name;
            if (index === 0) option.selected = true;
            serverDropdown.appendChild(option);
        });

        // Store current server URL
        this.currentServerUrl = servers[0].url;

        serverDropdown.onchange = () => {
            this.currentServerUrl = serverDropdown.value;
            const selectedServer = servers.find(s => s.url === serverDropdown.value);
            
            // Show server selection in error display temporarily (as info, not error)
            if (this.errorDisplay) {
                this.errorDisplay.textContent = `Selected: ${selectedServer.name}`;
                this.errorDisplay.style.background = 'rgba(23, 162, 184, 0.95)'; // Blue for info
                this.errorDisplay.style.display = 'block';
                
                // Reset to error color and hide after 2 seconds
                setTimeout(() => {
                    if (this.errorDisplay) {
                        this.errorDisplay.style.background = 'rgba(220, 53, 69, 0.95)'; // Back to red
                        this.errorDisplay.style.display = 'none';
                    }
                }, 2000);
            }
            
            // Update remote handler URL
            if (this.remoteHandler) {
                this.remoteHandler.setRemoteUrl(this.currentServerUrl);
            }
            
            // If currently connected, automatically reconnect with new server
            if (this.isServerConnected) {
                console.log('[Main] Server changed while connected - auto-reconnecting to new server');
                this.showServerError(`Switching to ${selectedServer.name}...`, 5000);
                this.restartServerConnection();
            }
        };

        dropdownSection.appendChild(dropdownLabel);
        dropdownSection.appendChild(serverDropdown);

        // Playback Controls Section (only visible when connected)
        const playbackSection = document.createElement('div');
        playbackSection.id = 'playback-section';
        playbackSection.style.cssText = `
            display: none;
            align-items: center;
            gap: 8px;
        `;

        const playbackLabel = document.createElement('span');
        playbackLabel.textContent = 'Control:';
        playbackLabel.style.cssText = `
            color: #00ffcc;
            font-size: 12px;
            font-weight: bold;
        `;

        const playButton = document.createElement('button');
        playButton.id = 'play-button';
        playButton.textContent = '▶️';
        playButton.style.cssText = `
            padding: 6px 10px;
            border: none;
            border-radius: 6px;
            background: rgba(34, 197, 94, 0.8);
            color: white;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        const stopButton = document.createElement('button');
        stopButton.id = 'stop-button';
        stopButton.textContent = '⏹️';
        stopButton.style.cssText = `
            padding: 6px 10px;
            border: none;
            border-radius: 6px;
            background: rgba(239, 68, 68, 0.8);
            color: white;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        const clearButton = document.createElement('button');
        clearButton.id = 'clear-button';
        clearButton.textContent = '🗑️';
        clearButton.style.cssText = `
            padding: 6px 10px;
            border: none;
            border-radius: 6px;
            background: rgba(108, 117, 125, 0.8);
            color: white;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-left: 5px;
        `;

        // Playback button actions
        playButton.onclick = () => this.sendServerCommand('start');
        stopButton.onclick = () => this.sendServerCommand('stop');
        clearButton.onclick = () => this.sendServerCommand('clear');

        playbackSection.appendChild(playbackLabel);
        playbackSection.appendChild(playButton);
        playbackSection.appendChild(stopButton);
        playbackSection.appendChild(clearButton);

        // Assemble the module
        serverControlModule.appendChild(modeSection);
        serverControlModule.appendChild(serverSection);
        serverControlModule.appendChild(dropdownSection);
        serverControlModule.appendChild(playbackSection);

        document.body.appendChild(serverControlModule);

        // Create error display element at top left corner of screen
        const errorDisplay = document.createElement('div');
        errorDisplay.id = 'server-error-display';
        errorDisplay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            display: none;
            padding: 12px 16px;
            background: rgba(220, 53, 69, 0.95);
            color: white;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 13px;
            font-weight: bold;
            max-width: 400px;
            word-wrap: break-word;
            border: 1px solid rgba(220, 53, 69, 0.8);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(5px);
        `;
        document.body.appendChild(errorDisplay);

        // Store references
        this.serverControlModule = serverControlModule;
        this.errorDisplay = errorDisplay;
        this.modeSwitch = modeSwitch;
        this.serverToggle = serverToggle;
        this.serverDropdown = serverDropdown;
        this.playbackSection = playbackSection;
    }
    
    addRemoteStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .remote-on {
                background: rgba(34, 197, 94, 0.8) !important;
                box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
            }
            
            .remote-off {
                background: rgba(239, 68, 68, 0.8) !important;
            }
            
            .recording-active {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    switchToView(view) {
        this.currentView = view;
        
        // Update mode switch to reflect current view
        const modeSwitch = document.getElementById('mode-switch');
        if (modeSwitch) {
            if (view === 'dataviz') {
                this.isBackendMode = true;
                modeSwitch.textContent = 'Backend';
                modeSwitch.style.background = 'rgba(34, 197, 94, 0.8)';
            } else {
                this.isBackendMode = false;
                modeSwitch.textContent = 'Frontend';
                modeSwitch.style.background = 'rgba(239, 68, 68, 0.8)';
            }
        }
        
        if (view === 'boulder') {
            // Show boulder visualizer
            this.container.style.display = 'block';
            this.dataVizIntegration.hide();
            if (this.controlPanel) {
                this.controlPanel.show();
            }
            
            // Prioritize live data when remote mode is active
            if (this.isRemoteMode && this.remoteHandler?.accumulatedData && this.remoteHandler.accumulatedData.time.length > 0) {
                console.log('Switching to boulder view with live data');
                this.visualizer.updateWithLiveData(this.remoteHandler.accumulatedData);
            } else if (this.currentBoulder && this.visualizer) {
                // Only load CSV boulder if not in remote mode
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
            this.dataVizIntegration.show(); // This now auto-refreshes data
            if (this.controlPanel) {
                this.controlPanel.hide();
            }
            
            // Prioritize live data when remote mode is active
            if (this.isRemoteMode && this.remoteHandler?.accumulatedData && this.remoteHandler.accumulatedData.time.length > 0) {
                console.log('Switching to DataViz with live data');
                this.dataVizIntegration.updateWithLiveData(this.remoteHandler.accumulatedData);
            }
            // Note: DataViz will auto-refresh with current boulder data if not in live mode
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
        
        // Listen for threshold changes from DataViz for live data
        document.addEventListener('thresholdChanged', (event) => {
            const { source, threshold, isLiveData } = event.detail;
            console.log(`Threshold changed to ${threshold} from ${source} (live: ${isLiveData})`);
            
            // Update boulder visualizer with new threshold for live data
            if (isLiveData && this.visualizer && this.isRemoteMode) {
                console.log('Updating boulder visualizer threshold for live data');
                // Force boulder visualizer to update with new threshold
                if (this.visualizer.isDisplayingLiveData && this.visualizer.isDisplayingLiveData()) {
                    // Get current live data buffer and update with new threshold
                    const currentBuffer = this.remoteHandler?.accumulatedData;
                    if (currentBuffer) {
                        this.visualizer.updateWithLiveData(currentBuffer);
                    }
                }
            }
        });
    }
    
    async syncBoulderSelection(boulderId, source) {
        // Prevent rapid synchronization calls
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        
        // Debounce sync calls
        this.syncTimeout = setTimeout(async () => {
            await this._performBoulderSync(boulderId, source);
        }, 100);
    }
    
    async _performBoulderSync(boulderId, source) {
        console.log(`[Main] Starting boulder sync - ID: ${boulderId}, Source: ${source}`);
        
        if (this.globalState.selectedBoulderId === boulderId) {
            console.log(`[Main] Already selected boulder ${boulderId}, skipping sync`);
            return; // Already selected
        }
        
        this.globalState.selectedBoulderId = boulderId;
        this.globalState.lastUpdateTime = Date.now();
        
        try {
            // Load the boulder data
            console.log(`[Main] Loading boulder data for ID: ${boulderId}`);
            const boulder = await getBoulderById(boulderId);
            
            if (boulder) {
                this.currentBoulder = boulder;
                console.log(`[Main] Successfully loaded boulder: ${boulder.name} (ID: ${boulder.id})`);
                
                // Sync to visualizer (unless source is visualizer)
                if (source !== 'boulder' && source !== 'visualizer' && this.visualizer) {
                    console.log('[Main] Syncing boulder to visualizer');
                    try {
                        this.visualizer.loadBoulder(boulder);
                        console.log('[Main] Visualizer updated successfully');
                    } catch (error) {
                        console.error('[Main] Error syncing boulder to visualizer:', error);
                    }
                }
                
                // Sync to DataViz (unless source is DataViz)
                if (source !== 'dataviz' && this.dataVizIntegration) {
                    console.log('[Main] Syncing boulder to DataViz');
                    try {
                        this.dataVizIntegration.syncCSVSelection(boulderId);
                        await this.dataVizIntegration.updateWithBoulderData(boulder);
                        console.log('[Main] DataViz updated successfully');
                    } catch (error) {
                        console.error('[Main] Error syncing boulder to DataViz:', error);
                    }
                }
                
                // Sync to control panel (unless source is control panel)
                if (source !== 'controlPanel' && this.controlPanel) {
                    console.log('[Main] Syncing boulder to control panel');
                    try {
                        this.controlPanel.syncBoulderSelection(boulderId);
                        console.log('[Main] Control panel updated successfully');
                    } catch (error) {
                        console.error('[Main] Error syncing boulder to control panel:', error);
                    }
                }
                
                console.log(`[Main] Boulder sync completed successfully for ID: ${boulderId}`);
                
            } else {
                console.error(`[Main] Failed to load boulder with ID: ${boulderId}`);
                throw new Error(`Boulder with ID ${boulderId} not found`);
            }
        } catch (error) {
            console.error(`[Main] Error during boulder sync for ID ${boulderId}:`, error);
            // Don't rethrow to prevent cascading errors
        }
    }
    
    handleControlChange(source, controlName, value) {
        console.log(`Handling control change: ${controlName} from ${source}`);
        
        // Show control change notification
        // this.showNotification(`🎛️ ${controlName} changed - ${source} processing...`, 'sync');
        
        // If change is from DataViz, update the boulder view
        if (source === 'dataviz' && this.visualizer && this.currentBoulder) {
            setTimeout(() => {
                console.log('Auto-updating boulder view due to DataViz change');
                this.visualizer.loadBoulder(this.currentBoulder);
            }, 100);
        }
        
        // If change is from frontend (boulder control panel), update the DataViz
        if (source === 'boulder' && this.dataVizIntegration && this.currentBoulder && this.currentBoulder.type === 'csv') {
            setTimeout(async () => {
                console.log('Auto-updating DataViz due to frontend control change');
                try {
                    await this.dataVizIntegration.updateWithBoulderData(this.currentBoulder);
                } catch (error) {
                    console.error('Error updating DataViz from frontend change:', error);
                }
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
            
            console.log('[Main] Toggle UI called, current visibility:', isVisible);
            
            if (isVisible) {
                this.controlPanel.hide();
                this.hideUIElements();
                this.showNotification('UI Hidden - Press O or H to show', 'info');
                console.log('[Main] UI hidden');
            } else {
                this.controlPanel.show();
                this.showUIElements();
                this.showNotification('UI Shown - Press O or H to hide', 'info');
                console.log('[Main] UI shown');
            }
        } else {
            console.warn('[Main] Control panel not available for toggle');
        }
    }
    
    hideUIElements() {
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
        
        // NOTE: Server control module is NOT hidden by UI toggle
        // It remains visible for server management
    }
    
    showUIElements() {
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
            boulderInfoElement.style.display = 'none';
        }
        
        // NOTE: Server control module remains visible regardless of UI toggle
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.global-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'global-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 1005;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInBottom 0.3s ease-out;
        `;

        const colors = {
            success: 'rgba(40, 167, 69, 0.95)',
            error: 'rgba(220, 53, 69, 0.95)',
            info: 'rgba(23, 162, 184, 0.95)',
            sync: 'rgba(255, 193, 7, 0.95)'
        };

        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;

        // Add CSS animation for bottom slide-in if not already added
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideInBottom {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Show error messages longer for better readability
        const duration = type === 'error' ? 6000 : 3000;
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    // Add keyboard controls
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // Only handle if not typing in an input field
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key.toLowerCase()) {
                case 'o':  // Changed from 'h' to 'o' for toggle UI
                    console.log('[Main] Toggle UI key pressed (O)');
                    this.toggleUI();
                    event.preventDefault();
                    break;
                case 'h':  // Keep 'h' as alternative
                    console.log('[Main] Toggle UI key pressed (H)');
                    this.toggleUI();
                    event.preventDefault();
                    break;
                case 'escape':
                    // Emergency stop for performance issues
                    if (this.visualizer) {
                        this.visualizer.stop();
                        console.log('Animation stopped via ESC key');
                    }
                    event.preventDefault();
                    break;
                case 'space':
                    // Toggle animation
                    if (this.visualizer) {
                        if (this.visualizer.isAnimating) {
                            this.visualizer.stop();
                            console.log('Animation paused');
                        } else {
                            this.visualizer.start();
                            console.log('Animation resumed');
                        }
                    }
                    event.preventDefault();
                    break;
            }
        });
        
        console.log('[Main] Keyboard controls initialized - Press O or H to toggle UI');
    }
    
    setupRemoteHandlers() {
        // Set up remote data callbacks
        this.remoteHandler.setDataCallback((data) => {
            this.handleRemoteData(data);
        });
        
        // Use setPollingStateCallback
        this.remoteHandler.setPollingStateCallback((isPolling, errorMessage) => {
            this.updateRemoteUI(isPolling, errorMessage);
        });
    }

    handleRemoteData(data) {
        if (!this.isRemoteMode || !data) return;
        
        // Track when we last received data for connection monitoring
        this.lastRemoteDataTime = Date.now();
        
        // data.newPoints is an array of {time, accX, accY, accZ}
        // data.buffer is the complete accumulated data {time:[], accX:[], ...}
        // data.displayBuffer is the performance buffer for visualization
        // data.isThrottledUpdate indicates if this is a throttled visual update
        
        if (data.newPoints && data.newPoints.length > 0) {
            console.log(`Received ${data.newPoints.length} new data points. Total accumulated: ${data.totalAccumulated}`);
        }

        // Initialize live mode visualizations immediately when remote mode starts
        // This ensures the UI switches to live mode even when no data is flowing yet
        if (!this.liveDataInitialized) {
            console.log('[Main] Initializing live data mode visualizations');
            this.liveDataInitialized = true;
            
            // Initialize both visualizers for live mode
            if (this.visualizer && this.visualizer.initializeLiveMode) {
                this.visualizer.initializeLiveMode();
            }
            
            if (this.dataVizIntegration && this.dataVizIntegration.initializeLiveMode) {
                this.dataVizIntegration.initializeLiveMode();
            }
        }

        // Update visualizations with live data (only if we have actual data or this is a throttled update)
        if ((data.newPoints && data.newPoints.length > 0) || data.isThrottledUpdate) {
            try {
                // Debug: Log the data structure we're working with
                console.log('[Main] Updating visualizations with data:', {
                    hasBuffer: !!data.buffer,
                    bufferTimeLength: data.buffer?.time?.length || 0,
                    newPointsLength: data.newPoints?.length || 0,
                    isThrottledUpdate: data.isThrottledUpdate
                });
                
                // Update boulder visualizer with live data
                if (this.visualizer && this.visualizer.updateWithLiveData && data.buffer) {
                    // Pass the buffer data (which contains time, accX, accY, accZ arrays)
                    this.visualizer.updateWithLiveData(data.buffer);
                }
                
                // Update DataViz integration with live data
                if (this.dataVizIntegration && this.dataVizIntegration.updateWithLiveData && data.buffer) {
                    // Pass the buffer data (which contains time, accX, accY, accZ arrays)
                    this.dataVizIntegration.updateWithLiveData(data.buffer);
                }
                
                // Show visual update indicator for throttled updates
                if (data.isThrottledUpdate) {
                    this.showVisualUpdateIndicator();
                }
                
            } catch (error) {
                console.error('[Main] Error updating visualizations with live data:', error);
            }
        }
    }

    updateRemoteUI(isPolling, errorMessage) {
        // Update server toggle in the new server control module
        const serverToggle = document.getElementById('server-toggle');
        const playbackSection = document.getElementById('playback-section');
        
        if (isPolling) {
            if (serverToggle) {
                serverToggle.textContent = 'ON';
                serverToggle.style.background = 'rgba(34, 197, 94, 0.8)';
            }
            if (playbackSection) {
                playbackSection.style.display = 'flex';
            }
            this.isServerConnected = true;
        } else {
            if (serverToggle) {
                if (errorMessage) {
                    serverToggle.textContent = 'ERROR';
                    serverToggle.style.background = 'rgba(239, 68, 68, 0.8)';
                    
                    // Reset to OFF after 3 seconds
                    setTimeout(() => {
                        if (!this.isServerConnected) {
                            serverToggle.textContent = 'OFF';
                        }
                    }, 3000);
                } else {
                    serverToggle.textContent = 'OFF';
                    serverToggle.style.background = 'rgba(239, 68, 68, 0.8)';
                }
            }
            if (playbackSection) {
                playbackSection.style.display = 'none';
            }
            this.isServerConnected = false;
        }
    }

    updatePollingStatus(status) {
        const pollingStatus = document.getElementById('polling-status');
        if (pollingStatus) {
            if (status.isPolling) {
                // Show both display buffer and total accumulated data
                const totalAccumulated = this.remoteHandler.accumulatedData ? this.remoteHandler.accumulatedData.time.length : 0;
                const timeRange = this.remoteHandler.accumulatedData && this.remoteHandler.accumulatedData.time.length > 0 ? 
                    `${(this.remoteHandler.accumulatedData.time[this.remoteHandler.accumulatedData.time.length - 1] - this.remoteHandler.accumulatedData.time[0]).toFixed(1)}s` : '0s';
                const visualRate = this.remoteHandler.getVisualUpdateRate() / 1000;
                pollingStatus.textContent = `🔴 LIVE: ${totalAccumulated} pts (${timeRange}) | Visual: ${visualRate}s`;
            } else {
                 if (this.isRemoteMode) { // If remote mode is on, but not polling (e.g. error or just stopped)
                    const totalAccumulated = this.remoteHandler.accumulatedData ? this.remoteHandler.accumulatedData.time.length : 0;
                    pollingStatus.textContent = `Polling OFF. Total accumulated: ${totalAccumulated} points`;
                 } else {
                    pollingStatus.textContent = 'Polling OFF';
                 }
            }
        }
    }

    setupGlobalSync() {
        // Implement cross-view synchronization logic here
    }

    // Show a brief visual indicator when throttled updates occur
    showVisualUpdateIndicator() {
        // Create or get existing indicator
        let indicator = document.getElementById('visual-update-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'visual-update-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 255, 204, 0.9);
                color: #000;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
            `;
            indicator.textContent = '📊 Visual Update';
            document.body.appendChild(indicator);
        }

        // Show the indicator briefly
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 300);
    }

    clearVisualizationsForLiveMode() {
        // Reset live data initialization flag
        this.liveDataInitialized = false;
        
        // Clear boulder visualizer from CSV data
        if (this.visualizer) {
            console.log('[Main] Clearing boulder visualizer for live mode');
            // Clear any existing boulder data to prepare for live data
            this.visualizer.clearLiveData && this.visualizer.clearLiveData();
        }
        
        // Clear DataViz from CSV data
        if (this.dataVizIntegration) {
            console.log('[Main] Clearing DataViz for live mode');
            // Clear any existing CSV data to prepare for live data
            this.dataVizIntegration.clearLiveData && this.dataVizIntegration.clearLiveData();
        }
        
        // Show notification that we're switching to live mode
        // this.showNotification('🔴 Switched to LIVE data mode', 'info');
    }

    restoreCSVVisualizationsAfterLiveMode() {
        // Reset live data initialization flag
        this.liveDataInitialized = false;
        
        // Restore boulder visualizer with current CSV boulder
        if (this.visualizer && this.currentBoulder) {
            console.log('[Main] Restoring boulder visualizer with CSV data');
            this.visualizer.loadBoulder(this.currentBoulder);
        }
        
        // Restore DataViz with current CSV boulder
        if (this.dataVizIntegration && this.currentBoulder && this.currentBoulder.type === 'csv') {
            console.log('[Main] Restoring DataViz with CSV data');
            this.dataVizIntegration.updateWithBoulderData(this.currentBoulder);
        }
        
        // Show notification that we're switching back to CSV mode
        // this.showNotification('📊 Switched back to CSV data mode', 'info');
    }

    setupConnectionMonitoring() {
        // Clear any existing monitoring
        this.clearConnectionMonitoring();
        
        // Monitor for connection issues every 10 seconds
        this.connectionMonitorInterval = setInterval(async () => {
            if (!this.isRemoteMode) {
                this.clearConnectionMonitoring();
                return;
            }
            
            try {
                // Check if we're still receiving data
                const status = this.remoteHandler.getPollingStatus();
                const lastDataTime = this.lastRemoteDataTime || 0;
                const now = Date.now();
                
                // If no data received for 30 seconds and we're supposed to be polling
                if (status.isPolling && (now - lastDataTime) > 30000) {
                    console.warn('[Main] No data received for 30 seconds, checking connection...');
                    
                    // Try to ping the server
                    const isConnected = await this.remoteHandler.checkRemoteConnection();
                    if (!isConnected) {
                        console.error('[Main] Connection lost, attempting recovery...');
                        this.showNotification('⚠️ Connection lost - Attempting recovery...', 'warning');
                        await this.attemptConnectionRecovery();
                    }
                }
            } catch (error) {
                console.warn('[Main] Connection monitoring error:', error);
            }
        }, 10000); // Check every 10 seconds
        
        console.log('[Main] Connection monitoring started');
    }

    clearConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
            console.log('[Main] Connection monitoring stopped');
        }
    }

    async attemptConnectionRecovery() {
        const remoteToggle = document.getElementById('remote-toggle');
        
        try {
            console.log('[Main] Attempting connection recovery...');
            remoteToggle.textContent = '📱 Remote: RECOVERING...';
            
            // Stop current polling
            await this.remoteHandler.stopPolling();
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to start with new server
            try {
                await this.remoteHandler.startPhyphoxExperiment();
                console.log('[Main] Restarted Phyphox measurement during recovery');
            } catch (restartError) {
                console.warn('[Main] Could not restart Phyphox during recovery:', restartError.message);
            }
            
            // Restart polling
            await this.remoteHandler.startPolling();
            
            remoteToggle.textContent = '📱 Remote: POLLING';
            remoteToggle.className = 'tab-button remote-on recording-active';
            
            this.showNotification('✅ Connection recovered successfully', 'success');
            console.log('[Main] Connection recovery successful');
            
        } catch (recoveryError) {
            console.error('[Main] Connection recovery failed:', recoveryError);
            
            // If recovery fails, disable remote mode
            this.isRemoteMode = false;
            remoteToggle.textContent = '📱 Remote: FAILED';
            remoteToggle.className = 'tab-button remote-off';
            
            this.showNotification('❌ Connection recovery failed - Remote mode disabled', 'error');
            
            // Auto-save any data we have
            await this.autoSaveData();
            
            // Restore CSV visualizations
            this.restoreCSVVisualizationsAfterLiveMode();
            
            // Reset button text after 5 seconds
            setTimeout(() => {
                if (!this.isRemoteMode) {
                    remoteToggle.textContent = '📱 Remote: OFF';
                }
            }, 5000);
        }
    }

    toggleServerConnection() {
        if (!this.isServerConnected) {
            // Connect to server
            this.connectToServer();
        } else {
            // Disconnect from server
            this.disconnectFromServer();
        }
    }

    async connectToServer() {
        const serverToggle = document.getElementById('server-toggle');
        
        try {
            console.log('[Main] Starting server connection to:', this.currentServerUrl);
            
            // Hide any previous errors
            this.hideServerError();
            
            serverToggle.textContent = 'CONNECTING...';
            serverToggle.style.background = 'rgba(255, 193, 7, 0.8)';
            
            // Start remote mode
            this.isRemoteMode = true;
            console.log('[Main] Set remote mode to true');
            
            // Clear existing visualizations to prepare for live data
            console.log('[Main] Switching to live data mode - clearing existing visualizations');
            this.clearVisualizationsForLiveMode();
            
            // Show connecting status
            this.showServerError(`Connecting to ${this.currentServerUrl}...`, 10000);
            
            // Try to automatically start Phyphox measurement
            console.log('[Main] Attempting to auto-start Phyphox measurement...');
            try {
                await this.remoteHandler.startPhyphoxExperiment();
                console.log('[Main] Successfully auto-started Phyphox measurement');
            } catch (autoStartError) {
                console.warn('[Main] Could not auto-start Phyphox (may already be running):', autoStartError.message);
                this.showServerError(`Auto-start warning: ${autoStartError.message}`, 3000);
            }
            
            // Start polling
            console.log('[Main] Starting polling...');
            await this.remoteHandler.startPolling();
            console.log('[Main] Polling started successfully');
            
            // Update UI
            this.isServerConnected = true;
            serverToggle.textContent = 'ON';
            serverToggle.style.background = 'rgba(34, 197, 94, 0.8)';
            
            // Show playback controls
            this.playbackSection.style.display = 'flex';
            
            // Set up connection monitoring
            this.setupConnectionMonitoring();
            
            // Hide error display and show success
            this.hideServerError();
            console.log('[Main] Server connection completed successfully');
            
        } catch (error) {
            console.error('[Main] Server connection failed:', error);
            this.isRemoteMode = false;
            this.isServerConnected = false;
            serverToggle.textContent = 'ERROR';
            serverToggle.style.background = 'rgba(239, 68, 68, 0.8)';
            
            let errorMessage = '';
            if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
                errorMessage = `❌ Cannot reach ${this.currentServerUrl}. Check WiFi and IP address.`;
            } else if (error.message.includes('CORS')) {
                errorMessage = `❌ CORS error. Enable "Allow remote access" in Phyphox app.`;
            } else if (error.message.includes('timeout')) {
                errorMessage = `❌ Connection timeout. Server may be busy or unreachable.`;
            } else {
                errorMessage = `❌ Connection failed: ${error.message}`;
            }
            
            // Show detailed error in error display
            this.showServerError(errorMessage, 10000);
            
            console.error('Server connection error:', error);
            
            // Reset to OFF state after 3 seconds
            setTimeout(() => {
                if (!this.isServerConnected) {
                    serverToggle.textContent = 'OFF';
                    serverToggle.style.background = 'rgba(239, 68, 68, 0.8)';
                }
            }, 3000);
        }
    }

    async disconnectFromServer() {
        const serverToggle = document.getElementById('server-toggle');
        
        try {
            // Hide any error messages
            this.hideServerError();
            
            serverToggle.textContent = 'DISCONNECTING...';
            serverToggle.style.background = 'rgba(255, 193, 7, 0.8)';
            
            // Stop polling
            await this.remoteHandler.stopPolling();
            
            // Clear connection monitoring
            this.clearConnectionMonitoring();
            
            // Auto-save the accumulated data
            await this.autoSaveData();
            
            // Restore CSV data visualizations
            console.log('[Main] Exiting live data mode - restoring CSV visualizations');
            this.restoreCSVVisualizationsAfterLiveMode();
            
            // Update UI
            this.isRemoteMode = false;
            this.isServerConnected = false;
            serverToggle.textContent = 'OFF';
            serverToggle.style.background = 'rgba(239, 68, 68, 0.8)';
            
            // Hide playback controls
            this.playbackSection.style.display = 'none';
            
        } catch (error) {
            console.error('Error disconnecting from server:', error);
            this.showServerError(`Disconnect error: ${error.message}`, 5000);
        }
    }

    async restartServerConnection() {
        if (this.isServerConnected) {
            console.log('[Main] Restarting server connection with new URL');
            await this.disconnectFromServer();
            
            // Wait a moment before reconnecting
            setTimeout(async () => {
                await this.connectToServer();
            }, 1000);
        }
    }

    async sendServerCommand(command) {
        if (!this.isServerConnected) {
            this.showServerError('❌ Not connected to server', 3000);
            return;
        }

        try {
            // Show command being sent
            this.showServerError(`Sending ${command.toUpperCase()} command...`, 5000);
            
            const response = await fetch(`${this.currentServerUrl}/control?cmd=${command}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`[Main] Server command '${command}' result:`, result);
            
            if (result.result === true) {
                this.showServerError(`✅ ${command.toUpperCase()} successful`, 2000);
            } else {
                this.showServerError(`⚠️ ${command.toUpperCase()} failed: ${result.message || 'Unknown error'}`, 5000);
            }
            
            return result;
            
        } catch (error) {
            console.error(`[Main] Server command '${command}' failed:`, error);
            this.showServerError(`❌ ${command.toUpperCase()} failed: ${error.message}`, 5000);
            throw error;
        }
    }

    // Auto-save data when polling stops
    async autoSaveData() {
        if (!this.isRemoteMode || !this.remoteHandler.accumulatedData || this.remoteHandler.accumulatedData.time.length === 0) {
            return;
        }

        const autoSaveStatus = document.getElementById('auto-save-status');
        if (autoSaveStatus) {
            autoSaveStatus.textContent = '💾 Auto-Save: Saving...';
            autoSaveStatus.style.background = 'rgba(59, 130, 246, 0.8)';
        }

        try {
            // Convert accumulated data to CSV format and save directly to data folder
            const csvData = this.convertToCSV(this.remoteHandler.accumulatedData);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `Live_Data_${timestamp}.csv`;
            
            // Save to data folder (this will be handled by the server in a real implementation)
            await this.saveToDataFolder(csvData, filename);
            
            // Create boulder from the data
            const newBoulder = await this.createBoulderFromLiveData(csvData, filename);
            
            if (newBoulder) {
                // this.showNotification(`Auto-saved live data as "${newBoulder.name}"`, 'success');
                
                // Update control panel dropdown
                if (this.controlPanel) {
                    await this.controlPanel.rebuildBoulderDropdown();
                }
                
                if (autoSaveStatus) {
                    autoSaveStatus.textContent = '💾 Auto-Save: Saved';
                    autoSaveStatus.style.background = 'rgba(34, 197, 94, 0.8)';
                }
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
            // this.showNotification('Auto-save failed: ' + error.message, 'error');
            
            if (autoSaveStatus) {
                autoSaveStatus.textContent = '💾 Auto-Save: Failed';
                autoSaveStatus.style.background = 'rgba(239, 68, 68, 0.8)';
            }
        }
    }

    convertToCSV(dataBuffer) {
        let csvContent = 'Time (s),Acceleration x (m/s^2),Acceleration y (m/s^2),Acceleration z (m/s^2)\n';
        
        for (let i = 0; i < dataBuffer.time.length; i++) {
            csvContent += `${dataBuffer.time[i]},${dataBuffer.accX[i]},${dataBuffer.accY[i]},${dataBuffer.accZ[i]}\n`;
        }
        
        return csvContent;
    }

    async saveToDataFolder(csvData, filename) {
        // In a real implementation, this would send the data to a server endpoint
        // For now, we'll trigger a download and show instructions
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log(`Auto-saved CSV file: ${filename}`);
        // this.showNotification(`Downloaded ${filename} - Move to src/data/ folder to use in app`, 'info');
    }

    async createBoulderFromLiveData(csvData, filename) {
        try {
            // Import the necessary functions
            const { parseCSVData, addNewBoulder } = await import('./data/boulderData.js');
            
            // Parse the CSV data
            const boulderData = await parseCSVData(csvData, filename);
            
            if (boulderData) {
                // Add to boulder list
                const addedBoulder = await addNewBoulder(boulderData);
                return addedBoulder;
            }
        } catch (error) {
            console.error('Error creating boulder from live data:', error);
            throw error;
        }
        
        return null;
    }

    showServerError(message, duration = 5000) {
        if (!this.errorDisplay) return;
        
        this.errorDisplay.textContent = message;
        this.errorDisplay.style.display = 'block';
        
        // Auto-hide after duration
        setTimeout(() => {
            if (this.errorDisplay) {
                this.errorDisplay.style.display = 'none';
            }
        }, duration);
    }
    
    hideServerError() {
        if (this.errorDisplay) {
            this.errorDisplay.style.display = 'none';
        }
    }

    async clearAllServersOnReload() {
        console.log('[Main] Clearing all servers on page reload');
        
        // List of all servers to clear
        const servers = [
            'http://10.237.1.101',
            'http://10.237.1.101',
            'http://192.168.1.100',
            'http://172.20.10.1',
            'http://10.224.1.221'
        ];
        
        // Send clear command to each server (don't wait for responses to avoid blocking startup)
        servers.forEach(async (serverUrl) => {
            try {
                console.log(`[Main] Sending clear command to ${serverUrl}`);
                const response = await fetch(`${serverUrl}/control?cmd=clear`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: AbortSignal.timeout(2000) // Short timeout to not block startup
                });
                
                if (response.ok) {
                    console.log(`[Main] Successfully cleared ${serverUrl}`);
                } else {
                    console.warn(`[Main] Failed to clear ${serverUrl}: ${response.status}`);
                }
            } catch (error) {
                // Silently ignore errors to not block app startup
                console.warn(`[Main] Could not clear ${serverUrl}:`, error.message);
            }
        });
        
        // Don't wait for all requests to complete - let them run in background
        console.log('[Main] Clear commands sent to all servers (running in background)');
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