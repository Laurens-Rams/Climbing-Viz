/**
 * Acceleration Analyzer - Backend tool for processing climbing acceleration data
 * Detects moves from acceleration data and calculates average speeds around move points
 */

export class AccelerationAnalyzer {
    constructor() {
        this.smoothingWindow = 5; // Window size for data smoothing
        this.peakThreshold = 0.5; // Minimum threshold for peak detection
        this.minPeakDistance = 10; // Minimum distance between peaks (data points)
        this.speedCalculationRadius = 20; // Number of points around peak to calculate average speed
        this.maxMoves = 15; // Maximum number of moves to detect
    }

    /**
     * Main function to analyze CSV data and extract moves
     * @param {string} csvText - Raw CSV data
     * @param {Object} boulderInfo - Boulder metadata (name, grade, etc.)
     * @returns {Object} - Processed boulder data with moves
     */
    async analyzeClimbingData(csvText, boulderInfo) {
        try {
            console.log('Starting acceleration analysis for:', boulderInfo.name);
            
            // Parse CSV data
            const rawData = this.parseCSV(csvText);
            console.log('Parsed CSV data points:', rawData.length);
            
            // Extract acceleration components
            const accelerationData = this.extractAccelerationData(rawData);
            
            // Smooth the data to reduce noise
            const smoothedData = this.smoothAccelerationData(accelerationData);
            
            // Detect move peaks from acceleration
            const movePeaks = this.detectMovePeaks(smoothedData);
            console.log('Detected move peaks:', movePeaks.length);
            
            // Calculate average speeds around each move
            const moves = this.calculateMoveMetrics(movePeaks, smoothedData);
            console.log('Processed moves with metrics:', moves.length);
            
            // Create boulder object with real data
            const processedBoulder = {
                id: boulderInfo.id,
                name: boulderInfo.name,
                grade: boulderInfo.grade,
                description: `Real climbing data from acceleration sensors`,
                type: 'csv',
                moves: moves,
                rawDataPoints: rawData.length,
                analysisMetadata: {
                    smoothingWindow: this.smoothingWindow,
                    peakThreshold: this.peakThreshold,
                    detectedPeaks: movePeaks.length,
                    processedMoves: moves.length
                }
            };
            
            console.log('Analysis complete for boulder:', processedBoulder.name);
            return processedBoulder;
            
        } catch (error) {
            console.error('Error analyzing climbing data:', error);
            throw new Error(`Failed to analyze climbing data: ${error.message}`);
        }
    }

    /**
     * Parse CSV text into structured data
     * @param {string} csvText - Raw CSV content
     * @returns {Array} - Array of data objects
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    const value = parseFloat(values[index]);
                    row[header] = isNaN(value) ? values[index] : value;
                });
                data.push(row);
            }
        }
        
        return data;
    }

    /**
     * Extract and structure acceleration data
     * @param {Array} rawData - Parsed CSV data
     * @returns {Object} - Structured acceleration data
     */
    extractAccelerationData(rawData) {
        const time = [];
        const accelX = [];
        const accelY = [];
        const accelZ = [];
        const absoluteAccel = [];
        
        rawData.forEach(row => {
            time.push(row['Time (s)'] || 0);
            accelX.push(row['Acceleration x (m/s^2)'] || 0);
            accelY.push(row['Acceleration y (m/s^2)'] || 0);
            accelZ.push(row['Acceleration z (m/s^2)'] || 0);
            absoluteAccel.push(row['Absolute acceleration (m/s^2)'] || 0);
        });
        
        return {
            time,
            accelX,
            accelY,
            accelZ,
            absoluteAccel
        };
    }

    /**
     * Smooth acceleration data to reduce noise
     * @param {Object} accelerationData - Raw acceleration data
     * @returns {Object} - Smoothed acceleration data
     */
    smoothAccelerationData(accelerationData) {
        return {
            time: accelerationData.time,
            accelX: this.smoothArray(accelerationData.accelX, this.smoothingWindow),
            accelY: this.smoothArray(accelerationData.accelY, this.smoothingWindow),
            accelZ: this.smoothArray(accelerationData.accelZ, this.smoothingWindow),
            absoluteAccel: this.smoothArray(accelerationData.absoluteAccel, this.smoothingWindow)
        };
    }

    /**
     * Apply moving average smoothing to an array
     * @param {Array} data - Input data array
     * @param {number} windowSize - Size of smoothing window
     * @returns {Array} - Smoothed data array
     */
    smoothArray(data, windowSize) {
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
                sum += data[j];
                count++;
            }
            
