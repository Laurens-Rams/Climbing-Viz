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
        
        // Create boulder names mapping - ensure consistent ID handling
        const boulderNames = {};
        boulderList.forEach(boulder => {
            console.log(`Processing boulder for dropdown: id=${boulder.id}, name="${boulder.name}", csvFile="${boulder.csvFile}"`);
            // Use CSV filename as the display name
            const displayName = `${boulder.name} - ${boulder.csvFile || 'Unknown File'}`;
            // Ensure ID is treated as string for dropdown consistency
            boulderNames[displayName] = String(boulder.id);
        });
        console.log('Boulder names for dropdown:', boulderNames);
        
        // Create a persistent object for the dropdown - ensure ID is string
        this.boulderSelection = { boulder: String(this.currentBoulderId) };
        
        // Store the mapping for reverse lookup during sync
        this.boulderNamesMapping = boulderNames;
        
        const dropdownController = boulderFolder.add(this.boulderSelection, 'boulder', boulderNames)
            .name('Select CSV Data')
            .onChange(async (boulderIdString) => {
                // Convert back to number for consistency with the rest of the system
                const boulderId = parseInt(boulderIdString);
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
            
        // Store reference to the dropdown controller for easier sync
        this.boulderDropdownController = dropdownController;
            
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
        basicsFolder.add(this.visualizer.settings, 'dynamicsMultiplier', 0.5, 15.0, 0.1)
            .name('Dynamics Effect')
            .onChange(() => {
                this.updateVisualizationImmediate(); // Immediate update during drag
                this.emitControlChange('dynamicsMultiplier', this.visualizer.settings.dynamicsMultiplier);
            })
            .onFinishChange(() => {
                this.updateVisualization(); // Full update on release
                // No need to emit here again if already emitted in onChange,
                // but if emitControlChange has side effects beyond logging, consider if it's needed.
            });
        
        // Combined size control that intelligently affects both base radius and overall size
        this.combinedSize = { value: 1.0 };
        basicsFolder.add(this.combinedSize, 'value', 0.5, 5.0, 0.1)
            .name('Overall Size')
            .onChange((value) => {
                // Intelligently scale both base radius and radius multiplier
                // Base radius affects the inner starting point
                // Radius multiplier affects the overall scale
                this.visualizer.settings.baseRadius = 2.5 * value;
                this.visualizer.settings.radiusMultiplier = value;
                this.updateVisualizationImmediate();
                this.emitControlChange('combinedSize', value);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        basicsFolder.add(this.visualizer.settings, 'ringCount', 10, 150, 1)
            .name('Ring Count')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('ringCount', this.visualizer.settings.ringCount);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        basicsFolder.add(this.visualizer.settings, 'ringSpacing', 0.00, 0.05, 0.001)
            .name('Ring Spacing')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('ringSpacing', this.visualizer.settings.ringSpacing);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        basicsFolder.open();
        
        // VISUALS Section
        const visualsFolder = this.gui.addFolder('🎨 Visuals');
        
        visualsFolder.add(this.visualizer.settings, 'opacity', 0.1, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('opacity', this.visualizer.settings.opacity);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        visualsFolder.add(this.visualizer.settings, 'centerFade', 0.0, 1.0, 0.05)
            .name('Center Fade')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('centerFade', this.visualizer.settings.centerFade);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        visualsFolder.add(this.visualizer.settings, 'depthEffect', 0.0, 2.0, 0.1)
            .name('3D Depth Effect')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('depthEffect', this.visualizer.settings.depthEffect);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        // Organic noise - much smaller range for subtle noise filter effect
        visualsFolder.add(this.visualizer.settings, 'organicNoise', 0.0, 0.1, 0.005)
            .name('Organic Noise')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('organicNoise', this.visualizer.settings.organicNoise);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        visualsFolder.open();
        
        // Dynamic Effects Settings (keeping some advanced controls)
        const effectsFolder = this.gui.addFolder('🌊 Dynamic Effects');
        
        effectsFolder.add(this.visualizer.settings, 'cruxEmphasis', 0.5, 3.0, 0.1)
            .name('Crux Emphasis')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('cruxEmphasis', this.visualizer.settings.cruxEmphasis);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        effectsFolder.add(this.visualizer.settings, 'moveEmphasis', 0.0, 10.0, 0.1)
            .name('Move Emphasis (All)')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('moveEmphasis', this.visualizer.settings.moveEmphasis);
            })
            .onFinishChange(() => {
                this.updateVisualization();
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
                this.updateVisualizationImmediate();
                this.emitControlChange('segmentOpacity', this.visualizer.settings.segmentOpacity);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        segmentsFolder.add(this.visualizer.settings, 'segmentGap', 0.0, 0.2, 0.01)
            .name('Gap Between Segments')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('segmentGap', this.visualizer.settings.segmentGap);
            })
            .onFinishChange(() => {
                this.updateVisualization();
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
                this.updateVisualizationImmediate();
                this.emitControlChange('lineLength', this.visualizer.settings.lineLength);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        linesFolder.add(this.visualizer.settings, 'lineWidth', 0.005, 0.1, 0.005)
            .name('Line Width')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('lineWidth', this.visualizer.settings.lineWidth);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        linesFolder.add(this.visualizer.settings, 'lineOpacity', 0.0, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('lineOpacity', this.visualizer.settings.lineOpacity);
            })
            .onFinishChange(() => {
                this.updateVisualization();
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
            
        attemptsFolder.add(this.visualizer.settings, 'maxAttempts', 10, 500, 5)
            .name('Number of Attempts')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('maxAttempts', this.visualizer.settings.maxAttempts);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptOpacity', 0.0, 1.0, 0.05)
            .name('Attempt Opacity')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptOpacity', this.visualizer.settings.attemptOpacity);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptWaviness', 0.001, 0.5, 0.001)
            .name('Line Waviness')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptWaviness', this.visualizer.settings.attemptWaviness);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptFadeStrength', 0.0, 5.0, 0.1)
            .name('Multiple Try Effect')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptFadeStrength', this.visualizer.settings.attemptFadeStrength);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptThickness', 0.1, 10.0, 0.1)
            .name('Line Thickness')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptThickness', this.visualizer.settings.attemptThickness);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptIntensity', 0.5, 5.0, 0.1)
            .name('Visual Intensity')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptIntensity', this.visualizer.settings.attemptIntensity);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptRadius', 0.5, 6.0, 0.05)
            .name('Max Radius')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptRadius', this.visualizer.settings.attemptRadius);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });
            
        attemptsFolder.add(this.visualizer.settings, 'attemptDotZOffsetMax', 0.0, 5.0, 0.05)
            .name('Dot Z Offset Max')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptDotZOffsetMax', this.visualizer.settings.attemptDotZOffsetMax);
            })
            .onFinishChange(() => {
                this.updateVisualization();
            });

        attemptsFolder.add(this.visualizer.settings, 'attemptDotZEffectStrength', 0.0, 5.0, 0.05)
            .name('Dot Z Strength')
            .onChange(() => {
                this.updateVisualizationImmediate();
                this.emitControlChange('attemptDotZEffectStrength', this.visualizer.settings.attemptDotZEffectStrength);
            })
            .onFinishChange(() => {
                this.updateVisualization();
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
                this.boulderSelection.boulder = String(randomBoulder.id);
                
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
        this.boulderSelection.boulder = String(nextBoulder.id);
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
        this.boulderSelection.boulder = String(prevBoulder.id);
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
                    boulderNames[displayName] = String(boulder.id);
                });
                
                // Add new controller
                const dropdownController = boulderFolder.add(this.boulderSelection, 'boulder', boulderNames)
                    .name('Select CSV Data')
                    .onChange(async (boulderIdString) => {
                        // Convert back to number for consistency with the rest of the system
                        const boulderId = parseInt(boulderIdString);
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
                    
                // Update stored reference to the new controller
                this.boulderDropdownController = dropdownController;
                
                // Update boulder names mapping for reverse lookup
                this.boulderNamesMapping = boulderNames;
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
                display: none;
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
        // Immediate update for better responsiveness
        // Clear any existing timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        // For immediate visual feedback, trigger a quick render (this can be before the timeout)
        if (this.visualizer && this.visualizer.renderer) {
            this.visualizer.renderer.render(this.visualizer.scene, this.visualizer.camera);
        }
        
        // Debounced update for full recalculation - reduced from 100ms to 50ms for better responsiveness
        this.updateTimeout = setTimeout(() => {
            if (this.visualizer) {
                if (this.visualizer.updateSettings) {
                    this.visualizer.updateSettings(this.visualizer.settings);
                }
                // Ensure render happens *after* settings are potentially updated, inside the timeout
                if (this.visualizer.renderer) {
                    this.visualizer.renderer.render(this.visualizer.scene, this.visualizer.camera);
                }
            }
        }, 50); // Reduced debounce time for more responsive controls
    }
    
    // Immediate update for real-time dragging feedback
    updateVisualizationImmediate() {
        if (this.visualizer) {
            if (this.visualizer.updateSettings) {
                this.visualizer.updateSettings(this.visualizer.settings);
            }
            // Ensure render happens *after* settings are potentially updated
            if (this.visualizer.renderer) {
                this.visualizer.renderer.render(this.visualizer.scene, this.visualizer.camera);
            }
        }
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
        
        // Clean up server status indicator
        if (this.serverStatusInterval) {
            clearInterval(this.serverStatusInterval);
        }
        
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
        
        // Remove server status indicator
        const serverIndicator = document.getElementById('server-status-indicator');
        if (serverIndicator) {
            serverIndicator.remove();
        }
        
        // Remove server status notifications
        const serverStatus = document.getElementById('server-status');
        if (serverStatus) {
            serverStatus.remove();
        }
        
        // Remove floating controls
        const floatingControls = document.getElementById('floating-server-controls');
        if (floatingControls) {
            floatingControls.remove();
        }
        
        // Remove old animation controls if they exist
        const animationControls = document.getElementById('animation-controls');
        if (animationControls) {
            animationControls.remove();
        }
    }
    
    show() {
        if (this.gui) {
            this.gui.domElement.style.display = 'block';
        }
        
        const infoElement = document.getElementById('boulder-info');
        if (infoElement) {
            infoElement.style.display = 'none';
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
        const boulderIdString = String(boulderId);
        
        if (this.boulderSelection && this.boulderSelection.boulder !== boulderIdString) {
            console.log(`[BoulderControlPanel] Syncing to boulder ID: ${boulderId}`);
            console.log(`[BoulderControlPanel] Current selection: ${this.boulderSelection.boulder}`);
            
            // Find the boulder in our list to make sure it exists
            const targetBoulder = this.boulderList.find(b => parseInt(b.id) === parseInt(boulderId));
            if (!targetBoulder) {
                console.warn(`[BoulderControlPanel] Boulder ID ${boulderId} not found in boulder list`);
                return;
            }
            
            console.log(`[BoulderControlPanel] Found target boulder: ${targetBoulder.name}`);
            
            // Update internal state
            this.boulderSelection.boulder = boulderIdString;
            this.currentBoulderId = parseInt(boulderId);
            
            // Update current index for arrow navigation
            this.currentBoulderIndex = this.boulderList.findIndex(b => parseInt(b.id) === parseInt(boulderId));
            if (this.currentBoulderIndex === -1) this.currentBoulderIndex = 0;
            
            // Use stored dropdown controller reference for more reliable sync
            if (this.boulderDropdownController) {
                try {
                    // Temporarily disable onChange to prevent recursion
                    const originalOnChange = this.boulderDropdownController.__onChange;
                    this.boulderDropdownController.__onChange = [];
                    
                    // Set the value directly
                    this.boulderDropdownController.setValue(boulderIdString);
                    
                    // Re-enable onChange
                    this.boulderDropdownController.__onChange = originalOnChange;
                    
                    console.log(`[BoulderControlPanel] Direct controller sync completed for boulder ID: ${boulderId}`);
                } catch (error) {
                    console.error('[BoulderControlPanel] Error with direct controller sync:', error);
                    
                    // Fallback to GUI updateDisplay
                    if (this.gui) {
                        this.gui.updateDisplay();
                        console.log(`[BoulderControlPanel] Fallback GUI display update for boulder ID: ${boulderId}`);
                    }
                }
            } else {
                console.warn('[BoulderControlPanel] No stored dropdown controller reference, using GUI updateDisplay');
                // Fallback to GUI updateDisplay
                if (this.gui) {
                    this.gui.updateDisplay();
                    console.log(`[BoulderControlPanel] GUI display update for boulder ID: ${boulderId}`);
                }
            }
            
            console.log(`[BoulderControlPanel] Sync completed for boulder ID: ${boulderId}`);
        } else {
            console.log(`[BoulderControlPanel] No sync needed - already on boulder ID: ${boulderId}`);
        }
    }
    
    // Server control methods
    async sendServerCommand(command) {
        try {
            const response = await fetch(`http://${this.serverConfig.ip}:${this.serverConfig.port}/control?cmd=${command}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`[BoulderControlPanel] Server command '${command}' result:`, result);
            
            if (result.result === true) {
                this.showServerStatus(`✅ ${command.toUpperCase()} command successful`, 'success');
                
                // Update server status indicator after successful command
                setTimeout(() => {
                    this.updateServerStatusIndicator();
                }, 500);
                
            } else {
                this.showServerStatus(`⚠️ ${command.toUpperCase()} command failed: ${result.message || 'Unknown error'}`, 'warning');
            }
            
            return result;
            
        } catch (error) {
            console.error(`[BoulderControlPanel] Server command '${command}' failed:`, error);
            this.showServerStatus(`❌ ${command.toUpperCase()} failed: ${error.message}`, 'error');
            throw error;
        }
    }
    
    async sendCustomCommand() {
        const command = prompt('Enter custom server command:\n\nExamples:\n• start\n• stop\n• clear\n• status', 'status');
        
        if (command && command.trim()) {
            try {
                await this.sendServerCommand(command.trim());
            } catch (error) {
                console.error('[BoulderControlPanel] Custom command failed:', error);
            }
        }
    }
    
    showServerStatus(message, type = 'info') {
        // Remove existing server status
        const existing = document.querySelector('.server-status-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'server-status-notification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 13px;
            font-weight: bold;
            z-index: 1010;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease-out;
            border-left: 4px solid;
        `;

        const colors = {
            success: { bg: 'rgba(40, 167, 69, 0.95)', border: '#28a745' },
            error: { bg: 'rgba(220, 53, 69, 0.95)', border: '#dc3545' },
            info: { bg: 'rgba(23, 162, 184, 0.95)', border: '#17a2b8' },
            warning: { bg: 'rgba(255, 193, 7, 0.95)', border: '#ffc107' }
        };

        const colorScheme = colors[type] || colors.info;
        notification.style.background = colorScheme.bg;
        notification.style.borderLeftColor = colorScheme.border;
        notification.textContent = message;

        // Add CSS animation if not already added
        if (!document.querySelector('#server-status-animations')) {
            const style = document.createElement('style');
            style.id = 'server-status-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto-remove after delay (longer for errors)
        const duration = type === 'error' ? 8000 : 4000;
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    async autoResetOnLoad() {
        try {
            console.log('[BoulderControlPanel] Auto-reset on load triggered');
            this.showServerStatus('🔄 Auto-resetting server on page load...', 'info');
            
            // Send reset command
            await this.sendServerCommand('clear');
            
            // Wait a moment then check status
            setTimeout(async () => {
                try {
                    await this.sendServerCommand('status');
                } catch (error) {
                    console.warn('[BoulderControlPanel] Status check after auto-reset failed:', error);
                }
            }, 1000);
            
        } catch (error) {
            console.error('[BoulderControlPanel] Auto-reset on load failed:', error);
            this.showServerStatus('❌ Auto-reset failed: ' + error.message, 'error');
        }
    }
    
    async resetAndClear() {
        try {
            console.log('[BoulderControlPanel] Reset and clear triggered');
            this.showServerStatus('🔄 Resetting and clearing server data...', 'info');
            
            // Send stop command first
            try {
                await this.sendServerCommand('stop');
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            } catch (stopError) {
                console.warn('[BoulderControlPanel] Stop command failed during reset:', stopError);
            }
            
            // Send clear command
            await this.sendServerCommand('clear');
            
            this.showServerStatus('✅ Server reset and cleared successfully', 'success');
            
        } catch (error) {
            console.error('[BoulderControlPanel] Reset and clear failed:', error);
            this.showServerStatus('❌ Reset failed: ' + error.message, 'error');
        }
    }
    
    async quickReset() {
        try {
            console.log('[BoulderControlPanel] Quick reset triggered');
            this.showServerStatus('⚡ Quick reset in progress...', 'info');
            
            // Just send clear command for quick reset
            await this.sendServerCommand('clear');
            
            this.showServerStatus('✅ Quick reset completed', 'success');
            
        } catch (error) {
            console.error('[BoulderControlPanel] Quick reset failed:', error);
            this.showServerStatus('❌ Quick reset failed: ' + error.message, 'error');
        }
    }
    
    createServerStatusIndicator() {
        // Remove existing indicator
        const existing = document.getElementById('server-status-indicator');
        if (existing) {
            existing.remove();
        }
        
        // Create status indicator
        const indicator = document.createElement('div');
        indicator.id = 'server-status-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.8);
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            z-index: 1005;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
        `;
        
        // Status dot
        const statusDot = document.createElement('div');
        statusDot.id = 'server-status-dot';
        statusDot.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6c757d;
            transition: background 0.3s ease;
        `;
        
        // Status text
        const statusText = document.createElement('span');
        statusText.id = 'server-status-text';
        statusText.textContent = 'Server: Checking...';
        
        indicator.appendChild(statusDot);
        indicator.appendChild(statusText);
        document.body.appendChild(indicator);
        
        // Initial status check
        this.updateServerStatusIndicator();
    }
    
    async updateServerStatusIndicator() {
        const statusDot = document.getElementById('server-status-dot');
        const statusText = document.getElementById('server-status-text');
        
        if (!statusDot || !statusText) return;
        
        try {
            // Test connection
            const response = await fetch(`http://${this.serverConfig.ip}:${this.serverConfig.port}/control?cmd=status`, {
                method: 'GET',
                mode: 'cors',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const result = await response.json();
                statusDot.style.background = '#28a745'; // Green
                statusText.textContent = `Server: Online (${this.serverConfig.ip})`;
                
                // Update floating controls visibility
                this.updateFloatingControls();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            statusDot.style.background = '#dc3545'; // Red
            statusText.textContent = `Server: Offline (${this.serverConfig.ip})`;
            
            // Hide floating controls
            this.updateFloatingControls();
        }
    }
    
    parseAndUpdateUrl(url) {
        try {
            // Clean the URL
            let cleanUrl = url.trim();
            
            // Add http:// if not present
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'http://' + cleanUrl;
            }
            
            // Parse URL
            const urlObj = new URL(cleanUrl);
            
            // Update server config
            this.serverConfig.ip = urlObj.hostname;
            this.serverConfig.port = urlObj.port || '80';
            
            console.log('[BoulderControlPanel] Parsed URL:', {
                original: url,
                clean: cleanUrl,
                ip: this.serverConfig.ip,
                port: this.serverConfig.port
            });
            
        } catch (error) {
            console.error('[BoulderControlPanel] Failed to parse URL:', error);
            // Try simple IP:port parsing as fallback
            const parts = url.split(':');
            if (parts.length >= 1) {
                this.serverConfig.ip = parts[0].replace(/^https?:\/\//, '');
                this.serverConfig.port = parts[1] || '80';
            }
        }
    }
    
    async applyQuickUrl() {
        try {
            const newUrl = this.getQuickUrlValue();
            console.log('[BoulderControlPanel] Applying quick URL globally:', newUrl);
            
            // Parse and update local config
            this.parseAndUpdateUrl(newUrl);
            
            // Apply to main app RemoteDataHandler if it exists
            if (window.app && window.app.remoteHandler) {
                const cleanUrl = newUrl.startsWith('http') ? newUrl : `http://${newUrl}`;
                window.app.remoteHandler.setRemoteUrl(cleanUrl);
                console.log('[BoulderControlPanel] Updated main app RemoteDataHandler URL to:', cleanUrl);
            }
            
            // Apply to global RemoteDataHandler if it exists
            if (window.remoteDataHandler) {
                const cleanUrl = newUrl.startsWith('http') ? newUrl : `http://${newUrl}`;
                window.remoteDataHandler.remoteUrl = cleanUrl;
                console.log('[BoulderControlPanel] Updated global RemoteDataHandler URL to:', cleanUrl);
            }
            
            // Apply to BoulderVisualizer RemoteDataHandler if it exists
            if (window.boulderVisualizer && window.boulderVisualizer.remoteDataHandler) {
                const cleanUrl = newUrl.startsWith('http') ? newUrl : `http://${newUrl}`;
                window.boulderVisualizer.remoteDataHandler.remoteUrl = cleanUrl;
                console.log('[BoulderControlPanel] Updated BoulderVisualizer URL to:', cleanUrl);
            }
            
            // Apply to DataVizIntegration if it exists
            if (window.dataVizIntegration && window.dataVizIntegration.remoteDataHandler) {
                const cleanUrl = newUrl.startsWith('http') ? newUrl : `http://${newUrl}`;
                window.dataVizIntegration.remoteDataHandler.remoteUrl = cleanUrl;
                console.log('[BoulderControlPanel] Updated DataVizIntegration URL to:', cleanUrl);
            }
            
            // Update server status indicator
            this.updateServerStatusIndicator();
            
            // Test connection
            await this.testConnection();
            
            this.showServerStatus('✅ URL applied globally and connection tested', 'success');
            
        } catch (error) {
            console.error('[BoulderControlPanel] Failed to apply URL globally:', error);
            this.showServerStatus('❌ Failed to apply URL: ' + error.message, 'error');
        }
    }
    
    getQuickUrlValue() {
        // Try to get the current value from the GUI input
        const controllers = this.gui.__controllers;
        for (let controller of controllers) {
            if (controller.property === 'quickUrl') {
                return controller.getValue();
            }
        }
        return `http://${this.serverConfig.ip}:${this.serverConfig.port}`;
    }
    
    async testConnection() {
        try {
            const response = await fetch(`http://${this.serverConfig.ip}:${this.serverConfig.port}/control?cmd=status`, {
                method: 'GET',
                mode: 'cors',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                console.log('[BoulderControlPanel] Connection test successful');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('[BoulderControlPanel] Connection test failed:', error);
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
    
    // WiFi preset methods
    async setQuickUrl(url) {
        try {
            console.log(`[BoulderControlPanel] Setting quick URL to: ${url}`);
            
            // Update the GUI input field
            const controllers = this.gui.__controllers;
            for (let controller of controllers) {
                if (controller.property === 'quickUrl') {
                    controller.setValue(url);
                    break;
                }
            }
            
            // Parse and apply immediately
            this.parseAndUpdateUrl(url);
            await this.applyQuickUrl();
            
        } catch (error) {
            console.error('[BoulderControlPanel] Failed to set quick URL:', error);
            this.showServerStatus('❌ Failed to set URL: ' + error.message, 'error');
        }
    }
    
    async promptCustomUrl() {
        const customUrl = prompt('Enter custom server URL:\n\nExamples:\n• http://192.168.1.100\n• 10.0.0.50:8080\n• 172.16.1.35', 'http://192.168.1.36');
        
        if (customUrl && customUrl.trim()) {
            await this.setQuickUrl(customUrl.trim());
        }
    }
    
    updateServerConfigDisplay() {
        // Force update all GUI controllers to show new values
        this.gui.updateDisplay();
        
        // Update server status indicator if it exists
        if (document.getElementById('server-status-indicator')) {
            this.updateServerStatusIndicator();
        }
        
        // Update floating controls visibility
        this.updateFloatingControls();
    }
    
    updateFloatingControls() {
        const floatingControls = document.getElementById('floating-server-controls');
        if (!floatingControls) return;
        
        const statusDot = document.getElementById('server-status-dot');
        const isServerOnline = statusDot && statusDot.style.background === 'rgb(40, 167, 69)'; // Green
        
        if (isServerOnline) {
            floatingControls.style.opacity = '1';
            floatingControls.style.pointerEvents = 'auto';
        } else {
            floatingControls.style.opacity = '0';
            floatingControls.style.pointerEvents = 'none';
        }
    }
} 