import * as dat from 'dat.gui';
import { getBoulderList, getBoulderById, getRandomBoulder, clearCache } from '../data/boulderData.js';

export class BoulderControlPanel {
    constructor(visualizer, dataVizIntegration = null) {
        this.visualizer = visualizer;
        this.dataVizIntegration = dataVizIntegration;
        this.gui = new dat.GUI({ autoPlace: false });
        this.currentBoulderId = 1; // Default to first boulder
        this.updateTimeout = null;
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = false;
        
        // For arrow key navigation
        this.boulderList = [];
        this.currentBoulderIndex = 0;
        
        this.setupControls();
        this.styleGUI();
        this.setupKeyboardControls();
    }
    
    async setupControls() {
        // Boulder Selection
        const boulderFolder = this.gui.addFolder('🧗 Boulder Selection');
        
        // Get boulder list asynchronously
        const boulderList = await getBoulderList();
        console.log('Available boulders:', boulderList);
        
        // Store boulder list for arrow key navigation
        this.boulderList = boulderList;
        this.currentBoulderIndex = this.boulderList.findIndex(b => b.id === this.currentBoulderId);
        if (this.currentBoulderIndex === -1) this.currentBoulderIndex = 0;
        
        const boulderNames = {};
        boulderList.forEach(boulder => {
            console.log(`Processing boulder for dropdown: id=${boulder.id}, name="${boulder.name}", csvFile="${boulder.csvFile}"`);
            // Use CSV filename as the display name
            const displayName = `${boulder.name} - ${boulder.csvFile || 'Unknown File'}`;
            boulderNames[displayName] = boulder.id;
        });
        console.log('Boulder names for dropdown:', boulderNames);
        
        // Create a persistent object for the dropdown
        this.boulderSelection = { boulder: this.currentBoulderId };
        
        boulderFolder.add(this.boulderSelection, 'boulder', boulderNames)
            .name('Select CSV Data')
            .onChange(async (boulderId) => {
                console.log('Boulder selection changed to:', boulderId);
                
                // Emit global event for cross-view sync
                document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
                    detail: { boulderId, source: 'controlPanel' }
                }));
                
                // Clear cache when switching to ensure fresh data loading
                try {
                    clearCache();
                    console.log('Boulder cache cleared for fresh loading');
                } catch (error) {
                    console.log('Could not clear cache (not critical):', error.message);
                }
                
