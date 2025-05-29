class RemoteDataHandler {
    constructor() {
        this.isPolling = false;
        this.recordedData = [];
        this.remoteUrl = 'http://192.168.1.36';
        this.pollIntervalId = null;
        this.pollRate = 200; // Keep fast polling for data collection
        this.onDataCallback = null;
        this.onPollingStateChange = null;
        
        // Visual update throttling
        this.visualUpdateRate = 400; // Update visuals every 400ms (was 1000ms)
        this.lastVisualUpdate = 0;
        this.pendingVisualUpdate = false;
        
        this.lastTimestampProcessed = 0;
        this.currentSession = null;  // Track Phyphox session
        this.experimentConfig = null;  // Store experiment configuration
        this.deviceMetadata = null;  // Store device metadata
        this.experimentTimeInfo = null;  // Store experiment time information
        this.recordingStartTime = null; // Track when recording started

        // Accumulated data structure for complete timeline
        this.accumulatedData = {
            time: [],
            accX: [],
            accY: [],
            accZ: []
        };
        
        // Current buffer for real-time display (last N points for performance)
        this.displayBuffer = {
            time: [],
            accX: [],
            accY: [],
            accZ: []
        };
        
        this.maxDisplayBufferSize = 2000; // Keep last 2000 points for smooth display
    }

    // Set callback for real-time data updates
    setDataCallback(callback) {
        this.onDataCallback = callback;
    }

    // Set callback for polling state changes
    setPollingStateCallback(callback) {
        this.onPollingStateChange = callback;
    }

    // Check if remote device is accessible
    async checkRemoteConnection() {
        try {
            const response = await fetch(`${this.remoteUrl}/get?acc_time`);
            return response.ok;
        } catch (error) {
            console.warn('Remote connection check failed:', error);
            if (error.message.includes('CORS')) {
                throw new Error(`CORS Error: Cannot connect to ${this.remoteUrl}. Ensure Phyphox server allows cross-origin requests and is on the same network.`);
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error(`Network Error: Cannot reach ${this.remoteUrl}. Check IP, WiFi, and Phyphox "Remote Access" setting.`);
            } else {
                throw new Error(`Connection failed: ${error.message}`);
            }
        }
    }

    // Start polling data from remote device
    async startPolling() {
        if (this.isPolling) return;

        try {
            await this.checkRemoteConnection();
            
            // Clear any existing polling
            if (this.pollIntervalId) {
                clearInterval(this.pollIntervalId);
                this.pollIntervalId = null;
            }

            // Reset data structures for new recording session
            this.isPolling = true;
            this.recordedData = [];
            this.accumulatedData = { time: [], accX: [], accY: [], accZ: [] };
            this.displayBuffer = { time: [], accX: [], accY: [], accZ: [] };
            this.lastTimestampProcessed = 0;
            this.recordingStartTime = Date.now();

            console.log('[RemoteDataHandler] Starting remote data polling from', this.remoteUrl);

            // Trigger initial callback to initialize UI for live mode (even with no data)
            if (this.onDataCallback) {
                console.log('[RemoteDataHandler] Triggering initial callback to initialize live mode UI');
                try {
                    this.onDataCallback({
                        buffer: this.accumulatedData, // Empty buffer initially
                        displayBuffer: this.displayBuffer, // Empty display buffer initially
                        newPoints: [],
                        totalAccumulated: 0,
                        status: {
                            measuring: false, // Unknown initially
                            timedRun: false,
                            countDown: 0
                        },
                        isThrottledUpdate: false // This is an initialization call
                    });
                } catch (callbackError) {
                    console.error('[RemoteDataHandler] Error in initial callback:', callbackError);
                }
            }

            // Fetch initial data immediately
            await this.fetchRemoteData();

            // Then start the polling interval
            this.pollIntervalId = setInterval(() => {
                if (!this.isPolling) {
                    clearInterval(this.pollIntervalId);
                    this.pollIntervalId = null;
                    return;
                }
                this.fetchRemoteData().catch(error => {
                    console.error('[RemoteDataHandler] Error in polling interval:', error);
                });
            }, this.pollRate);

            if (this.onPollingStateChange) {
                this.onPollingStateChange(true);
            }
        } catch (error) {
            console.error("[RemoteDataHandler] Failed to start polling:", error.message);
            this.isPolling = false;
            if (this.onPollingStateChange) {
                this.onPollingStateChange(false, error.message);
            }
            throw error;
        }
    }

    // Stop polling
    async stopPolling() {
        if (!this.isPolling) return null;

        this.isPolling = false;
        clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;

        console.log('Stopped polling. Total data points accumulated:', this.accumulatedData.time.length);

        if (this.onPollingStateChange) {
            this.onPollingStateChange(false);
        }
        
        return this.accumulatedData.time.length > 0 ? this.generateCSVFile(this.recordedData, "Polled_Data") : null;
    }

    // Fetch the latest data from the remote device
    async fetchRemoteData() {
        if (!this.isPolling) return;

        try {
            // Get all available data from Phyphox
            const response = await fetch(`${this.remoteUrl}/get?acc_time=full&accX=full&accY=full&accZ=full`);
            
            if (!response.ok) {
                console.warn('[RemoteDataHandler] Failed to fetch remote data, status:', response.status);
                return;
            }

            const data = await response.json();
            
            // Don't stop polling when Phyphox stops measuring - keep polling so we can auto-resume
            // This allows the app to automatically start updating when user hits play in Phyphox
            if (data.status && !data.status.measuring) {
                console.log('[RemoteDataHandler] Phyphox not measuring - continuing to poll for auto-resume');
                // Still process the data (even if empty) to maintain UI state
                this.processRemoteData(data);
                return;
            }

            // Process the data
            this.processRemoteData(data);

        } catch (error) {
            console.warn('[RemoteDataHandler] Error fetching remote data:', error);
            if (error.message.includes('Failed to fetch')) {
                console.error('[RemoteDataHandler] Network error - stopping polling');
                await this.stopPolling();
            }
        }
    }
    
    // Method to get all data from a completed Phyphox experiment
    async getPhyphoxExperimentData() {
        let pollingWasActive = this.isPolling;
        if (pollingWasActive) {
            console.log("Temporarily stopping polling to fetch full experiment data.");
            await this.stopPolling();
        }

        try {
            const response = await fetch(`${this.remoteUrl}/get?acc_time&acc_x&acc_y&acc_z`);
            if (!response.ok) {
                throw new Error(`Failed to fetch experiment data, status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Fetched full experiment data from Phyphox.");
            
            this.processRemoteData(data, false); 
            
            if (this.recordedData.length > 0) {
                return this.generateCSVFile(this.recordedData, "Phyphox_Experiment");
            } else {
                console.log("No data found in the Phyphox experiment buffers. Ensure recording was done on the phone.");
                return null;
            }
        } catch (error) {
            console.error('Error fetching full Phyphox experiment data:', error);
            throw error;
        } finally {
            if (pollingWasActive) {
                console.log("Restarting polling after fetching experiment data.");
                try {
                    await this.startPolling();
                } catch (startPollingError) {
                    console.error("Error restarting polling:", startPollingError);
                    if(this.onPollingStateChange) {
                        this.onPollingStateChange(false, "Failed to restart polling after data fetch.");
                    }
                }
            }
        }
    }

    processRemoteData(data) {
        if (!data || !data.buffer || !data.status) {
            console.warn('[RemoteDataHandler] Invalid data format received from Phyphox');
            return;
        }

        try {
            // Handle Phyphox status information
            const { measuring, session, timedRun, countDown } = data.status;
            
            // If session changed, we need to reset our data as it's a new experiment
            if (this.currentSession && this.currentSession !== session) {
                console.log('[RemoteDataHandler] New Phyphox session detected, resetting data');
                this.recordedData = [];
                this.accumulatedData = { time: [], accX: [], accY: [], accZ: [] };
                this.displayBuffer = { time: [], accX: [], accY: [], accZ: [] };
                this.lastTimestampProcessed = 0;
                this.recordingStartTime = Date.now();
            }
            this.currentSession = session;

            // Process buffer data - handle different possible buffer names
            const bufferData = data.buffer;
            
            // Try different possible buffer names that Phyphox might use
            let timeData = [];
            let accXData = [];
            let accYData = [];
            let accZData = [];

            // Check for time data
            if (bufferData.acc_time?.buffer) {
                timeData = bufferData.acc_time.buffer;
            } else if (bufferData.time?.buffer) {
                timeData = bufferData.time.buffer;
            }

            // Check for acceleration data - try different naming conventions
            if (bufferData.accX?.buffer) {
                accXData = bufferData.accX.buffer;
            } else if (bufferData.acc_x?.buffer) {
                accXData = bufferData.acc_x.buffer;
            } else if (bufferData['Acceleration x']?.buffer) {
                accXData = bufferData['Acceleration x'].buffer;
            }

            if (bufferData.accY?.buffer) {
                accYData = bufferData.accY.buffer;
            } else if (bufferData.acc_y?.buffer) {
                accYData = bufferData.acc_y.buffer;
            } else if (bufferData['Acceleration y']?.buffer) {
                accYData = bufferData['Acceleration y'].buffer;
            }

            if (bufferData.accZ?.buffer) {
                accZData = bufferData.accZ.buffer;
            } else if (bufferData.acc_z?.buffer) {
                accZData = bufferData.acc_z.buffer;
            } else if (bufferData['Acceleration z']?.buffer) {
                accZData = bufferData['Acceleration z'].buffer;
            }

            // Check if we have any data
            const hasData = timeData.length > 0 && accXData.length > 0 && accYData.length > 0 && accZData.length > 0;
            
            if (!hasData) {
                console.log('[RemoteDataHandler] No data available from Phyphox (not measuring or empty buffers)');
                
                // Still trigger callback to maintain UI state, but with empty data
                const now = Date.now();
                const shouldUpdateVisuals = (now - this.lastVisualUpdate) >= this.visualUpdateRate;
                
                if (shouldUpdateVisuals && this.onDataCallback) {
                    this.lastVisualUpdate = now;
                    this.pendingVisualUpdate = false;
                    
                    console.log('[RemoteDataHandler] Triggering callback with no data (Phyphox not measuring)');
                    try {
                        this.onDataCallback({
                            buffer: this.accumulatedData, // Current accumulated data (may be empty)
                            displayBuffer: this.displayBuffer, // Current display buffer (may be empty)
                            newPoints: [],
                            totalAccumulated: this.accumulatedData.time.length,
                            status: {
                                measuring,
                                timedRun,
                                countDown
                            },
                            isThrottledUpdate: true
                        });
                    } catch (callbackError) {
                        console.error('[RemoteDataHandler] Error in no-data callback:', callbackError);
                    }
                }
                return; // Exit early but after calling callback
            }

            // Find the minimum length to ensure all arrays are the same size
            const minLength = Math.min(timeData.length, accXData.length, accYData.length, accZData.length);
            
            if (minLength === 0) {
                console.warn('[RemoteDataHandler] All data arrays are empty');
                return;
            }

            // Truncate all arrays to the minimum length to ensure consistency
            timeData = timeData.slice(0, minLength);
            accXData = accXData.slice(0, minLength);
            accYData = accYData.slice(0, minLength);
            accZData = accZData.slice(0, minLength);

            // Process and accumulate ALL data points (not just new ones)
            // This ensures we build a complete timeline from the start
            const freshDataPoints = [];

            // Find the starting index for new data
            let startIndex = 0;
            if (this.accumulatedData.time.length > 0) {
                const lastAccumulatedTime = this.accumulatedData.time[this.accumulatedData.time.length - 1];
                // Find first new data point
                for (let i = 0; i < timeData.length; i++) {
                    if (timeData[i] > lastAccumulatedTime) {
                        startIndex = i;
                        break;
                    }
                }
            }

            // Process only new data points
            for (let i = startIndex; i < timeData.length; i++) {
                const timestamp = timeData[i];
                const x = accXData[i];
                const y = accYData[i];
                const z = accZData[i];
                
                // Skip if any value is NaN/invalid
                if (isNaN(timestamp) || isNaN(x) || isNaN(y) || isNaN(z) ||
                    !isFinite(timestamp) || !isFinite(x) || !isFinite(y) || !isFinite(z)) {
                    continue;
                }
                
                // Add to accumulated data (complete timeline)
                this.accumulatedData.time.push(timestamp);
                this.accumulatedData.accX.push(x);
                this.accumulatedData.accY.push(y);
                this.accumulatedData.accZ.push(z);
                
                // Add to display buffer (for performance)
                this.displayBuffer.time.push(timestamp);
                this.displayBuffer.accX.push(x);
                this.displayBuffer.accY.push(y);
                this.displayBuffer.accZ.push(z);
                
                const dataPoint = {
                    time: timestamp,
                    accX: x,
                    accY: y,
                    accZ: z
                };

                // Add to recorded data history
                this.recordedData.push(dataPoint);
                
                // Add to fresh data points for callback
                freshDataPoints.push(dataPoint);
            }

            // Maintain display buffer size for performance
            if (this.displayBuffer.time.length > this.maxDisplayBufferSize) {
                const excess = this.displayBuffer.time.length - this.maxDisplayBufferSize;
                this.displayBuffer.time = this.displayBuffer.time.slice(excess);
                this.displayBuffer.accX = this.displayBuffer.accX.slice(excess);
                this.displayBuffer.accY = this.displayBuffer.accY.slice(excess);
                this.displayBuffer.accZ = this.displayBuffer.accZ.slice(excess);
            }

            // Only notify if we have new data
            if (freshDataPoints.length > 0) {
                console.log('[RemoteDataHandler] Processed new data:', {
                    newPoints: freshDataPoints.length,
                    totalAccumulated: this.accumulatedData.time.length,
                    displayBufferSize: this.displayBuffer.time.length,
                    timeRange: this.accumulatedData.time.length > 0 ? 
                        `${this.accumulatedData.time[0].toFixed(2)}s - ${this.accumulatedData.time[this.accumulatedData.time.length - 1].toFixed(2)}s` : 'none'
                });

                // Throttled visual updates - only update visuals every visualUpdateRate milliseconds
                const now = Date.now();
                const shouldUpdateVisuals = (now - this.lastVisualUpdate) >= this.visualUpdateRate;
                
                if (shouldUpdateVisuals && this.onDataCallback) {
                    this.lastVisualUpdate = now;
                    this.pendingVisualUpdate = false;
                    
                    console.log('[RemoteDataHandler] Triggering visual update (throttled)');
                    try {
                        this.onDataCallback({
                            buffer: this.accumulatedData, // Send complete accumulated data
                            displayBuffer: this.displayBuffer, // Send display buffer for performance
                            newPoints: freshDataPoints,
                            totalAccumulated: this.accumulatedData.time.length,
                            status: {
                                measuring,
                                timedRun,
                                countDown
                            },
                            isThrottledUpdate: true
                        });
                    } catch (callbackError) {
                        console.error('[RemoteDataHandler] Error in data callback:', callbackError);
                    }
                } else if (!this.pendingVisualUpdate && this.onDataCallback) {
                    // Schedule a visual update for later if we haven't already
                    this.pendingVisualUpdate = true;
                    const timeUntilNextUpdate = this.visualUpdateRate - (now - this.lastVisualUpdate);
                    
                    setTimeout(() => {
                        if (this.pendingVisualUpdate && this.onDataCallback) {
                            this.lastVisualUpdate = Date.now();
                            this.pendingVisualUpdate = false;
                            
                            console.log('[RemoteDataHandler] Triggering delayed visual update');
                            try {
                                this.onDataCallback({
                                    buffer: this.accumulatedData,
                                    displayBuffer: this.displayBuffer,
                                    newPoints: freshDataPoints,
                                    totalAccumulated: this.accumulatedData.time.length,
                                    status: {
                                        measuring,
                                        timedRun,
                                        countDown
                                    },
                                    isThrottledUpdate: true
                                });
                            } catch (callbackError) {
                                console.error('[RemoteDataHandler] Error in delayed data callback:', callbackError);
                            }
                        }
                    }, Math.max(timeUntilNextUpdate, 100)); // Minimum 100ms delay
                }
            }
        } catch (error) {
            console.error('[RemoteDataHandler] Error processing remote data:', error);
        }
    }

    // Generate CSV file from provided data points
    generateCSVFile(dataToExport, baseFilename = "Remote_Data") {
        if (!dataToExport || dataToExport.length === 0) {
            console.log("No data to generate CSV.");
            return null;
        }

        let csvContent = 'Time (s),Acceleration x (m/s^2),Acceleration y (m/s^2),Acceleration z (m/s^2)\n';
        dataToExport.forEach(point => {
            csvContent += `${point.time},${point.accX},${point.accY},${point.accZ}\n`;
        });

        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${baseFilename}_${timestampStr}.csv`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('Generated CSV file:', filename);
        return { filename, data: csvContent, blob, dataPoints: dataToExport.length };
    }

    getCurrentData() {
        return this.displayBuffer;
    }

    getPollingStatus() {
        return {
            isPolling: this.isPolling,
            dataPointsBuffered: this.displayBuffer.time.length,
            totalDataPointsProcessed: this.recordedData.length
        };
    }

    setRemoteUrl(url) {
        this.remoteUrl = url;
    }

    getRemoteUrl() {
        return this.remoteUrl;
    }

    // Get Phyphox experiment configuration
    async getPhyphoxConfig() {
        try {
            const response = await fetch(`${this.remoteUrl}/config`);
            if (!response.ok) {
                throw new Error(`Failed to fetch config, status: ${response.status}`);
            }
            const config = await response.json();
            console.log('[RemoteDataHandler] Phyphox config:', config);
            return config;
        } catch (error) {
            console.error('Error fetching Phyphox config:', error);
            throw error;
        }
    }

    // Get Phyphox metadata
    async getPhyphoxMetadata() {
        try {
            const response = await fetch(`${this.remoteUrl}/meta`);
            if (!response.ok) {
                throw new Error(`Failed to fetch metadata, status: ${response.status}`);
            }
            const metadata = await response.json();
            console.log('[RemoteDataHandler] Phyphox metadata:', metadata);
            return metadata;
        } catch (error) {
            console.error('Error fetching Phyphox metadata:', error);
            throw error;
        }
    }

    // Get Phyphox experiment time information
    async getPhyphoxTimeInfo() {
        try {
            const response = await fetch(`${this.remoteUrl}/time`);
            if (!response.ok) {
                throw new Error(`Failed to fetch time info, status: ${response.status}`);
            }
            const timeInfo = await response.json();
            console.log('[RemoteDataHandler] Phyphox time info:', timeInfo);
            return timeInfo;
        } catch (error) {
            console.error('Error fetching Phyphox time info:', error);
            throw error;
        }
    }

    // Control methods for Phyphox experiment
    async startPhyphoxExperiment() {
        try {
            const response = await fetch(`${this.remoteUrl}/control?cmd=start`);
            if (!response.ok) {
                throw new Error(`Failed to start experiment, status: ${response.status}`);
            }
            const result = await response.json();
            if (!result.result) {
                throw new Error('Phyphox failed to start experiment');
            }
            console.log('[RemoteDataHandler] Started Phyphox experiment');
            
            // Start polling for data
            await this.startPolling();
            
            return true;
        } catch (error) {
            console.error('Error starting Phyphox experiment:', error);
            throw error;
        }
    }

    async stopPhyphoxExperiment() {
        try {
            const response = await fetch(`${this.remoteUrl}/control?cmd=stop`);
            if (!response.ok) {
                throw new Error(`Failed to stop experiment, status: ${response.status}`);
            }
            const result = await response.json();
            if (!result.result) {
                throw new Error('Phyphox failed to stop experiment');
            }
            console.log('[RemoteDataHandler] Stopped Phyphox experiment');
            
            // Stop polling
            await this.stopPolling();
            
            return true;
        } catch (error) {
            console.error('Error stopping Phyphox experiment:', error);
            throw error;
        }
    }

    async clearPhyphoxData() {
        try {
            const response = await fetch(`${this.remoteUrl}/control?cmd=clear`);
            if (!response.ok) {
                throw new Error(`Failed to clear data, status: ${response.status}`);
            }
            const result = await response.json();
            if (!result.result) {
                throw new Error('Phyphox failed to clear data');
            }
            console.log('[RemoteDataHandler] Cleared Phyphox data');
            
            // Reset our local data
            this.recordedData = [];
            this.accumulatedData = { time: [], accX: [], accY: [], accZ: [] };
            this.displayBuffer = { time: [], accX: [], accY: [], accZ: [] };
            this.lastTimestampProcessed = 0;
            
            return true;
        } catch (error) {
            console.error('Error clearing Phyphox data:', error);
            throw error;
        }
    }

    // Set a value in a Phyphox buffer (typically used for edit fields)
    async setPhyphoxBufferValue(buffer, value) {
        if (typeof buffer !== 'string' || buffer.trim() === '') {
            throw new Error('Invalid buffer name');
        }
        if (typeof value === 'undefined' || value === null) {
            throw new Error('Invalid value');
        }

        try {
            const response = await fetch(`${this.remoteUrl}/control?cmd=set&buffer=${encodeURIComponent(buffer)}&value=${encodeURIComponent(value)}`);
            if (!response.ok) {
                throw new Error(`Failed to set buffer value, status: ${response.status}`);
            }
            const result = await response.json();
            if (!result.result) {
                throw new Error(`Phyphox failed to set value ${value} for buffer ${buffer}`);
            }
            console.log(`[RemoteDataHandler] Set Phyphox buffer ${buffer} to ${value}`);
            return true;
        } catch (error) {
            console.error('Error setting Phyphox buffer value:', error);
            throw error;
        }
    }

    // Set visual update rate (how often visuals are updated during live recording)
    setVisualUpdateRate(rateMs) {
        if (rateMs < 100) {
            console.warn('[RemoteDataHandler] Visual update rate too low, setting to minimum 100ms');
            this.visualUpdateRate = 100;
        } else if (rateMs > 5000) {
            console.warn('[RemoteDataHandler] Visual update rate too high, setting to maximum 5000ms');
            this.visualUpdateRate = 5000;
        } else {
            this.visualUpdateRate = rateMs;
        }
        console.log(`[RemoteDataHandler] Visual update rate set to ${this.visualUpdateRate}ms`);
    }

    // Get current visual update rate
    getVisualUpdateRate() {
        return this.visualUpdateRate;
    }
}

export default RemoteDataHandler; 