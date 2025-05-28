import { getBoulderList } from '../data/boulderData.js';

export class DataVizIntegration {
    constructor(container) {
        this.container = container;
        this.dataVizContainer = null;
        this.currentData = null;
        this.currentBoulder = null; // Track current boulder for move regeneration
        this.samplingRate = 50; // 50Hz default
        this.plotlyLoaded = false;
        this.plotlyLoadPromise = null;
        
        // Initialize the DataViz interface
        this.createDataVizContainer();
        
        // Load Plotly and setup
        this.plotlyLoadPromise = this.loadDataVizComponents();
    }
    
    createDataVizContainer() {
        this.dataVizContainer = document.createElement('div');
        this.dataVizContainer.id = 'dataviz-container';
        this.dataVizContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            color: #00ffcc;
            font-family: Arial, sans-serif;
            overflow-y: auto;
            display: none;
            z-index: 10;
        `;
        
        // Create the DataViz HTML structure
        this.dataVizContainer.innerHTML = `
            <div style="padding: 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #00ffcc; margin: 0; font-size: 28px; text-shadow: 0 0 10px rgba(0, 255, 204, 0.5);">
                        🧗‍♂️ Real Climbing Data Analysis
                    </h1>
                    <p style="color: #888; margin: 10px 0 0 0;">Analyzing absolute acceleration from Phyphox CSV files</p>
                </div>

                <!-- Controls Panel -->
                <div style="background: rgba(0, 0, 0, 0.7); border: 1px solid #00ffcc; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: center;">
                        
                        <!-- CSV File Selection -->
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #00ffcc;">CSV Data File:</label>
                            <select id="csvFileSelect" style="width: 100%; padding: 8px; background: #1a1a2e; color: #00ffcc; border: 1px solid #00ffcc; border-radius: 5px;">
                                <option value="">Loading CSV files...</option>
                            </select>
                        </div>
                        
                        <!-- Time Range -->
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #00ffcc;">View Duration: <span id="timeValue">All</span></label>
                            <input type="range" id="timeRange" min="0" max="100" value="100" style="width: 100%;">
                        </div>
                        
                        <!-- Acceleration Threshold -->
                        <div class="control-group">
                            <label for="threshold">Move Detection Threshold:</label>
                            <input type="range" id="threshold" min="8" max="25" step="0.5" value="12">
                            <span id="thresholdValue">12</span> m/s²
                        </div>

                        <!-- Visualization Mode -->
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #00ffcc;">Visualization:</label>
                            <select id="visualizationMode" style="width: 100%; padding: 8px; background: #1a1a2e; color: #00ffcc; border: 1px solid #00ffcc; border-radius: 5px;">
                                <option value="standard">Time Series Plot</option>
                                <option value="moves">Move Detection</option>
                                <option value="histogram">Acceleration Distribution</option>
                                <option value="heatmap">Intensity Heat Map</option>
                            </select>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 10px;">
                            <button id="refreshBtn" style="flex: 1; padding: 8px; background: #00ffcc; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                🔄 Refresh
                            </button>
                            <button id="exportBtn" style="flex: 1; padding: 8px; background: #0066aa; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                                💾 Export
                            </button>
                        </div>
                    </div>

                    <!-- File Upload Section -->
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;">
                        <label style="display: block; margin-bottom: 5px; color: #00ffcc;">Upload New Phyphox CSV:</label>
                        <input type="file" id="fileUpload" accept=".csv" style="width: 100%; padding: 8px; background: #1a1a2e; color: #00ffcc; border: 1px solid #00ffcc; border-radius: 5px;">
                    </div>
                </div>

                <!-- Statistics Panel -->
                <div style="background: rgba(0, 0, 0, 0.7); border: 1px solid #00ffcc; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #00ffcc;">📊 Data Statistics</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #ff6b6b;" id="maxAccel">0.0</div>
                            <div style="font-size: 12px; color: #888;">Max Acceleration (m/s²)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #4ecdc4;" id="avgAccel">0.0</div>
                            <div style="font-size: 12px; color: #888;">Average Acceleration (m/s²)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #45b7d1;" id="moveCount">0</div>
                            <div style="font-size: 12px; color: #888;">Detected Moves</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #f9ca24;" id="duration">0</div>
                            <div style="font-size: 12px; color: #888;">Duration (s)</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #a55eea;" id="sampleCount">0</div>
                            <div style="font-size: 12px; color: #888;">Data Points</div>
                        </div>
                    </div>
                </div>

                <!-- Main Visualization Container -->
                <div style="background: rgba(0, 0, 0, 0.7); border: 1px solid #00ffcc; border-radius: 10px; padding: 20px;">
                    <div id="accelerationPlot" style="width: 100%; height: 500px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.dataVizContainer);
    }
    
    async loadDataVizComponents() {
        try {
            // Load Plotly
            if (typeof Plotly === 'undefined') {
                console.log('Loading Plotly...');
                const script = document.createElement('script');
                script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js'; // Use specific version instead of latest
                
                // Wait for Plotly to load
                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        console.log('Plotly loaded successfully');
                        this.plotlyLoaded = true;
                        resolve();
                    };
                    script.onerror = () => {
                        console.error('Failed to load Plotly');
                        reject(new Error('Failed to load Plotly'));
                    };
                    document.head.appendChild(script);
                });
                