                this.currentBoulderId = boulderId;
                this.loadBoulder(boulderId);
            });
            
        const boulderControls = {
            randomBoulder: () => this.generateRandomBoulder(),
            reloadCurrent: () => this.loadBoulder(this.currentBoulderId)
        };
        
        boulderFolder.add(boulderControls, 'randomBoulder').name('🎲 Random CSV');
        boulderFolder.add(boulderControls, 'reloadCurrent').name('🔄 Reload');
        
        // Add refresh controls
        const refreshControls = {
            refreshFiles: () => this.refreshFileDiscovery(),
            autoRefresh: () => this.toggleAutoRefresh()
        };
        
        boulderFolder.add(refreshControls, 'refreshFiles').name('🔍 Scan for New Files');
        boulderFolder.add(refreshControls, 'autoRefresh').name('🔄 Toggle Auto-Refresh');
        
        boulderFolder.open();
        
        // BASICS Section
        const basicsFolder = this.gui.addFolder('⚙️ Basics');
        
        // Dynamics effect - main control with enhanced scaling for outer values
        basicsFolder.add(this.visualizer.settings, 'dynamicsMultiplier', 0.5, 8.0, 0.1)
            .name('Dynamics Effect')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('dynamicsMultiplier', this.visualizer.settings.dynamicsMultiplier);
            });
        
        // Combined size control that intelligently affects both base radius and overall size
        this.combinedSize = { value: 1.0 };
        basicsFolder.add(this.combinedSize, 'value', 0.5, 3.0, 0.1)
            .name('Overall Size')
            .onChange((value) => {
                // Intelligently scale both base radius and radius multiplier
                // Base radius affects the inner starting point
                // Radius multiplier affects the overall scale
                this.visualizer.settings.baseRadius = 2.5 * value;
                this.visualizer.settings.radiusMultiplier = value;
                this.updateVisualization();
                this.emitControlChange('combinedSize', value);
            });
            
        basicsFolder.add(this.visualizer.settings, 'ringCount', 10, 70, 1)
            .name('Ring Count')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('ringCount', this.visualizer.settings.ringCount);
            });
            
        basicsFolder.add(this.visualizer.settings, 'ringSpacing', 0.00, 0.15, 0.005)
            .name('Ring Spacing')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('ringSpacing', this.visualizer.settings.ringSpacing);
            });
            
        basicsFolder.open();
        
        // VISUALS Section
        const visualsFolder = this.gui.addFolder('🎨 Visuals');
        
        visualsFolder.add(this.visualizer.settings, 'opacity', 0.1, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('opacity', this.visualizer.settings.opacity);
            });
            
        visualsFolder.add(this.visualizer.settings, 'centerFade', 0.0, 1.0, 0.05)
            .name('Center Fade')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('centerFade', this.visualizer.settings.centerFade);
            });
            
        visualsFolder.add(this.visualizer.settings, 'depthEffect', 0.0, 2.0, 0.1)
            .name('3D Depth Effect')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('depthEffect', this.visualizer.settings.depthEffect);
            });
            
        // Organic noise - much smaller range for subtle noise filter effect
        visualsFolder.add(this.visualizer.settings, 'organicNoise', 0.0, 0.1, 0.005)
            .name('Organic Noise')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('organicNoise', this.visualizer.settings.organicNoise);
            });
            
        visualsFolder.open();
        
        // Dynamic Effects Settings (keeping some advanced controls)
        const effectsFolder = this.gui.addFolder('🌊 Dynamic Effects');
        
        effectsFolder.add(this.visualizer.settings, 'cruxEmphasis', 0.5, 3.0, 0.1)
            .name('Crux Emphasis')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('cruxEmphasis', this.visualizer.settings.cruxEmphasis);
            });
            
        effectsFolder.add(this.visualizer.settings, 'moveEmphasis', 0.0, 10.0, 0.1)
            .name('Move Emphasis (All)')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('moveEmphasis', this.visualizer.settings.moveEmphasis);
            });
            
        effectsFolder.open();
        
        // Move Segments Settings
        const segmentsFolder = this.gui.addFolder('🍕 Move Segments');
        
        segmentsFolder.add(this.visualizer.settings, 'showMoveSegments')
            .name('Show Move Segments')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('showMoveSegments', this.visualizer.settings.showMoveSegments);
            });
            
        segmentsFolder.add(this.visualizer.settings, 'segmentOpacity', 0.0, 0.5, 0.01)
            .name('Segment Opacity')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('segmentOpacity', this.visualizer.settings.segmentOpacity);
            });
            
        segmentsFolder.add(this.visualizer.settings, 'segmentGap', 0.0, 0.2, 0.01)
            .name('Gap Between Segments')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('segmentGap', this.visualizer.settings.segmentGap);
            });
            
        segmentsFolder.close();
        
        // Move Lines Settings
        const linesFolder = this.gui.addFolder('📍 Move Lines');
        
        linesFolder.add(this.visualizer.settings, 'showMoveLines')
            .name('Show Move Lines')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('showMoveLines', this.visualizer.settings.showMoveLines);
            });
            
        linesFolder.add(this.visualizer.settings, 'lineLength', 1.0, 6.0, 0.1)
            .name('Line Length')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('lineLength', this.visualizer.settings.lineLength);
            });
            
        linesFolder.add(this.visualizer.settings, 'lineWidth', 0.005, 0.1, 0.005)
            .name('Line Width')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('lineWidth', this.visualizer.settings.lineWidth);
            });
            
        linesFolder.add(this.visualizer.settings, 'lineOpacity', 0.0, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('lineOpacity', this.visualizer.settings.lineOpacity);
            });
            
        linesFolder.close();
        
        // Attempt Visualization Settings
        const attemptsFolder = this.gui.addFolder('🎯 Attempt Visualization');
        
        attemptsFolder.add(this.visualizer.settings, 'showAttempts')
            .name('Show Attempts')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('showAttempts', this.visualizer.settings.showAttempts);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'maxAttempts', 10, 200, 5)
            .name('Number of Attempts')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('maxAttempts', this.visualizer.settings.maxAttempts);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptOpacity', 0.0, 1.0, 0.05)
            .name('Attempt Opacity')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('attemptOpacity', this.visualizer.settings.attemptOpacity);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptWaviness', 0.001, 0.2, 0.001)
            .name('Line Waviness')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('attemptWaviness', this.visualizer.settings.attemptWaviness);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptFadeStrength', 0.0, 2.0, 0.1)
            .name('Multiple Try Effect')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('attemptFadeStrength', this.visualizer.settings.attemptFadeStrength);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptThickness', 0.1, 5.0, 0.1)
            .name('Line Thickness')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('attemptThickness', this.visualizer.settings.attemptThickness);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptIntensity', 0.5, 3.0, 0.1)
            .name('Visual Intensity')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('attemptIntensity', this.visualizer.settings.attemptIntensity);
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptRadius', 0.5, 2.0, 0.1)
            .name('Max Radius')
            .onChange(() => {
                this.updateVisualization();
                this.emitControlChange('attemptRadius', this.visualizer.settings.attemptRadius);
            });
            
        attemptsFolder.close();
        
        // Load initial boulder
        this.loadBoulder(this.currentBoulderId);
    }
    
    async loadBoulder(boulderId) {
        try {
            console.log('Loading boulder with ID:', boulderId);
            
            // Update current index for arrow navigation
            this.currentBoulderIndex = this.boulderList.findIndex(b => b.id === boulderId);
            if (this.currentBoulderIndex === -1) this.currentBoulderIndex = 0;
            
            // Show loading state
            this.showLoadingState(true);
            
            // Clear any previous error states
            const errorElement = document.getElementById('boulder-error');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
            
            // Load boulder data (now async)
            const boulder = await getBoulderById(boulderId);
            
            if (boulder) {
                console.log('Boulder loaded successfully:', boulder.name);
                console.log('Boulder moves:', boulder.moves?.length || 0);
                console.log('Boulder error flag:', boulder.error || false);
                
                // Check if boulder has error flag (fallback data)
                if (boulder.error) {
                    console.warn('Boulder loaded with error flag, using fallback data');
                    this.showError(`Warning: ${boulder.description}\n\nUsing fallback visualization data.`);
                }
                
                // Load into visualizer
                this.visualizer.loadBoulder(boulder);
                
                // Update boulder info display
                this.updateBoulderInfo(boulder);
                
                // Update DataViz integration if available
                if (this.dataVizIntegration && boulder.type === 'csv') {
                    console.log('Updating DataViz integration with boulder data');
                    try {
                        await this.dataVizIntegration.updateWithBoulderData(boulder);
                    } catch (dataVizError) {
                        console.error('Error updating DataViz integration:', dataVizError);
                        // Don't fail the entire load for DataViz errors
                    }
                }
                
            } else {
                console.error('Failed to load boulder with ID:', boulderId);
                this.showError(`Failed to load boulder data for ID: ${boulderId}\n\nThe CSV file may be missing or corrupted.`);
            }
            
        } catch (error) {
            console.error('Error loading boulder:', error);
            
            // Provide more specific error messages
            let errorMessage = `Error loading boulder: ${error.message}`;
            
            if (error.message.includes('Failed to load CSV file')) {
                errorMessage += '\n\nPossible causes:\n• CSV file is missing from /src/data/\n• File permissions issue\n• Network connectivity problem';
            } else if (error.message.includes('Failed to parse')) {
                errorMessage += '\n\nThe CSV file format may be invalid or corrupted.';
            } else if (error.message.includes('fetch')) {
                errorMessage += '\n\nCould not access the CSV file. Check if the file exists in the data directory.';
            }
            
            this.showError(errorMessage);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    async generateRandomBoulder() {
        try {
            console.log('Generating random boulder...');
            this.showLoadingState(true);
            
            const randomBoulder = await getRandomBoulder();
            
            if (randomBoulder) {
                console.log('Random boulder generated:', randomBoulder.name);
                
                // Update the dropdown selection
                this.currentBoulderId = randomBoulder.id;
                this.boulderSelection.boulder = randomBoulder.id;
                
                // Update current index for arrow navigation
                this.currentBoulderIndex = this.boulderList.findIndex(b => b.id === randomBoulder.id);
                if (this.currentBoulderIndex === -1) this.currentBoulderIndex = 0;
                
                // Update the GUI dropdown
                this.gui.updateDisplay();
                
                // Load the boulder
                this.visualizer.loadBoulder(randomBoulder);
                this.updateBoulderInfo(randomBoulder);
                
                if (this.dataVizIntegration && randomBoulder.type === 'csv') {
                    console.log('Updating DataViz integration with boulder data');
                    try {
                        await this.dataVizIntegration.updateWithBoulderData(randomBoulder);
                    } catch (dataVizError) {
                        console.error('Error updating DataViz integration:', dataVizError);
                        // Don't fail the entire load for DataViz errors
                    }
                }
            }
            
        } catch (error) {
            console.error('Error generating random boulder:', error);
            this.showError(`Error generating random boulder: ${error.message}`);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    async navigateToNextBoulder() {
        if (this.boulderList.length === 0) return;
        
        this.currentBoulderIndex = (this.currentBoulderIndex + 1) % this.boulderList.length;
        const nextBoulder = this.boulderList[this.currentBoulderIndex];
        
        console.log(`Navigating to next boulder: ${nextBoulder.name} (${this.currentBoulderIndex + 1}/${this.boulderList.length})`);
        
        // Update selection and load boulder
        this.currentBoulderId = nextBoulder.id;
        this.boulderSelection.boulder = nextBoulder.id;
        this.gui.updateDisplay();
        
        // Emit global event for cross-view sync
        document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
            detail: { boulderId: nextBoulder.id, source: 'controlPanel' }
        }));
        
        await this.loadBoulder(nextBoulder.id);
    }
    
    async navigateToPreviousBoulder() {
        if (this.boulderList.length === 0) return;
        
        this.currentBoulderIndex = (this.currentBoulderIndex - 1 + this.boulderList.length) % this.boulderList.length;
        const prevBoulder = this.boulderList[this.currentBoulderIndex];
        
        console.log(`Navigating to previous boulder: ${prevBoulder.name} (${this.currentBoulderIndex + 1}/${this.boulderList.length})`);
        
        // Update selection and load boulder
        this.currentBoulderId = prevBoulder.id;
        this.boulderSelection.boulder = prevBoulder.id;
        this.gui.updateDisplay();
        
        // Emit global event for cross-view sync
        document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
            detail: { boulderId: prevBoulder.id, source: 'controlPanel' }
        }));
        
        await this.loadBoulder(prevBoulder.id);
    }
    
    async refreshFileDiscovery() {
        try {
            this.showLoadingState(true);
            console.log('Refreshing file discovery...');
            
            // Clear cache to force fresh discovery
            clearCache();
            
            // Rebuild boulder dropdown with fresh data
            await this.rebuildBoulderDropdown();
            
            this.showSuccessNotification('File discovery refreshed! New CSV files detected.');
            
        } catch (error) {
            console.error('Error refreshing file discovery:', error);
            this.showError('Failed to refresh file discovery: ' + error.message);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    async rebuildBoulderDropdown() {
        try {
            // Get updated boulder list
            const boulderList = await getBoulderList();
            console.log('Rebuilding dropdown with boulders:', boulderList);
            
            // Update boulder list for arrow navigation
            this.boulderList = boulderList;
            this.currentBoulderIndex = this.boulderList.findIndex(b => b.id === this.currentBoulderId);
            if (this.currentBoulderIndex === -1) this.currentBoulderIndex = 0;
            
            // Find the boulder dropdown controller
            const boulderFolder = this.gui.__folders['🧗 Boulder Selection'];
            if (boulderFolder) {
                // Remove old controller
                const oldController = boulderFolder.__controllers.find(c => c.property === 'boulder');
                if (oldController) {
                    boulderFolder.remove(oldController);
                }
                
                // Create new boulder names mapping
                const boulderNames = {};
                boulderList.forEach(boulder => {
                    const displayName = `${boulder.name} - ${boulder.csvFile || 'Unknown File'}`;
                    boulderNames[displayName] = boulder.id;
                });
                
                // Add new controller
                boulderFolder.add(this.boulderSelection, 'boulder', boulderNames)
                    .name('Select CSV Data')
                    .onChange(async (boulderId) => {
                        console.log('Boulder selection changed to:', boulderId);
                        
                        // Emit global event for cross-view sync
                        document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
                            detail: { boulderId, source: 'controlPanel' }
                        }));
                        
                        // Clear cache when switching to ensure fresh data loading
                        try {
                            clearCache();
                            console.log('Boulder cache cleared for fresh loading');
                        } catch (error) {
                            console.log('Could not clear cache (not critical):', error.message);
                        }
                        
                        this.currentBoulderId = boulderId;
                        this.loadBoulder(boulderId);
                    });
            }
            
        } catch (error) {
            console.error('Error rebuilding boulder dropdown:', error);
        }
    }
    
    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        
        if (this.autoRefreshEnabled) {
            console.log('Auto-refresh enabled');
            this.startAutoRefresh();
            this.showSuccessNotification('Auto-refresh enabled - will check for file changes every 30 seconds');
        } else {
            console.log('Auto-refresh disabled');
            this.stopAutoRefresh();
            this.showSuccessNotification('Auto-refresh disabled');
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.autoRefreshInterval = setInterval(async () => {
            try {
                const { autoRefresh } = await import('../data/boulderData.js');
                const result = await autoRefresh();
                
                if (result.hasUpdates) {
                    console.log('Auto-refresh detected file changes');
                    await this.rebuildBoulderDropdown();
                    this.showSuccessNotification('Files updated automatically!');
                }
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, 30000); // Check every 30 seconds
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    showSuccessNotification(message) {
        // Remove any existing notification
        const existingNotification = document.getElementById('boulder-success-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.id = 'boulder-success-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(40, 167, 69, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1003;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <strong>✅ Success</strong><br>
                    <span style="font-size: 12px;">${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 10px;">
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
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
            <div><strong>CSV File:</strong> ${boulder.csvFile || 'Unknown'}</div>
            <div><strong>Type:</strong> Real Sensor Data</div>
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
            // Only handle if not typing in an input field
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key) {
                case 'r':
                case 'R':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.generateRandomBoulder();
                        event.preventDefault();
                    }
                    break;
                case 'ArrowUp':
                    this.navigateToPreviousBoulder();
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    this.navigateToNextBoulder();
                    event.preventDefault();
                    break;
            }
        });
    }
    
    updateVisualization() {
        // Reduced debounce for more immediate feedback
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this.visualizer.updateSettings(this.visualizer.settings);
        }, 50); // Reduced from 100ms to 50ms for more immediate response
    }
    
    styleGUI() {
        // Enhanced GUI styling
        const guiElement = this.gui.domElement;
        guiElement.style.cssText = `
            position: fixed !important;
            top: 100px !important;
            right: 20px !important;
            z-index: 1000 !important;
            background: rgba(0, 0, 0, 0.9) !important;
            border: 2px solid #00ffcc !important;
            border-radius: 10px !important;
            box-shadow: 0 0 20px rgba(0, 255, 204, 0.3) !important;
            font-family: 'Courier New', monospace !important;
        `;
        
        // Add GUI to DOM since autoPlace is false
        document.body.appendChild(guiElement);
        
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
        // Clean up auto-refresh
        this.stopAutoRefresh();
        
        // Clean up update timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        // Remove GUI
        if (this.gui) {
            this.gui.destroy();
        }
        
        // Remove boulder info display
        const infoElement = document.getElementById('boulder-info');
        if (infoElement) {
            infoElement.remove();
        }
        
        // Remove loading state
        const loadingElement = document.getElementById('boulder-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Remove error display
        const errorElement = document.getElementById('boulder-error');
        if (errorElement) {
            errorElement.remove();
        }
        
        // Remove success notifications
        const successElement = document.getElementById('boulder-success-notification');
        if (successElement) {
            successElement.remove();
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
    
    emitControlChange(controlName, value) {
        // Emit global event for auto-reload functionality
        document.dispatchEvent(new CustomEvent('controlChanged', {
            detail: { 
                source: 'boulder', 
                controlName, 
                value 
            }
        }));
    }
    
    syncBoulderSelection(boulderId) {
        // Update the dropdown selection without triggering onChange
        if (this.boulderSelection && this.boulderSelection.boulder !== boulderId) {
            this.boulderSelection.boulder = boulderId;
            this.currentBoulderId = boulderId;
            
            // Update current index for arrow navigation
            this.currentBoulderIndex = this.boulderList.findIndex(b => b.id === boulderId);
            if (this.currentBoulderIndex === -1) this.currentBoulderIndex = 0;
            
            // Update the GUI display
            if (this.gui) {
                this.gui.updateDisplay();
            }
            
            console.log(`Control panel synced to boulder ID: ${boulderId}`);
        }
    }
} 