            smoothed[i] = sum / count;
        }
        
        return smoothed;
    }

    /**
     * Detect move peaks from smoothed acceleration data
     * @param {Object} smoothedData - Smoothed acceleration data
     * @returns {Array} - Array of peak indices and values
     */
    detectMovePeaks(smoothedData) {
        // Use absolute acceleration for peak detection
        const acceleration = smoothedData.absoluteAccel;
        const time = smoothedData.time;
        
        // Calculate dynamic threshold based on data statistics
        const mean = acceleration.reduce((sum, val) => sum + val, 0) / acceleration.length;
        const variance = acceleration.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / acceleration.length;
        const stdDev = Math.sqrt(variance);
        
        // Set threshold as mean + standard deviation for better peak detection
        const dynamicThreshold = mean + stdDev * this.peakThreshold;
        
        console.log(`Peak detection - Mean: ${mean.toFixed(2)}, StdDev: ${stdDev.toFixed(2)}, Threshold: ${dynamicThreshold.toFixed(2)}`);
        
        // Find peaks above threshold
        const peaks = [];
        for (let i = 1; i < acceleration.length - 1; i++) {
            const current = acceleration[i];
            const prev = acceleration[i - 1];
            const next = acceleration[i + 1];
            
            // Check if current point is a local maximum above threshold
            if (current > prev && current > next && current > dynamicThreshold) {
                // Check minimum distance from previous peaks
                const tooClose = peaks.some(peak => Math.abs(peak.index - i) < this.minPeakDistance);
                
                if (!tooClose) {
                    peaks.push({
                        index: i,
                        time: time[i],
                        acceleration: current,
                        prominence: current - Math.min(prev, next)
                    });
                }
            }
        }
        
        // Sort peaks by prominence and select the best ones
        peaks.sort((a, b) => b.prominence - a.prominence);
        
        // Limit to maximum number of moves
        const selectedPeaks = peaks.slice(0, this.maxMoves);
        
        // Sort selected peaks by time order
        selectedPeaks.sort((a, b) => a.time - b.time);
        
        console.log(`Selected ${selectedPeaks.length} peaks from ${peaks.length} candidates`);
        
        return selectedPeaks;
    }

    /**
     * Calculate move metrics including average speed around each peak
     * @param {Array} movePeaks - Detected move peaks
     * @param {Object} smoothedData - Smoothed acceleration data
     * @returns {Array} - Array of move objects with metrics
     */
    calculateMoveMetrics(movePeaks, smoothedData) {
        const moves = [];
        
        movePeaks.forEach((peak, index) => {
            // Calculate average speed around this move
            const avgSpeed = this.calculateAverageSpeedAroundPeak(peak, smoothedData);
            
            // Determine if this is a crux move (higher than average acceleration)
            const allAccelerations = movePeaks.map(p => p.acceleration);
            const avgAcceleration = allAccelerations.reduce((sum, val) => sum + val, 0) / allAccelerations.length;
            const isCrux = peak.acceleration > avgAcceleration * 1.2; // 20% above average
            
            // Classify move type based on acceleration characteristics
            const moveType = this.classifyMoveType(peak, smoothedData);
            
            // Create move object compatible with existing visualizer
            const move = {
                sequence: index + 1,
                dynamics: this.normalizeDynamics(avgSpeed), // Normalize speed to 0-1 range for compatibility
                isCrux: isCrux,
                type: moveType,
                description: `Move ${index + 1} - ${moveType}`,
                // Additional real data
                realData: {
                    peakTime: peak.time,
                    peakAcceleration: peak.acceleration,
                    averageSpeed: avgSpeed,
                    prominence: peak.prominence,
                    dataIndex: peak.index
                }
            };
            
            moves.push(move);
        });
        
        console.log('Calculated metrics for moves:', moves.map(m => ({
            sequence: m.sequence,
            dynamics: m.dynamics,
            avgSpeed: m.realData.averageSpeed,
            isCrux: m.isCrux
        })));
        
        return moves;
    }

    /**
     * Calculate average speed around a peak
     * @param {Object} peak - Peak data
     * @param {Object} smoothedData - Smoothed acceleration data
     * @returns {number} - Average speed around the peak
     */
    calculateAverageSpeedAroundPeak(peak, smoothedData) {
        const startIndex = Math.max(0, peak.index - this.speedCalculationRadius);
        const endIndex = Math.min(smoothedData.absoluteAccel.length - 1, peak.index + this.speedCalculationRadius);
        
        let totalSpeed = 0;
        let count = 0;
        
        // Calculate speed from acceleration data in the window around the peak
        for (let i = startIndex; i < endIndex; i++) {
            if (i + 1 < smoothedData.time.length) {
                const deltaTime = smoothedData.time[i + 1] - smoothedData.time[i];
                const acceleration = smoothedData.absoluteAccel[i];
                
                // Approximate speed as acceleration * time (simplified integration)
                const speed = Math.abs(acceleration * deltaTime);
                totalSpeed += speed;
                count++;
            }
        }
        
        return count > 0 ? totalSpeed / count : 0;
    }

    /**
     * Normalize speed values to 0-1 range for compatibility with existing visualizer
     * @param {number} speed - Raw speed value
     * @returns {number} - Normalized dynamics value (0-1)
     */
    normalizeDynamics(speed) {
        // Use a scaling factor to map speed to 0-1 range
        // This can be adjusted based on typical speed ranges in climbing data
        const maxExpectedSpeed = 2.0; // Adjust based on data analysis
        const normalized = Math.min(speed / maxExpectedSpeed, 1.0);
        
        // Ensure minimum dynamics for visualization
        return Math.max(normalized, 0.1);
    }

    /**
     * Classify move type based on acceleration characteristics
     * @param {Object} peak - Peak data
     * @param {Object} smoothedData - Smoothed acceleration data
     * @returns {string} - Move type classification
     */
    classifyMoveType(peak, smoothedData) {
        const acceleration = peak.acceleration;
        const prominence = peak.prominence;
        
        // Classify based on acceleration magnitude and prominence
        if (acceleration > 12 && prominence > 2) {
            return 'dynamic'; // High acceleration, high prominence = dynamic move
        } else if (acceleration > 10) {
            return 'dynamic'; // High acceleration = dynamic move
        } else {
            return 'static'; // Lower acceleration = static move
        }
    }

    /**
     * Update analyzer settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        if (settings.smoothingWindow !== undefined) {
            this.smoothingWindow = settings.smoothingWindow;
        }
        if (settings.peakThreshold !== undefined) {
            this.peakThreshold = settings.peakThreshold;
        }
        if (settings.minPeakDistance !== undefined) {
            this.minPeakDistance = settings.minPeakDistance;
        }
        if (settings.speedCalculationRadius !== undefined) {
            this.speedCalculationRadius = settings.speedCalculationRadius;
        }
        if (settings.maxMoves !== undefined) {
            this.maxMoves = settings.maxMoves;
        }
    }
} 