                this.initializeDataVizControls();
                this.loadAvailableCSVFiles();
            } else {
                console.log('Plotly already available');
                this.plotlyLoaded = true;
                this.initializeDataVizControls();
                this.loadAvailableCSVFiles();
            }
        } catch (error) {
            console.error('Failed to load DataViz components:', error);
        }
    }
    
    async loadAvailableCSVFiles() {
        try {
            const csvFileSelect = this.dataVizContainer.querySelector('#csvFileSelect');
            if (!csvFileSelect) return;

            // Clear existing options
            csvFileSelect.innerHTML = '<option value="">Loading...</option>';

            // Get available boulders (CSV files)
            const boulders = await getBoulderList();
            
            if (boulders.length === 0) {
                csvFileSelect.innerHTML = '<option value="">No CSV files found</option>';
                return;
            }

            // Populate dropdown with available CSV files
            csvFileSelect.innerHTML = '<option value="">Select a CSV file...</option>';
            boulders.forEach(boulder => {
                const option = document.createElement('option');
                option.value = boulder.id;
                option.textContent = `${boulder.name} (${boulder.stats?.sampleCount || 0} points)`;
                csvFileSelect.appendChild(option);
            });

            // Load first file by default
            if (boulders.length > 0) {
                csvFileSelect.value = boulders[0].id;
                await this.loadCSVData(boulders[0]);
            }

        } catch (error) {
            console.error('Error loading CSV files:', error);
            const csvFileSelect = this.dataVizContainer.querySelector('#csvFileSelect');
            if (csvFileSelect) {
                csvFileSelect.innerHTML = '<option value="">Error loading files</option>';
            }
        }
    }

    initializeDataVizControls() {
        // CSV file selection
        const csvFileSelect = this.dataVizContainer.querySelector('#csvFileSelect');
        if (csvFileSelect) {
            csvFileSelect.addEventListener('change', async () => {
                const selectedId = parseInt(csvFileSelect.value);
                if (selectedId) {
                    // Emit global event for cross-view sync
                    document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
                        detail: { boulderId: selectedId, source: 'dataviz' }
                    }));
                    
                    const boulders = await getBoulderList();
                    const selectedBoulder = boulders.find(b => b.id === selectedId);
                    if (selectedBoulder) {
                        await this.loadCSVData(selectedBoulder);
                    }
                }
            });
        }

        // Time range slider
        const timeRange = this.dataVizContainer.querySelector('#timeRange');
        const timeValue = this.dataVizContainer.querySelector('#timeValue');
        if (timeRange && timeValue) {
            timeRange.addEventListener('input', () => {
                const percentage = parseInt(timeRange.value);
                if (percentage === 100) {
                    timeValue.textContent = 'All';
                } else {
                    const duration = this.currentData ? this.currentData.duration : 0;
                    const viewDuration = (duration * percentage / 100).toFixed(1);
                    timeValue.textContent = `${viewDuration}s`;
                }
                this.updateVisualization();
                this.updateStatistics(); // Auto-refresh statistics
                
                // Emit control change event
                this.emitControlChange('timeRange', percentage);
            });
        }

        // Threshold slider
        const thresholdRange = this.dataVizContainer.querySelector('#threshold');
        const thresholdValue = this.dataVizContainer.querySelector('#thresholdValue');
        if (thresholdRange && thresholdValue) {
            thresholdRange.addEventListener('input', async () => {
                const newThreshold = parseFloat(thresholdRange.value);
                thresholdValue.textContent = newThreshold;
                
                console.log(`[DataVizIntegration] Threshold changed to: ${newThreshold}`);
                
                // Update visualization for both CSV and live data
                if (this.isDisplayingLiveData()) {
                    console.log('[DataVizIntegration] Updating live data visualization with new threshold');
                    // For live data, recreate the plot with new threshold
                    const liveBuffer = this.currentData.buffer;
                    if (liveBuffer) {
                        await this.createLiveDataPlot(liveBuffer);
                        
                        // Update live data statistics with new threshold
                        const magnitudeData = liveBuffer.time.map((_, i) => {
                            const mag = Math.sqrt(
                                liveBuffer.accX[i] * liveBuffer.accX[i] + 
                                liveBuffer.accY[i] * liveBuffer.accY[i] + 
                                liveBuffer.accZ[i] * liveBuffer.accZ[i]
                            );
                            return isFinite(mag) ? mag : 0;
                        });
                        this.updateLiveDataStatistics(liveBuffer, magnitudeData);
                    }
                    
                    // Emit threshold change for boulder visualizer
                    document.dispatchEvent(new CustomEvent('thresholdChanged', {
                        detail: {
                            source: 'dataviz',
                            threshold: newThreshold,
                            isLiveData: true
                        }
                    }));
                } else {
                    // For CSV data, update visualization and statistics
                    console.log('[DataVizIntegration] Updating CSV data visualization with new threshold');
                    await this.updateVisualization();
                    this.updateStatistics(); // This will use the new threshold
                    
                    // Regenerate moves with new threshold and sync to Boulder visualizer
                    await this.regenerateMovesAndSync();
                }
                
                // Emit control change event for global sync
                this.emitControlChange('threshold', newThreshold);
            });
        }

        // Visualization mode
        const visualizationMode = this.dataVizContainer.querySelector('#visualizationMode');
        if (visualizationMode) {
            visualizationMode.addEventListener('change', () => {
                this.updateVisualization();
                
                // Emit control change event
                this.emitControlChange('visualizationMode', visualizationMode.value);
            });
        }

        // Refresh button
        const refreshBtn = this.dataVizContainer.querySelector('#refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAvailableCSVFiles();
            });
        }

        // Export button
        const exportBtn = this.dataVizContainer.querySelector('#exportBtn');
        if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            this.exportData();
        });
        }

        // File upload
        const fileUpload = this.dataVizContainer.querySelector('#fileUpload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (event) => {
                this.handleFileUpload(event);
            });
        }
        
        // Add window resize listener for plot responsiveness
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.resizePlot();
            }, 100);
        });
    }
    
    async loadCSVData(boulder) {
        try {
            console.log('Loading CSV data for boulder:', boulder.name);
            
            if (!boulder.csvData) {
                throw new Error('No CSV data available for this boulder');
            }

            // Store current boulder for move regeneration
            this.currentBoulder = boulder;

            this.currentData = {
                time: boulder.csvData.time,
                absoluteAcceleration: boulder.csvData.absoluteAcceleration,
                filename: boulder.csvData.filename,
                duration: boulder.csvData.duration,
                maxAcceleration: boulder.csvData.maxAcceleration,
                avgAcceleration: boulder.csvData.avgAcceleration,
                sampleCount: boulder.csvData.sampleCount
            };

            // Wait for Plotly to be loaded before updating visualization
            await this.ensurePlotlyLoaded();
            await this.updateVisualization();
                this.updateStatistics();
            
            this.showNotification(`Loaded ${boulder.name}`, 'success');

        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.showNotification('Error loading CSV data: ' + error.message, 'error');
        }
    }

    async ensurePlotlyLoaded() {
        if (this.plotlyLoaded && typeof Plotly !== 'undefined') {
            return true;
        }
        
        if (this.plotlyLoadPromise) {
            await this.plotlyLoadPromise;
        }
        
        // Double check
        if (typeof Plotly === 'undefined') {
            throw new Error('Plotly failed to load');
        }
        
        return true;
    }

    async updateVisualization() {
        if (!this.currentData) return;
        
        try {
            await this.ensurePlotlyLoaded();
        } catch (error) {
            console.error('Cannot update visualization - Plotly not loaded:', error);
            return;
        }
        
        const visualizationMode = this.dataVizContainer.querySelector('#visualizationMode');
        const mode = visualizationMode ? visualizationMode.value : 'standard';
        
        switch (mode) {
            case 'standard':
                this.createTimeSeriesVisualization();
                break;
            case 'moves':
                this.createMoveDetectionVisualization();
                break;
            case 'histogram':
                this.createHistogramVisualization();
                break;
            case 'heatmap':
                this.createHeatMapVisualization();
                break;
        }
        
        // Force immediate resize to fix width issues
        setTimeout(() => {
            this.resizePlot();
        }, 100);
    }

    resizePlot() {
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        if (plotDiv && typeof Plotly !== 'undefined') {
            // Get the container dimensions with better fallbacks
            const container = plotDiv.parentElement;
            let containerWidth = 800; // Default fallback width
            let containerHeight = 500; // Default height
            
            if (container) {
                // Try multiple ways to get the width
                const computedStyle = window.getComputedStyle(container);
                const clientWidth = container.clientWidth;
                const offsetWidth = container.offsetWidth;
                const boundingWidth = container.getBoundingClientRect().width;
                
                // Use the largest valid width we can find
                containerWidth = Math.max(
                    clientWidth - 40,
                    offsetWidth - 40,
                    boundingWidth - 40,
                    400 // Minimum width
                );
                
                // Ensure we have a positive width
                if (containerWidth <= 0) {
                    containerWidth = 800;
                }
            }
            
            // Update the plot size
            Plotly.relayout(plotDiv, {
                width: containerWidth,
                height: containerHeight
            });
            
            console.log(`Plot resized to: ${containerWidth}x${containerHeight}`);
        }
    }

    createTimeSeriesVisualization() {
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        if (!plotDiv || !this.currentData) return;

        // Get time range
        const timeRange = this.dataVizContainer.querySelector('#timeRange');
        const percentage = timeRange ? parseInt(timeRange.value) : 100;
        
        let { time, absoluteAcceleration } = this.currentData;
        
        // Filter data based on time range
        if (percentage < 100) {
            const maxTime = Math.max(...time);
            const cutoffTime = maxTime * percentage / 100;
            const indices = time.map((t, i) => t <= cutoffTime ? i : -1).filter(i => i !== -1);
            time = indices.map(i => time[i]);
            absoluteAcceleration = indices.map(i => absoluteAcceleration[i]);
        }

        const traces = [{
            x: time,
            y: absoluteAcceleration,
            type: 'scatter',
            mode: 'lines',
            name: 'Absolute Acceleration',
            line: { 
                color: '#00ffcc',
                width: 2
            }
        }];

        const layout = {
            title: {
                text: '📈 Absolute Acceleration vs Time',
                font: { color: '#00ffcc', size: 18 }
            },
            xaxis: { 
                title: 'Time (seconds)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            yaxis: { 
                title: 'Absolute Acceleration (m/s²)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0.8)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#00ffcc' },
            autosize: true,
            margin: { l: 60, r: 30, t: 60, b: 60 }
        };

        const config = { 
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };

        Plotly.newPlot(plotDiv, traces, layout, config).then(() => {
            // Force resize after plot creation
            setTimeout(() => {
                this.resizePlot();
            }, 100);
        });
    }

    createMoveDetectionVisualization() {
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        if (!plotDiv || !this.currentData) return;

        const thresholdRange = this.dataVizContainer.querySelector('#threshold');
        const threshold = thresholdRange ? parseFloat(thresholdRange.value) : 12.0;

        const { time, absoluteAcceleration } = this.currentData;
        
        // Detect moves
        const moves = this.detectMoves(time, absoluteAcceleration, threshold);

        const traces = [
            // Main acceleration trace
            {
                x: time,
                y: absoluteAcceleration,
            type: 'scatter',
            mode: 'lines',
            name: 'Acceleration',
                line: { color: '#00ffcc', width: 2 }
            },
            // Threshold line
            {
                x: [Math.min(...time), Math.max(...time)],
                y: [threshold, threshold],
                type: 'scatter',
                mode: 'lines',
                name: `Threshold (${threshold} m/s²)`,
                line: { color: '#ff6b6b', width: 2, dash: 'dash' }
            }
        ];

        // Add move markers
        if (moves.length > 0) {
            traces.push({
                x: moves.map(m => m.time),
                y: moves.map(m => m.acceleration),
                type: 'scatter',
                mode: 'markers',
                name: 'Detected Moves',
                marker: {
                    color: '#ff4444',
                    size: 10,
                    symbol: 'star'
                }
            });
        }

        const layout = {
            title: {
                text: `🎯 Move Detection (${moves.length} positions: start + ${moves.length - 1} moves)`,
                font: { color: '#00ffcc', size: 18 }
            },
            xaxis: { 
                title: 'Time (seconds)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            yaxis: { 
                title: 'Absolute Acceleration (m/s²)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0.8)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#00ffcc' },
            autosize: true,
            margin: { l: 60, r: 30, t: 60, b: 60 }
        };

        const config = { 
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };

        Plotly.newPlot(plotDiv, traces, layout, config).then(() => {
            // Force resize after plot creation
            setTimeout(() => {
                this.resizePlot();
            }, 100);
        });
    }

    createHistogramVisualization() {
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        if (!plotDiv || !this.currentData) return;

        const traces = [{
            x: this.currentData.absoluteAcceleration,
            type: 'histogram',
            name: 'Acceleration Distribution',
            marker: { color: '#00ffcc', opacity: 0.7 },
            nbinsx: 50
        }];
        
        const layout = {
            title: {
                text: '📊 Acceleration Distribution',
                font: { color: '#00ffcc', size: 18 }
            },
            xaxis: { 
                title: 'Absolute Acceleration (m/s²)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            yaxis: { 
                title: 'Frequency',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0.8)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#00ffcc' },
            autosize: true,
            margin: { l: 60, r: 30, t: 60, b: 60 }
        };

        const config = { 
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot(plotDiv, traces, layout, config).then(() => {
            // Force resize after plot creation
            setTimeout(() => {
                this.resizePlot();
            }, 100);
        });
    }

    createHeatMapVisualization() {
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        if (!plotDiv || !this.currentData) return;

        const { time, absoluteAcceleration } = this.currentData;
        
        // Create 2D heatmap data by windowing
        const windowSize = 100;
        const stepSize = 20;
        const heatmapData = [];
        const xLabels = [];
        
        for (let i = 0; i < time.length - windowSize; i += stepSize) {
            const window = absoluteAcceleration.slice(i, i + windowSize);
            heatmapData.push(window);
            xLabels.push(time[i].toFixed(1));
        }
        
        const traces = [{
            z: heatmapData,
            type: 'heatmap',
            colorscale: [
                [0, '#000033'],
                [0.3, '#000066'],
                [0.5, '#0066cc'],
                [0.7, '#00ffcc'],
                [1, '#ffffff']
            ],
            showscale: true
        }];
        
        const layout = {
            title: {
                text: '🔥 Acceleration Intensity Heat Map',
                font: { color: '#00ffcc', size: 18 }
            },
            xaxis: {
                title: 'Time Windows',
                color: '#00ffcc'
            },
            yaxis: {
                title: 'Sample Index',
                color: '#00ffcc'
            },
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            plot_bgcolor: 'rgba(0, 0, 0, 0.8)',
            font: { color: '#00ffcc' },
            autosize: true,
            margin: { l: 60, r: 30, t: 60, b: 60 }
        };

        const config = { 
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot(plotDiv, traces, layout, config).then(() => {
            // Force resize after plot creation
            setTimeout(() => {
                this.resizePlot();
            }, 100);
        });
    }

    detectMoves(time, acceleration, threshold) {
        const detectedMoves = [];
        const minMoveDuration = 0.5; // minimum seconds between moves
        
        let lastMoveTime = -minMoveDuration;
        
        // First, detect all the actual moves
        for (let i = 1; i < acceleration.length - 1; i++) {
            const currentAccel = acceleration[i];
            const currentTime = time[i];
            
            // Look for peaks above threshold
            if (currentAccel > threshold && 
                currentAccel > acceleration[i-1] && 
                currentAccel > acceleration[i+1] &&
                (currentTime - lastMoveTime) > minMoveDuration) {
                
                detectedMoves.push({
                    time: currentTime,
                    acceleration: currentAccel
                });
                
                lastMoveTime = currentTime;
            }
        }
        
        // Create the complete moves array including starting position
        const moves = [];
        
        // Add starting position at time 0 (position 0)
        moves.push({
            time: 0,
            acceleration: acceleration[0] || 9.8 // Use first acceleration value or gravity
        });
        
        // Add all detected moves (positions 1, 2, 3, etc.)
        moves.push(...detectedMoves);
        
        return moves;
    }

    updateStatistics() {
        if (!this.currentData) return;

        let absoluteAcceleration, time, duration, sampleCount;
        
        // Handle different data structures (live data vs CSV data)
        if (this.currentData.isLive && this.currentData.buffer) {
            // Live data structure
            const buffer = this.currentData.buffer;
            time = buffer.time;
            
            // Calculate magnitude from live data components
            if (buffer.accX && buffer.accY && buffer.accZ && 
                buffer.accX.length === buffer.accY.length && 
                buffer.accY.length === buffer.accZ.length) {
                
                absoluteAcceleration = buffer.accX.map((x, i) => {
                    const mag = Math.sqrt(x * x + buffer.accY[i] * buffer.accY[i] + buffer.accZ[i] * buffer.accZ[i]);
                    return isFinite(mag) ? mag : 0;
                });
            } else {
                console.warn('[DataVizIntegration] Invalid live data structure for statistics');
                return;
            }
            
            duration = time.length > 0 ? time[time.length - 1] - time[0] : 0;
            sampleCount = time.length;
        } else {
            // Regular CSV data structure
            absoluteAcceleration = this.currentData.absoluteAcceleration;
            time = this.currentData.time;
            duration = this.currentData.duration;
            sampleCount = this.currentData.sampleCount;
        }
        
        // Validate data before processing
        if (!absoluteAcceleration || !Array.isArray(absoluteAcceleration) || absoluteAcceleration.length === 0) {
            console.warn('[DataVizIntegration] No valid acceleration data for statistics');
            return;
        }
        
        const maxAccel = Math.max(...absoluteAcceleration);
        const avgAccel = absoluteAcceleration.reduce((a, b) => a + b, 0) / absoluteAcceleration.length;
        
        // Count moves with current threshold
        const thresholdRange = this.dataVizContainer.querySelector('#threshold'); // Fixed ID
        const threshold = thresholdRange ? parseFloat(thresholdRange.value) : 12.0; // Updated default
        const moves = this.detectMoves(time || [], absoluteAcceleration, threshold);
        
        // Update statistics display
        const maxAccelEl = this.dataVizContainer.querySelector('#maxAccel');
        const avgAccelEl = this.dataVizContainer.querySelector('#avgAccel');
        const moveCountEl = this.dataVizContainer.querySelector('#moveCount');
        const durationEl = this.dataVizContainer.querySelector('#duration');
        const sampleCountEl = this.dataVizContainer.querySelector('#sampleCount');

        if (maxAccelEl) maxAccelEl.textContent = maxAccel.toFixed(2);
        if (avgAccelEl) avgAccelEl.textContent = avgAccel.toFixed(2);
        if (moveCountEl) moveCountEl.textContent = moves.length;
        if (durationEl) durationEl.textContent = (duration || 0).toFixed(1);
        if (sampleCountEl) sampleCountEl.textContent = sampleCount || 0;
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Loading file:', file.name);
        
        try {
            const text = await file.text();
            const parsedData = this.parsePhyphoxCSV(text, file.name);
            
            if (parsedData) {
                this.currentData = parsedData;
                this.updateVisualization();
                this.updateStatistics();
                
                this.showNotification('File loaded successfully!', 'success');
            } else {
                this.showNotification('Failed to parse CSV file. Please check the format.', 'error');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            this.showNotification('Error loading file: ' + error.message, 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    parsePhyphoxCSV(csvText, filename) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return null;
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('CSV Headers:', headers);

        // Find required columns
        let timeCol = -1, absAccelCol = -1;
        
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase();
            if (header.includes('time') && header.includes('s')) {
                timeCol = i;
            } else if (header.includes('absolute acceleration')) {
                absAccelCol = i;
            }
        }

        if (timeCol === -1 || absAccelCol === -1) {
            console.error('Could not find required columns');
            return null;
        }

        const time = [];
        const absoluteAcceleration = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => {
                const num = parseFloat(v.trim().replace(/"/g, ''));
                return isNaN(num) ? 0 : num;
            });

            if (values.length <= Math.max(timeCol, absAccelCol)) continue;

            const timeVal = values[timeCol];
            const accelVal = values[absAccelCol];

            if (!isNaN(timeVal) && !isNaN(accelVal) && accelVal > 0) {
                time.push(timeVal);
                absoluteAcceleration.push(accelVal);
            }
        }

        if (time.length === 0) return null;

        return {
            time,
            absoluteAcceleration,
            filename,
            duration: Math.max(...time) - Math.min(...time),
            maxAcceleration: Math.max(...absoluteAcceleration),
            avgAcceleration: absoluteAcceleration.reduce((a, b) => a + b, 0) / absoluteAcceleration.length,
            sampleCount: time.length
        };
    }
    
    exportData() {
        if (!this.currentData) {
            this.showNotification('No data to export', 'error');
            return;
        }
        
        const { time, absoluteAcceleration } = this.currentData;

        // Create CSV content
        let csvContent = 'Time (s),Absolute Acceleration (m/s²)\n';
        
        for (let i = 0; i < time.length; i++) {
            csvContent += `${time[i]},${absoluteAcceleration[i]}\n`;
        }

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `climbing_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showNotification('Data exported successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.dataviz-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'dataviz-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1004;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;

        const colors = {
            success: 'rgba(40, 167, 69, 0.95)',
            error: 'rgba(220, 53, 69, 0.95)',
            info: 'rgba(23, 162, 184, 0.95)'
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
    
    // Show the DataViz interface
    show() {
        if (this.dataVizContainer) {
            this.dataVizContainer.style.display = 'block';
            console.log('DataViz interface shown');
            
            // Force resize after showing to fix width issues
            setTimeout(() => {
                this.resizePlot();
                
                // Auto-refresh data when switching to this view
                this.refreshCurrentData();
            }, 200);
        }
    }
    
    // Auto-refresh current data when switching views
    async refreshCurrentData() {
        console.log('[DataVizIntegration] Auto-refreshing data on view switch');
        
        if (this.isDisplayingLiveData()) {
            // For live data, refresh with current buffer
            const currentBuffer = this.currentData?.buffer;
            if (currentBuffer) {
                console.log('[DataVizIntegration] Refreshing live data visualization');
                await this.createLiveDataPlot(currentBuffer);
            }
        } else if (this.currentBoulder && this.currentData) {
            // For CSV data, refresh visualization and statistics
            console.log('[DataVizIntegration] Refreshing CSV data visualization');
            await this.updateVisualization();
            this.updateStatistics();
        }
    }

    // Hide the DataViz interface
    hide() {
        if (this.dataVizContainer) {
        this.dataVizContainer.style.display = 'none';
            console.log('DataViz interface hidden');
    }
    }

    // Update with boulder data from the 3D visualizer
    async updateWithBoulderData(boulder) {
        console.log('Updating DataViz with boulder data:', boulder.name);
        
        if (!boulder || !boulder.csvData) {
            console.log('No valid CSV data in boulder');
            return;
        }
        
        // Store current boulder for move regeneration
        this.currentBoulder = boulder;
        
        await this.loadCSVData(boulder);
    }

    // Destroy the DataViz integration
    destroy() {
        if (this.dataVizContainer && this.dataVizContainer.parentElement) {
            this.dataVizContainer.remove();
        }
        console.log('DataViz integration destroyed');
    }

    // Emit control change event
    emitControlChange(controlName, value) {
        // Emit global event for cross-view sync
        document.dispatchEvent(new CustomEvent('controlChanged', {
            detail: { 
                source: 'dataviz', 
                controlName, 
                value 
            }
        }));
    }
    
    syncCSVSelection(boulderId) {
        // Update the CSV file selection dropdown without triggering onChange
        const csvFileSelect = this.dataVizContainer.querySelector('#csvFileSelect');
        if (csvFileSelect && csvFileSelect.value != boulderId) {
            csvFileSelect.value = boulderId;
            console.log(`DataViz synced to boulder ID: ${boulderId}`);
        }
    }

    async regenerateMovesAndSync() {
        // Get the current threshold value
        const thresholdSlider = this.dataVizContainer.querySelector('#threshold'); // Fixed ID
        const newThreshold = thresholdSlider ? parseFloat(thresholdSlider.value) : 12.0;
        
        // Handle live data differently than CSV data
        if (this.isDisplayingLiveData()) {
            console.log(`[DataVizIntegration] Updating live data threshold to ${newThreshold}`);
            
            // For live data, emit threshold change to boulder visualizer
            document.dispatchEvent(new CustomEvent('thresholdChanged', {
                detail: {
                    source: 'dataviz',
                    threshold: newThreshold,
                    isLiveData: true
                }
            }));
            
            return; // Live data doesn't need move regeneration here
        }
        
        // Handle CSV data
        if (!this.currentBoulder) {
            console.warn('[DataVizIntegration] No current boulder for move regeneration');
            return;
        }
        
        console.log(`[DataVizIntegration] Regenerating moves with threshold ${newThreshold} for boulder ${this.currentBoulder.name}`);
        
        try {
            // Use the detectMoves method from this class instead of importing
            if (this.currentData && this.currentData.time && this.currentData.absoluteAcceleration) {
                const newMoves = this.detectMoves(this.currentData.time, this.currentData.absoluteAcceleration, newThreshold);
                
                // Update the boulder object with new moves
                this.currentBoulder.moves = newMoves.map((move, index) => ({
                    id: index,
                    time: move.time,
                    type: index === 0 ? 'start' : 'move', // First move is always start, others are moves
                    dynamics: index === 0 ? 0.5 : Math.max(0.1, Math.min(1.0, move.acceleration / 30)), // Starting position has neutral dynamics
                    isCrux: index === 0 ? false : move.acceleration > (newThreshold * 1.5), // Starting position is never crux
                    x: Math.cos(index * 0.8) * (25 + index * 5),
                    y: Math.sin(index * 0.8) * (25 + index * 5),
                    z: Math.max(0, index * 2),
                    magnitude: move.acceleration
                }));
                
                // Sync the updated boulder to the Boulder visualizer
                document.dispatchEvent(new CustomEvent('dataUpdated', {
                    detail: {
                        source: 'dataviz',
                        data: this.currentBoulder
                    }
                }));
                
                console.log(`[DataVizIntegration] Regenerated ${newMoves.length} moves and synced to Boulder visualizer`);
            } else {
                console.warn('[DataVizIntegration] No valid current data for move regeneration');
            }
        } catch (error) {
            console.error('[DataVizIntegration] Error regenerating moves:', error);
        }
    }

    // Live data support for remote streaming
    updateWithLiveData(dataBuffer) {
        if (!dataBuffer || !dataBuffer.time || dataBuffer.time.length === 0) {
            return;
        }

        // Mark as live data
        this.currentData = {
            isLive: true,
            buffer: dataBuffer,
            lastUpdate: Date.now()
        };

        // Auto-adjust time range for live data to show recent data
        this.autoAdjustTimeRangeForLiveData(dataBuffer);

        // Create live data traces for plotting
        this.createLiveDataPlot(dataBuffer);
    }

    autoAdjustTimeRangeForLiveData(dataBuffer) {
        const timeRangeSlider = this.dataVizContainer.querySelector('#timeRange');
        const timeValueDisplay = this.dataVizContainer.querySelector('#timeValue');
        
        if (!timeRangeSlider || !timeValueDisplay || !dataBuffer.time.length) {
            return;
        }

        const totalDuration = dataBuffer.time[dataBuffer.time.length - 1] - dataBuffer.time[0];
        
        // For live data, show the complete accumulated timeline
        // The timeline grows from left to right as data accumulates
        timeRangeSlider.value = 100; // Always show 100% of accumulated data
        
        // Display the actual duration of accumulated data
        timeValueDisplay.textContent = `${totalDuration.toFixed(1)}s Total 🔴 LIVE`;
    }

    async createLiveDataPlot(dataBuffer) {
        await this.ensurePlotlyLoaded();
        
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        if (!plotDiv || !dataBuffer) return;

        const { time: timeData, accX: accXData, accY: accYData, accZ: accZData } = dataBuffer;
        
        if (!timeData || !accXData || !accYData || !accZData || timeData.length === 0) {
            console.warn('[DataVizIntegration] Invalid live data buffer for plotting');
            return;
        }

        // Calculate absolute acceleration magnitude (like CSV files)
        const magnitudeData = timeData.map((_, i) => {
            const mag = Math.sqrt(
                accXData[i] * accXData[i] + 
                accYData[i] * accYData[i] + 
                accZData[i] * accZData[i]
            );
            return isFinite(mag) ? mag : 0;
        });

        // Create traces - show magnitude prominently like CSV files
        const traces = [
            {
                x: timeData,
                y: magnitudeData,
                type: 'scatter',
                mode: 'lines',
                name: 'Absolute Acceleration',
                line: { color: '#00ffcc', width: 3 },
                visible: true
            },
            {
                x: timeData,
                y: accXData,
                type: 'scatter',
                mode: 'lines',
                name: 'Acceleration X',
                line: { color: '#ff6b6b', width: 1 },
                visible: 'legendonly' // Hidden by default
            },
            {
                x: timeData,
                y: accYData,
                type: 'scatter',
                mode: 'lines',
                name: 'Acceleration Y',
                line: { color: '#4ecdc4', width: 1 },
                visible: 'legendonly' // Hidden by default
            },
            {
                x: timeData,
                y: accZData,
                type: 'scatter',
                mode: 'lines',
                name: 'Acceleration Z',
                line: { color: '#45b7d1', width: 1 },
                visible: 'legendonly' // Hidden by default
            }
        ];

        // Add move detection overlay if enabled
        const visualizationMode = this.dataVizContainer.querySelector('#visualizationMode')?.value;
        if (visualizationMode === 'moves') {
            const threshold = parseFloat(this.dataVizContainer.querySelector('#threshold')?.value) || 12.0;
            const moves = this.detectMoves(timeData, magnitudeData, threshold); // Use magnitude for move detection
            
            if (moves.length > 0) {
                // Add threshold line
                traces.push({
                    x: [timeData[0], timeData[timeData.length - 1]],
                    y: [threshold, threshold],
                    type: 'scatter',
                    mode: 'lines',
                    name: `Threshold (${threshold})`,
                    line: { color: '#ff4757', width: 2, dash: 'dash' }
                });

                // Add move markers
                const moveX = moves.map(move => move.time);
                const moveY = moves.map(move => move.acceleration);
                
                traces.push({
                    x: moveX,
                    y: moveY,
                    type: 'scatter',
                    mode: 'markers',
                    name: 'Detected Moves',
                    marker: { 
                        color: '#ffa502', 
                        size: 10,
                        symbol: 'star'
                    }
                });
            }
        }

        const layout = {
            title: {
                text: '📈 Live Acceleration Data (Absolute Magnitude)',
                font: { color: '#00ffcc', size: 18 }
            },
            xaxis: { 
                title: 'Time (seconds)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            yaxis: { 
                title: 'Acceleration (m/s²)',
                color: '#00ffcc',
                gridcolor: 'rgba(0, 255, 204, 0.2)'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0.8)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#00ffcc' },
            autosize: true,
            margin: { l: 60, r: 30, t: 60, b: 60 },
            showlegend: true,
            legend: {
                x: 1,
                y: 1,
                bgcolor: 'rgba(0, 0, 0, 0.5)'
            }
        };

        const config = {
            responsive: true,
            displayModeBar: false
        };

        try {
            await Plotly.newPlot(plotDiv, traces, layout, config);
            
            // Update statistics with magnitude data
            this.updateLiveDataStatistics(dataBuffer, magnitudeData);
            
        } catch (error) {
            console.error('[DataVizIntegration] Error creating live data plot:', error);
        }
    }

    updateLiveDataStatistics(dataBuffer, magnitudeData) {
        // Update statistics display with live data
        const maxAccel = Math.max(...magnitudeData);
        const avgAccel = magnitudeData.reduce((a, b) => a + b, 0) / magnitudeData.length;
        const duration = dataBuffer.time.length > 0 ? 
            dataBuffer.time[dataBuffer.time.length - 1] - dataBuffer.time[0] : 0;

        // Detect moves in live data using same threshold as backend
        const thresholdInput = this.dataVizContainer.querySelector('#threshold');
        const defaultThreshold = 12.0; // Same default as backend for consistency
        const threshold = thresholdInput ? parseFloat(thresholdInput.value) : defaultThreshold;
        const moves = this.detectMoves(dataBuffer.time, magnitudeData, threshold);

        // Update UI elements
        const maxAccelEl = this.dataVizContainer.querySelector('#maxAccel');
        const avgAccelEl = this.dataVizContainer.querySelector('#avgAccel');
        const moveCountEl = this.dataVizContainer.querySelector('#moveCount');
        const durationEl = this.dataVizContainer.querySelector('#duration');
        const sampleCountEl = this.dataVizContainer.querySelector('#sampleCount');

        if (maxAccelEl) maxAccelEl.textContent = maxAccel.toFixed(1);
        if (avgAccelEl) avgAccelEl.textContent = avgAccel.toFixed(1);
        if (moveCountEl) moveCountEl.textContent = moves.length;
        if (durationEl) durationEl.textContent = duration.toFixed(1);
        if (sampleCountEl) sampleCountEl.textContent = dataBuffer.time.length;
    }

    // Check if currently displaying live data
    isDisplayingLiveData() {
        return this.currentData && this.currentData.isLive;
    }

    // Clear live data and return to normal mode
    clearLiveData() {
        if (this.isDisplayingLiveData()) {
            this.currentData = null;
            const plotContainer = this.dataVizContainer.querySelector('#accelerationPlot');
            if (plotContainer) {
                Plotly.purge(plotContainer);
            }
            
            // Remove live indicator from time display
            const timeValueDisplay = this.dataVizContainer.querySelector('#timeValue');
            if (timeValueDisplay && timeValueDisplay.textContent.includes('🔴')) {
                timeValueDisplay.textContent = timeValueDisplay.textContent.replace(' 🔴 LIVE', '');
            }
        }
    }

    // Get live data status
    getLiveDataStatus() {
        return {
            isDisplayingLive: this.isDisplayingLiveData(),
            lastUpdate: Date.now()
        };
    }
} 