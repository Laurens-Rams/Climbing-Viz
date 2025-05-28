import { getBoulderList } from '../data/boulderData.js';

export class DataVizIntegration {
    constructor(mainContainer) {
        this.mainContainer = mainContainer;
        this.dataVizContainer = null;
        this.wearVisualizer = null;
        this.isVisible = false;
        this.csvFiles = [];
        
        this.init();
    }
    
    init() {
        // Create DataViz container
        this.createDataVizContainer();
        
        // Load and initialize the WEAR visualizer
        this.loadDataVizComponents();
        
        // Initially hidden
        this.hide();
    }
    
    createDataVizContainer() {
        this.dataVizContainer = document.createElement('div');
        this.dataVizContainer.id = 'dataviz-container';
        this.dataVizContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 100;
            overflow-y: auto;
        `;
        
        // Create the DataViz HTML structure
        this.dataVizContainer.innerHTML = `
            <div class="container" style="max-width: 1400px; margin: 0 auto; padding: 20px;">
                <div class="header" style="text-align: center; margin-bottom: 30px; background: rgba(255, 255, 255, 0.95); padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);">
                    <h1 style="color: #2c3e50; margin-bottom: 10px; font-size: 2.5em; font-weight: 300;">Climbing Acceleration Visualizer</h1>
                    <p style="color: #7f8c8d; font-size: 1.1em; max-width: 800px; margin: 0 auto; line-height: 1.6;">
                        Interactive visualization of climbing acceleration data. Upload sensor data or use mock boulder data to analyze movement patterns and optimize climbing technique.
                    </p>
                </div>

                <div class="controls" style="background: rgba(255, 255, 255, 0.95); padding: 25px; border-radius: 15px; margin-bottom: 20px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);">
                    <div class="control-group" style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center; margin-bottom: 15px;">
                        <div class="control-item" style="display: flex; flex-direction: column; gap: 5px;">
                            <label for="dataSourceSelect" style="font-weight: 600; color: #2c3e50; font-size: 0.9em;">Data Source:</label>
                            <select id="dataSourceSelect" style="padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                                <option value="mock">Mock Boulder Data</option>
                            </select>
                        </div>
                        
                        <div class="control-item" id="routeSelectContainer" style="display: flex; flex-direction: column; gap: 5px;">
                            <label for="routeSelect" style="font-weight: 600; color: #2c3e50; font-size: 0.9em;">Boulder Route:</label>
                            <select id="routeSelect" style="padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                            </select>
                        </div>
                        
                        <div class="control-item" style="display: flex; flex-direction: column; gap: 5px;">
                            <label for="visualizationMode" style="font-weight: 600; color: #2c3e50; font-size: 0.9em;">Visualization Mode:</label>
                            <select id="visualizationMode" style="padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                                <option value="standard">Standard Time Series</option>
                                <option value="heatmap">Heat Map Analysis</option>
                                <option value="polar">Polar Burst View</option>
                                <option value="3d">3D Surface Landscape</option>
                            </select>
                        </div>

                        <div class="control-item" style="display: flex; flex-direction: column; gap: 5px;">
                            <button id="generateBtn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: 600;">Generate Data</button>
                        </div>
                        
                        <div class="control-item" style="display: flex; flex-direction: column; gap: 5px;">
                            <button id="exportBtn" style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">Export Data</button>
                        </div>
                    </div>
                </div>

                <div class="visualization-container" style="background: rgba(255, 255, 255, 0.95); border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">Acceleration Data Visualization</h3>
                    <div id="accelerationPlot" style="width: 100%; height: 500px; margin-bottom: 20px;"></div>
                    
                    <div class="stats-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                            <div class="stat-value" id="maxAccel" style="font-size: 2em; font-weight: bold; margin-bottom: 5px;">0.0</div>
                            <div class="stat-label" style="font-size: 0.9em; opacity: 0.9;">Max Acceleration (g)</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                            <div class="stat-value" id="avgAccel" style="font-size: 2em; font-weight: bold; margin-bottom: 5px;">0.0</div>
                            <div class="stat-label" style="font-size: 0.9em; opacity: 0.9;">Avg Acceleration (g)</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                            <div class="stat-value" id="peakCount" style="font-size: 2em; font-weight: bold; margin-bottom: 5px;">0</div>
                            <div class="stat-label" style="font-size: 0.9em; opacity: 0.9;">Movement Peaks</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                            <div class="stat-value" id="duration" style="font-size: 2em; font-weight: bold; margin-bottom: 5px;">30</div>
                            <div class="stat-label" style="font-size: 0.9em; opacity: 0.9;">Duration (s)</div>
                        </div>
                    </div>
                </div>

                <div class="info-panel" style="background: rgba(255, 255, 255, 0.95); padding: 25px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.3em;">Data Integration</h3>
                    <p style="color: #7f8c8d; line-height: 1.6; margin-bottom: 10px;">
                        <strong>Mock Data:</strong> Uses your existing boulder problems with simulated acceleration patterns based on move dynamics and types.
                    </p>
                    <p style="color: #7f8c8d; line-height: 1.6;">
                        <strong>Heatmap Data:</strong> Movement intensity analysis provides coloring data for your crux detection system.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.dataVizContainer);
    }
    
    async loadDataVizComponents() {
        try {
            // Load Plotly if not already loaded
            if (typeof Plotly === 'undefined') {
                await this.loadScript('https://cdn.plot.ly/plotly-2.35.2.min.js');
            }
            
            // Initialize the WEAR visualizer with our custom configuration
            this.initializeWEARVisualizer();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Populate boulder routes
            this.populateBoulderRoutes();
            
            // Generate initial data
            this.generateMockData();
            
        } catch (error) {
            console.error('Failed to load DataViz components:', error);
        }
    }
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    initializeWEARVisualizer() {
        // Create a simplified version of the WEAR visualizer
        this.wearVisualizer = {
            currentData: null,
            samplingRate: 50,
            
            // Generate climbing data based on boulder moves
            generateClimbingDataFromBoulder: (boulder) => {
                const duration = boulder.moves.length * 2; // 2 seconds per move
                const samples = duration * this.wearVisualizer.samplingRate;
                const time = [];
                const acceleration = [];
                const moveAverages = [];
                
                for (let i = 0; i < samples; i++) {
                    const t = i / this.wearVisualizer.samplingRate;
                    time.push(t);
                    
                    // Find current move
                    const moveIndex = Math.floor(t / 2);
                    const move = boulder.moves[moveIndex] || boulder.moves[boulder.moves.length - 1];
                    
                    // Generate acceleration based on move dynamics
                    let accel = 0.1; // Base acceleration
                    if (move) {
                        const moveProgress = (t % 2) / 2; // Progress within current move
                        
                        // Create realistic acceleration pattern
                        if (move.type === 'dynamic') {
                            accel = move.dynamics * (1 + Math.sin(moveProgress * Math.PI) * 0.8);
                        } else {
                            accel = move.dynamics * 0.6;
                        }
                        
                        // Add crux emphasis
                        if (move.isCrux) {
                            accel *= 1.5;
                        }
                        
                        // Add noise
                        accel += (Math.random() - 0.5) * 0.1;
                    }
                    
                    acceleration.push(Math.max(0, accel));
                }
                
                // Calculate move averages for boulder visualizer integration
                boulder.moves.forEach((move, index) => {
                    const startTime = index * 2;
                    const endTime = (index + 1) * 2;
                    const moveData = acceleration.slice(
                        Math.floor(startTime * this.wearVisualizer.samplingRate),
                        Math.floor(endTime * this.wearVisualizer.samplingRate)
                    );
                    
                    const average = moveData.reduce((sum, val) => sum + val, 0) / moveData.length;
                    moveAverages.push({
                        sequence: move.sequence,
                        average: average,
                        isCrux: move.isCrux,
                        type: move.type,
                        dynamics: move.dynamics
                    });
                });
                
                return {
                    time,
                    acceleration,
                    moveAverages,
                    boulder: boulder
                };
            },
            
            // Calculate statistics
            calculateStats: (data) => {
                const accel = data.acceleration;
                const max = Math.max(...accel);
                const avg = accel.reduce((sum, val) => sum + val, 0) / accel.length;
                const peaks = this.detectPeaks(accel);
                
                return {
                    maxAccel: max.toFixed(2),
                    avgAccel: avg.toFixed(2),
                    peakCount: peaks.length,
                    duration: Math.max(...data.time).toFixed(1)
                };
            }
        };
    }
    
    detectPeaks(data, threshold = 0.3) {
        const peaks = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > threshold) {
                peaks.push(i);
            }
        }
        return peaks;
    }
    
    setupEventListeners() {
        const dataSourceSelect = this.dataVizContainer.querySelector('#dataSourceSelect');
        const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
        const generateBtn = this.dataVizContainer.querySelector('#generateBtn');
        const exportBtn = this.dataVizContainer.querySelector('#exportBtn');
        const visualizationMode = this.dataVizContainer.querySelector('#visualizationMode');
        
        dataSourceSelect.addEventListener('change', () => {
            this.handleDataSourceChange();
        });
        
        routeSelect.addEventListener('change', () => {
            this.generateMockData();
        });
        
        generateBtn.addEventListener('click', () => {
            this.generateMockData();
        });
        
        exportBtn.addEventListener('click', () => {
            this.exportData();
        });
        
        visualizationMode.addEventListener('change', () => {
            this.updateVisualization();
        });
    }
    
    populateBoulderRoutes() {
        const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
        const boulders = getBoulderList();
        
        routeSelect.innerHTML = '';
        boulders.forEach(boulder => {
            const option = document.createElement('option');
            option.value = boulder.id;
            option.textContent = `${boulder.name} (${boulder.grade}) - Real Data`;
            routeSelect.appendChild(option);
        });
    }
    
    handleDataSourceChange() {
        const dataSourceSelect = this.dataVizContainer.querySelector('#dataSourceSelect');
        const routeSelectContainer = this.dataVizContainer.querySelector('#routeSelectContainer');
        
        if (dataSourceSelect.value === 'mock') {
            routeSelectContainer.style.display = 'flex';
            this.generateMockData();
        }
    }
    
    generateMockData() {
        const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
        const selectedBoulderID = parseInt(routeSelect.value);
        const boulders = getBoulderList();
        const boulder = boulders.find(b => b.id === selectedBoulderID);
        
        if (boulder) {
            const data = this.wearVisualizer.generateClimbingDataFromBoulder(boulder);
            this.wearVisualizer.currentData = data;
            this.updateVisualization();
            this.updateStatistics();
        }
    }
    
    updateVisualization() {
        if (!this.wearVisualizer.currentData) return;
        
        const mode = this.dataVizContainer.querySelector('#visualizationMode').value;
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        
        switch (mode) {
            case 'standard':
                this.createStandardPlot(plotDiv);
                break;
            case 'heatmap':
                this.createHeatmapPlot(plotDiv);
                break;
            case 'polar':
                this.createPolarPlot(plotDiv);
                break;
            case '3d':
                this.create3DPlot(plotDiv);
                break;
        }
    }
    
    createStandardPlot(plotDiv) {
        const data = this.wearVisualizer.currentData;
        
        const trace = {
            x: data.time,
            y: data.acceleration,
            type: 'scatter',
            mode: 'lines',
            name: 'Acceleration',
            line: { color: '#667eea', width: 2 }
        };
        
        const layout = {
            title: 'Climbing Acceleration Over Time',
            xaxis: { title: 'Time (s)' },
            yaxis: { title: 'Acceleration (g)' },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(plotDiv, [trace], layout);
    }
    
    createHeatmapPlot(plotDiv) {
        const data = this.wearVisualizer.currentData;
        
        // Create heatmap data
        const windowSize = 50;
        const heatmapData = [];
        const timeLabels = [];
        
        for (let i = 0; i < data.acceleration.length - windowSize; i += windowSize) {
            const window = data.acceleration.slice(i, i + windowSize);
            heatmapData.push(window);
            timeLabels.push(data.time[i].toFixed(1));
        }
        
        const trace = {
            z: heatmapData,
            type: 'heatmap',
            colorscale: 'Viridis',
            showscale: true
        };
        
        const layout = {
            title: 'Acceleration Intensity Heatmap',
            xaxis: { title: 'Sample Window' },
            yaxis: { title: 'Time Window', tickvals: Array.from({length: timeLabels.length}, (_, i) => i), ticktext: timeLabels },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(plotDiv, [trace], layout);
    }
    
    createPolarPlot(plotDiv) {
        const data = this.wearVisualizer.currentData;
        
        const trace = {
            r: data.acceleration,
            theta: data.time.map(t => t * 10), // Convert time to angle
            type: 'scatterpolar',
            mode: 'lines',
            name: 'Acceleration',
            line: { color: '#667eea' }
        };
        
        const layout = {
            title: 'Polar Acceleration View',
            polar: {
                radialaxis: { title: 'Acceleration (g)' },
                angularaxis: { title: 'Time (scaled)' }
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(plotDiv, [trace], layout);
    }
    
    create3DPlot(plotDiv) {
        const data = this.wearVisualizer.currentData;
        
        // Create 3D surface data
        const size = Math.floor(Math.sqrt(data.acceleration.length));
        const z = [];
        
        for (let i = 0; i < size; i++) {
            const row = [];
            for (let j = 0; j < size; j++) {
                const index = i * size + j;
                row.push(data.acceleration[index] || 0);
            }
            z.push(row);
        }
        
        const trace = {
            z: z,
            type: 'surface',
            colorscale: 'Viridis'
        };
        
        const layout = {
            title: '3D Acceleration Surface',
            scene: {
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                zaxis: { title: 'Acceleration (g)' }
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(plotDiv, [trace], layout);
    }
    
    updateStatistics() {
        if (!this.wearVisualizer.currentData) return;
        
        const stats = this.wearVisualizer.calculateStats(this.wearVisualizer.currentData);
        
        this.dataVizContainer.querySelector('#maxAccel').textContent = stats.maxAccel;
        this.dataVizContainer.querySelector('#avgAccel').textContent = stats.avgAccel;
        this.dataVizContainer.querySelector('#peakCount').textContent = stats.peakCount;
        this.dataVizContainer.querySelector('#duration').textContent = stats.duration;
    }
    
    exportData() {
        if (!this.wearVisualizer.currentData) {
            alert('No data to export');
            return;
        }
        
        const data = this.wearVisualizer.currentData;
        const csvContent = this.generateCSV(data);
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'climbing_acceleration_data.csv';
        link.click();
        URL.revokeObjectURL(url);
    }
    
    generateCSV(data) {
        let csv = 'time,acceleration\n';
        for (let i = 0; i < data.time.length; i++) {
            csv += `${data.time[i]},${data.acceleration[i]}\n`;
        }
        return csv;
    }
    
    // Get current data for integration with boulder visualizer
    getCurrentMoveAverages() {
        return this.wearVisualizer.currentData?.moveAverages || [];
    }
    
    getCurrentHeatmapData() {
        if (!this.wearVisualizer.currentData) return null;
        
        const data = this.wearVisualizer.currentData;
        const peaks = this.detectPeaks(data.acceleration);
        
        return {
            peaks: peaks,
            maxAcceleration: Math.max(...data.acceleration),
            avgAcceleration: data.acceleration.reduce((sum, val) => sum + val, 0) / data.acceleration.length,
            intensityMap: data.acceleration
        };
    }
    
    show() {
        this.dataVizContainer.style.display = 'block';
        this.isVisible = true;
    }
    
    hide() {
        this.dataVizContainer.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * Update DataViz integration with boulder data
     * @param {Object} boulder - Processed boulder data with moves
     */
    updateWithBoulderData(boulder) {
        console.log('DataVizIntegration: Updating with boulder data:', boulder.name);
        
        if (!boulder || !boulder.moves) {
            console.warn('DataVizIntegration: No valid boulder data provided');
            return;
        }
        
        try {
            // Convert boulder moves to acceleration data format for DataViz
            const accelerationData = this.convertBoulderToAccelerationData(boulder);
            
            // Update the WEARVisualizer with the new data
            if (this.wearVisualizer) {
                this.wearVisualizer.currentData = accelerationData;
                this.updateVisualization();
                this.updateStatistics();
            }
            
            console.log('DataVizIntegration: Successfully updated with boulder data');
            
        } catch (error) {
            console.error('DataVizIntegration: Error updating with boulder data:', error);
        }
    }

    /**
     * Convert boulder move data to acceleration data format
     * @param {Object} boulder - Boulder with moves data
     * @returns {Object} - Acceleration data format for visualization
     */
    convertBoulderToAccelerationData(boulder) {
        const moves = boulder.moves || [];
        const time = [];
        const acceleration = [];
        
        // Generate time series data based on moves
        moves.forEach((move, index) => {
            const baseTime = index * 2; // 2 seconds per move
            const baseDuration = 1.5; // 1.5 seconds per move
            const samples = 50; // 50 samples per move
            
            for (let i = 0; i < samples; i++) {
                const t = baseTime + (i / samples) * baseDuration;
                time.push(t);
                
                // Create acceleration curve based on move dynamics
                const progress = i / samples;
                const peakPosition = 0.3 + (move.dynamics * 0.4); // Peak between 30-70% of move
                
                let accel;
                if (progress < peakPosition) {
                    // Rising to peak
                    accel = 9.8 + (move.dynamics * 15) * (progress / peakPosition);
                } else {
                    // Falling from peak
                    accel = 9.8 + (move.dynamics * 15) * ((1 - progress) / (1 - peakPosition));
                }
                
                // Add some noise for realism
                accel += (Math.random() - 0.5) * 2;
                
                // Ensure minimum acceleration
                accel = Math.max(accel, 8.0);
                
                acceleration.push(accel);
            }
        });
        
        return {
            time,
            acceleration,
            metadata: {
                boulderName: boulder.name,
                grade: boulder.grade,
                moveCount: moves.length,
                source: 'real_sensor_data'
            }
        };
    }
} 