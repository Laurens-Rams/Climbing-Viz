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
                            <label for="routeSelect" style="font-weight: 600; color: #2c3e50; font-size: 0.9em;">CSV File:</label>
                            <select id="routeSelect" style="padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                            </select>
                        </div>
                        
                        <div class="control-item" style="display: flex; flex-direction: column; gap: 5px;">
                            <label for="visualizationMode" style="font-weight: 600; color: #2c3e50; font-size: 0.9em;">Visualization Mode:</label>
                            <select id="visualizationMode" style="padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                                <option value="scatter">Scatter Plot (Data Points)</option>
                                <option value="standard">Standard Time Series</option>
                                <option value="heatmap">Heat Map Analysis</option>
                                <option value="polar">Polar Burst View</option>
                                <option value="3d">3D Surface Landscape</option>
                            </select>
                        </div>

                        <div class="control-item" style="display: flex; flex-direction: column; gap: 5px;">
                            <button id="generateBtn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: 600;">Load Data</button>
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
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.3em;">CSV Data Analysis</h3>
                    <p style="color: #7f8c8d; line-height: 1.6; margin-bottom: 10px;">
                        <strong>Real Sensor Data:</strong> Load and analyze actual climbing acceleration data from CSV files containing time-series sensor measurements.
                    </p>
                    <p style="color: #7f8c8d; line-height: 1.6; margin-bottom: 10px;">
                        <strong>Data Points Visualization:</strong> View individual acceleration measurements as dots in scatter plot mode to see the raw sensor data.
                    </p>
                    <p style="color: #7f8c8d; line-height: 1.6;">
                        <strong>Move Detection:</strong> Automatically detects climbing moves from acceleration peaks and provides data for the main circle visualizer.
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
            
            // Try to sync with main app's current boulder, otherwise generate initial data
            this.syncWithMainApp();
            
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
        // Create a simplified version of the WEAR visualizer for CSV data only
        this.wearVisualizer = {
            currentData: null,
            samplingRate: 50,
            
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
        const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
        const generateBtn = this.dataVizContainer.querySelector('#generateBtn');
        const exportBtn = this.dataVizContainer.querySelector('#exportBtn');
        const visualizationMode = this.dataVizContainer.querySelector('#visualizationMode');
        
        routeSelect.addEventListener('change', () => {
            this.loadCSVData();
        });
        
        generateBtn.addEventListener('click', () => {
            this.loadCSVData();
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
        
        // Only show CSV entries
        const csvBoulders = boulders.filter(boulder => boulder.type === 'csv');
        
        csvBoulders.forEach(boulder => {
            const option = document.createElement('option');
            option.value = boulder.id;
            option.textContent = `${boulder.name} - CSV Data`;
            routeSelect.appendChild(option);
        });
        
        if (csvBoulders.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No CSV files available';
            routeSelect.appendChild(option);
        }
    }
    
    loadCSVData() {
        const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
        const selectedBoulderID = routeSelect.value;
        const boulders = getBoulderList();
        
        // Find CSV boulder by ID
        const boulder = boulders.find(b => b.id === selectedBoulderID && b.type === 'csv');
        
        if (boulder) {
            console.log('Loading CSV data for:', boulder.name);
            this.loadRealCSVData(boulder);
        } else {
            console.warn('No CSV boulder found for ID:', selectedBoulderID);
        }
    }
    
    async loadRealCSVData(boulder) {
        try {
            // Try to load the actual CSV file
            const response = await fetch(`data/${boulder.filename}`);
            if (response.ok) {
                const csvText = await response.text();
                const data = this.parseCSVData(csvText);
                this.wearVisualizer.currentData = data;
                this.updateVisualization();
                this.updateStatistics();
                console.log('Loaded real CSV data for:', boulder.name);
            } else {
                console.error('Could not load CSV file:', boulder.filename);
                this.showError(`Could not load CSV file: ${boulder.filename}`);
            }
        } catch (error) {
            console.error('Error loading CSV file:', error);
            this.showError(`Error loading CSV file: ${error.message}`);
        }
    }
    
    parseCSVData(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Find the relevant columns
        const timeIndex = headers.findIndex(h => h.toLowerCase().includes('time'));
        const accelIndex = headers.findIndex(h => h.toLowerCase().includes('absolute') || h.toLowerCase().includes('acceleration'));
        
        const time = [];
        const acceleration = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= Math.max(timeIndex, accelIndex) + 1) {
                const t = parseFloat(values[timeIndex]);
                const a = parseFloat(values[accelIndex]);
                
                if (!isNaN(t) && !isNaN(a)) {
                    time.push(t);
                    acceleration.push(a / 9.81); // Convert to g-force
                }
            }
        }
        
        // Generate moveAverages from the acceleration data for boulder visualizer integration
        const moveAverages = this.generateMoveAveragesFromAcceleration(time, acceleration);
        
        console.log('CSV parsing complete:', {
            dataPoints: acceleration.length,
            timeRange: [Math.min(...time), Math.max(...time)],
            accelRange: [Math.min(...acceleration), Math.max(...acceleration)],
            moveAverages: moveAverages.length
        });
        
        return { time, acceleration, moveAverages };
    }
    
    updateVisualization() {
        const visualizationMode = this.dataVizContainer.querySelector('#visualizationMode');
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        
        if (!this.wearVisualizer.currentData) {
            plotDiv.innerHTML = '<p>No data available</p>';
            return;
        }
        
        // Clear previous plot
        plotDiv.innerHTML = '';
        
        // Create visualization based on selected mode
        switch (visualizationMode.value) {
            case 'scatter':
                this.createScatterPlot(plotDiv);
                break;
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
        
        // Notify main boulder visualizer to update with new acceleration data
        this.notifyBoulderVisualizerUpdate();
    }
    
    notifyBoulderVisualizerUpdate() {
        // Notify the main boulder visualizer that acceleration data has been updated
        if (window.app && window.app.visualizer && window.app.currentBoulder) {
            console.log('Notifying boulder visualizer of acceleration data update');
            
            // Update the boulder visualizer with new acceleration-based dynamics
            window.app.visualizer.updateDynamicsFromAcceleration();
            window.app.visualizer.createVisualization();
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
    
    createScatterPlot(plotDiv) {
        const data = this.wearVisualizer.currentData;
        
        // Create color scale based on acceleration values (like DataViz2)
        const maxAccel = Math.max(...data.acceleration);
        const minAccel = Math.min(...data.acceleration);
        const avgAccel = data.acceleration.reduce((sum, val) => sum + val, 0) / data.acceleration.length;
        
        // Create speed-based color mapping
        const colors = data.acceleration.map(accel => {
            const intensity = (accel - minAccel) / (maxAccel - minAccel);
            
            // Color mapping based on acceleration intensity (like DataViz2)
            if (accel > avgAccel + (maxAccel - avgAccel) * 0.7) {
                // High intensity - red (dynamic moves)
                return `rgb(255, ${Math.floor((1 - intensity) * 100)}, ${Math.floor((1 - intensity) * 100)})`;
            } else if (accel > avgAccel + (maxAccel - avgAccel) * 0.4) {
                // Medium intensity - orange/yellow
                const r = 255;
                const g = Math.floor(150 + intensity * 105);
                const b = Math.floor((1 - intensity) * 150);
                return `rgb(${r}, ${g}, ${b})`;
            } else if (accel > avgAccel) {
                // Low-medium intensity - blue to green
                const r = Math.floor((1 - intensity) * 100);
                const g = Math.floor(100 + intensity * 155);
                const b = Math.floor(200 + intensity * 55);
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                // Very low intensity - blue (static holds)
                const r = Math.floor((1 - intensity) * 50);
                const g = Math.floor((1 - intensity) * 100);
                const b = Math.floor(150 + intensity * 105);
                return `rgb(${r}, ${g}, ${b})`;
            }
        });
        
        // Detect dynamic moments for highlighting (like DataViz2)
        const dynoThreshold = avgAccel + (maxAccel - avgAccel) * 0.6;
        const isDynoMoment = data.acceleration.map(accel => accel > dynoThreshold);
        
        // Create size mapping based on acceleration intensity
        const sizes = data.acceleration.map(accel => {
            const intensity = (accel - minAccel) / (maxAccel - minAccel);
            return 3 + intensity * 8; // Size range: 3-11 pixels
        });
        
        const trace = {
            x: data.time,
            y: data.acceleration,
            mode: 'markers',
            type: 'scatter',
            marker: {
                color: colors,
                size: sizes,
                opacity: 0.8,
                line: {
                    width: 1,
                    color: 'rgba(0,0,0,0.3)'
                }
            },
            name: 'Acceleration Data Points',
            hovertemplate: 
                '<b>Time:</b> %{x:.2f}s<br>' +
                '<b>Acceleration:</b> %{y:.3f} g<br>' +
                '<b>Intensity:</b> %{marker.color}<br>' +
                '<extra></extra>'
        };
        
        // Add move markers (peaks) as larger dots
        const moveAverages = this.getCurrentMoveAverages();
        if (moveAverages && moveAverages.length > 0) {
            const moveTrace = {
                x: moveAverages.map(move => move.time || 0),
                y: moveAverages.map(move => move.average),
                mode: 'markers',
                type: 'scatter',
                marker: {
                    color: moveAverages.map(move => move.isCrux ? '#ff0066' : '#00ff88'),
                    size: moveAverages.map(move => move.isCrux ? 15 : 12),
                    symbol: moveAverages.map(move => move.isCrux ? 'star' : 'circle'),
                    line: {
                        width: 2,
                        color: '#ffffff'
                    }
                },
                name: 'Detected Moves',
                hovertemplate: 
                    '<b>Move %{text}</b><br>' +
                    '<b>Time:</b> %{x:.2f}s<br>' +
                    '<b>Peak Acceleration:</b> %{y:.3f} g<br>' +
                    '<b>Type:</b> %{customdata}<br>' +
                    '<extra></extra>',
                text: moveAverages.map(move => move.sequence),
                customdata: moveAverages.map(move => move.description || move.type)
            };
            
            const layout = {
                title: {
                    text: 'Climbing Acceleration Data - Speed-Based Color Mapping',
                    font: { size: 16, color: '#2c3e50' }
                },
                xaxis: { 
                    title: 'Time (seconds)',
                    gridcolor: '#e0e0e0',
                    showgrid: true
                },
                yaxis: { 
                    title: 'Acceleration (g)',
                    gridcolor: '#e0e0e0',
                    showgrid: true
                },
                plot_bgcolor: '#fafafa',
                paper_bgcolor: 'white',
                hovermode: 'closest',
                showlegend: true,
                legend: {
                    x: 0.02,
                    y: 0.98,
                    bgcolor: 'rgba(255,255,255,0.8)',
                    bordercolor: '#cccccc',
                    borderwidth: 1
                }
            };
            
            Plotly.newPlot(plotDiv, [trace, moveTrace], layout, {responsive: true});
        } else {
            const layout = {
                title: {
                    text: 'Climbing Acceleration Data - Speed-Based Color Mapping',
                    font: { size: 16, color: '#2c3e50' }
                },
                xaxis: { 
                    title: 'Time (seconds)',
                    gridcolor: '#e0e0e0',
                    showgrid: true
                },
                yaxis: { 
                    title: 'Acceleration (g)',
                    gridcolor: '#e0e0e0',
                    showgrid: true
                },
                plot_bgcolor: '#fafafa',
                paper_bgcolor: 'white',
                hovermode: 'closest'
            };
            
            Plotly.newPlot(plotDiv, [trace], layout, {responsive: true});
        }
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
        const moveAverages = this.wearVisualizer.currentData?.moveAverages || [];
        console.log('DataViz getCurrentMoveAverages called:');
        console.log('  currentData exists:', !!this.wearVisualizer.currentData);
        console.log('  moveAverages:', moveAverages);
        console.log('  moveAverages length:', moveAverages.length);
        if (moveAverages.length > 0) {
            console.log('  First move average:', moveAverages[0]);
            console.log('  All move averages:', moveAverages.map(m => `${m.sequence}: ${m.average.toFixed(3)}`));
        }
        return moveAverages;
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
    
    syncWithMainApp() {
        // Try to get the current boulder from the main application
        if (window.app && window.app.currentBoulder) {
            const currentBoulder = window.app.currentBoulder;
            console.log('Syncing DataViz with main app boulder:', currentBoulder.name);
            
            // Set the dropdown to match the current boulder
            const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
            routeSelect.value = currentBoulder.id;
            
            // Load the data
            this.loadCSVData();
        } else {
            // Fallback to generating initial data
            this.loadCSVData();
        }
    }
    
    // Method to be called from main app when boulder changes
    updateFromMainApp(boulder) {
        if (!boulder || boulder.type !== 'csv') {
            console.log('DataViz: Ignoring non-CSV boulder:', boulder?.name);
            return;
        }
        
        console.log('DataViz updating from main app:', boulder.name);
        
        // Update dropdown selection
        const routeSelect = this.dataVizContainer.querySelector('#routeSelect');
        if (routeSelect) {
            routeSelect.value = boulder.id;
        }
        
        // Load the real CSV data
        this.loadRealCSVData(boulder);
    }
    
    generateMoveAveragesFromAcceleration(time, acceleration) {
        if (acceleration.length === 0) return [];
        
        // Calculate dynamic number of moves based on data duration and complexity
        const totalDuration = time[time.length - 1] - time[0];
        const dataPoints = acceleration.length;
        
        // Determine number of moves based on duration and data complexity
        // Typical climbing route: 1 move per 3-5 seconds, but adjust based on data density
        let numMoves;
        if (totalDuration < 15) {
            // Short route: 3-6 moves
            numMoves = Math.max(3, Math.min(6, Math.floor(totalDuration / 2.5)));
        } else if (totalDuration < 30) {
            // Medium route: 6-12 moves
            numMoves = Math.max(6, Math.min(12, Math.floor(totalDuration / 2.5)));
        } else if (totalDuration < 60) {
            // Long route: 12-20 moves
            numMoves = Math.max(12, Math.min(20, Math.floor(totalDuration / 3)));
        } else {
            // Very long route: 20-30 moves
            numMoves = Math.max(20, Math.min(30, Math.floor(totalDuration / 3.5)));
        }
        
        // Also consider data density - more data points might indicate more complex movement
        const dataDensity = dataPoints / totalDuration; // points per second
        if (dataDensity > 100) {
            // High density data - might have more detailed moves
            numMoves = Math.min(numMoves * 1.3, 30);
        } else if (dataDensity < 20) {
            // Low density data - fewer moves
            numMoves = Math.max(numMoves * 0.8, 3);
        }
        
        numMoves = Math.floor(numMoves);
        
        const moves = [];
        const segmentDuration = totalDuration / numMoves;
        
        console.log(`Generating ${numMoves} moves from ${acceleration.length} data points over ${totalDuration.toFixed(1)}s`);
        console.log(`Data density: ${dataDensity.toFixed(1)} points/sec, Segment duration: ${segmentDuration.toFixed(1)}s`);
        console.log('Acceleration data range:', {
            min: Math.min(...acceleration).toFixed(3),
            max: Math.max(...acceleration).toFixed(3),
            avg: (acceleration.reduce((sum, val) => sum + val, 0) / acceleration.length).toFixed(3)
        });
        
        // Analyze each segment to find the peak acceleration (like DataViz2)
        for (let i = 0; i < numMoves; i++) {
            const segmentStart = time[0] + (i * segmentDuration);
            const segmentEnd = segmentStart + segmentDuration;
            
            // Find indices for this time segment
            const startIdx = time.findIndex(t => t >= segmentStart);
            const endIdx = time.findIndex(t => t >= segmentEnd);
            
            if (startIdx === -1 || endIdx === -1) continue;
            
            // Find peak acceleration in this segment
            let peakAccel = 0;
            let peakTime = segmentStart;
            let peakIdx = startIdx;
            
            for (let j = startIdx; j < endIdx && j < acceleration.length; j++) {
                const accel = Math.abs(acceleration[j]);
                if (accel > peakAccel) {
                    peakAccel = accel;
                    peakTime = time[j];
                    peakIdx = j;
                }
            }
            
            // Classify move type based on acceleration magnitude (like DataViz2)
            const moveType = this.classifyMoveTypeFromAcceleration(peakAccel, acceleration, peakIdx);
            const moveDescription = `${moveType} (${peakAccel.toFixed(1)}g)`;
            
            // Determine if this is a crux move (top 20% of peaks, distributed throughout route)
            const allPeaks = [];
            for (let k = 0; k < numMoves; k++) {
                const segStart = time[0] + (k * segmentDuration);
                const segEnd = segStart + segmentDuration;
                const sIdx = time.findIndex(t => t >= segStart);
                const eIdx = time.findIndex(t => t >= segEnd);
                if (sIdx !== -1 && eIdx !== -1) {
                    let maxInSeg = 0;
                    for (let l = sIdx; l < eIdx && l < acceleration.length; l++) {
                        maxInSeg = Math.max(maxInSeg, Math.abs(acceleration[l]));
                    }
                    allPeaks.push(maxInSeg);
                }
            }
            
            // Sort peaks to find threshold for crux moves
            const sortedPeaks = [...allPeaks].sort((a, b) => b - a);
            const cruxThreshold = sortedPeaks[Math.floor(sortedPeaks.length * 0.2)] || 0; // Top 20%
            const isCrux = peakAccel >= cruxThreshold && peakAccel > 1.5; // Must be significant
            
            moves.push({
                sequence: i + 1,
                average: peakAccel,
                time: peakTime,
                acceleration: peakAccel,
                description: moveDescription,
                type: moveType.toLowerCase().replace(/\s+/g, '_'),
                isCrux: isCrux,
                segment: i + 1
            });
        }
        
        console.log(`Generated ${moves.length} moves:`, moves.map(m => `${m.sequence}: ${m.average.toFixed(2)}g ${m.isCrux ? '(CRUX)' : ''}`));
        return moves;
    }
    
    // Classify move type based on acceleration magnitude and pattern (from DataViz2)
    classifyMoveTypeFromAcceleration(peakAccel, accelData, peakIdx) {
        // Look at acceleration pattern around the peak
        const windowSize = 10;
        const startIdx = Math.max(0, peakIdx - windowSize);
        const endIdx = Math.min(accelData.length - 1, peakIdx + windowSize);
        
        // Calculate acceleration variance in the window
        const window = accelData.slice(startIdx, endIdx);
        const variance = this.calculateVariance(window);
        
        // Classify based on peak magnitude and variance (like DataViz2)
        if (peakAccel > 3.0) {
            return variance > 1.0 ? "Dynamic Throw" : "Power Move";
        } else if (peakAccel > 2.0) {
            return variance > 0.8 ? "Quick Reach" : "Lock Off";
        } else if (peakAccel > 1.5) {
            return variance > 0.5 ? "Adjustment" : "Static Hold";
        } else if (peakAccel > 1.0) {
            return "Controlled Move";
        } else {
            return "Balance/Rest";
        }
    }
    
    // Calculate variance for move classification
    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }
    
    showError(message) {
        const plotDiv = this.dataVizContainer.querySelector('#accelerationPlot');
        plotDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: #e74c3c;">
            <h3>Error</h3>
            <p>${message}</p>
        </div>`;
    }
} 