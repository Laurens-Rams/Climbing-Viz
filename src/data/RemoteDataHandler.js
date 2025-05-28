class RemoteDataHandler {
    constructor() {
        this.isRecording = false;
        this.recordedData = [];
        this.startTime = null;
        this.remoteUrl = 'http://192.168.1.35';
        this.pollInterval = null;
        this.pollRate = 50; // Poll every 50ms for smooth real-time updates
        this.onDataCallback = null;
        this.onRecordingStateChange = null;
        
        // Data structure for Phyphox acceleration data
        this.dataBuffer = {
            time: [],
            accX: [],
            accY: [],
            accZ: []
        };
    }

    // Set callback for real-time data updates
    setDataCallback(callback) {
        this.onDataCallback = callback;
    }

    // Set callback for recording state changes
    setRecordingStateCallback(callback) {
        this.onRecordingStateChange = callback;
    }

    // Check if remote device is accessible
    async checkRemoteConnection() {
        try {
            const response = await fetch(`${this.remoteUrl}/get?acc_time&acc_x&acc_y&acc_z`, {
                method: 'GET',
                mode: 'cors',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('Remote connection check failed:', error);
            return false;
        }
    }

    // Start recording data from remote device
    async startRecording() {
        if (this.isRecording) return;

        const isConnected = await this.checkRemoteConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to remote device at ' + this.remoteUrl);
        }

        this.isRecording = true;
        this.recordedData = [];
        this.startTime = Date.now();
        this.dataBuffer = { time: [], accX: [], accY: [], accZ: [] };

        console.log('Starting remote data recording from', this.remoteUrl);

        // Start polling for data
        this.pollInterval = setInterval(() => {
            this.fetchRemoteData();
        }, this.pollRate);

        if (this.onRecordingStateChange) {
            this.onRecordingStateChange(true);
        }
    }

    // Stop recording and generate CSV
    async stopRecording() {
        if (!this.isRecording) return null;

        this.isRecording = false;
        clearInterval(this.pollInterval);
        this.pollInterval = null;

        console.log('Stopped recording. Total data points:', this.recordedData.length);

        if (this.onRecordingStateChange) {
            this.onRecordingStateChange(false);
        }

        // Generate CSV file
        if (this.recordedData.length > 0) {
            return this.generateCSVFile();
        }

        return null;
    }

    // Fetch data from remote device
    async fetchRemoteData() {
        try {
            const response = await fetch(`${this.remoteUrl}/get?acc_time&acc_x&acc_y&acc_z`);
            if (!response.ok) throw new Error('Failed to fetch data');

            const data = await response.json();
            
            // Process the received data
            this.processRemoteData(data);

        } catch (error) {
            console.warn('Error fetching remote data:', error);
            // Don't stop recording on temporary network errors
        }
    }

    // Process incoming data from Phyphox
    processRemoteData(data) {
        // Phyphox typically returns data in this format:
        // { "acc_time": [array], "acc_x": [array], "acc_y": [array], "acc_z": [array] }
        
        if (!data.acc_time || !data.acc_x || !data.acc_y || !data.acc_z) {
            return;
        }

        const timeData = data.acc_time;
        const accXData = data.acc_x;
        const accYData = data.acc_y;
        const accZData = data.acc_z;

        // Only process new data points
        const newDataCount = timeData.length;
        if (newDataCount === 0) return;

        // Add new data points to our buffer and recorded data
        for (let i = 0; i < newDataCount; i++) {
            const timestamp = timeData[i];
            const accX = accXData[i];
            const accY = accYData[i];
            const accZ = accZData[i];

            // Add to buffer for real-time visualization
            this.dataBuffer.time.push(timestamp);
            this.dataBuffer.accX.push(accX);
            this.dataBuffer.accY.push(accY);
            this.dataBuffer.accZ.push(accZ);

            // Add to recorded data for CSV generation
            this.recordedData.push({
                time: timestamp,
                accX: accX,
                accY: accY,
                accZ: accZ
            });
        }

        // Keep buffer size manageable (last 1000 points for real-time viz)
        const maxBufferSize = 1000;
        if (this.dataBuffer.time.length > maxBufferSize) {
            const excess = this.dataBuffer.time.length - maxBufferSize;
            this.dataBuffer.time.splice(0, excess);
            this.dataBuffer.accX.splice(0, excess);
            this.dataBuffer.accY.splice(0, excess);
            this.dataBuffer.accZ.splice(0, excess);
        }

        // Notify listeners of new data
        if (this.onDataCallback) {
            this.onDataCallback({
                buffer: this.dataBuffer,
                newPoints: newDataCount,
                totalRecorded: this.recordedData.length
            });
        }
    }

    // Generate CSV file from recorded data
    generateCSVFile() {
        if (this.recordedData.length === 0) return null;

        // Create CSV content
        let csvContent = 'Time (s),Linear Acceleration x (m/s²),Linear Acceleration y (m/s²),Linear Acceleration z (m/s²)\n';
        
        this.recordedData.forEach(point => {
            csvContent += `${point.time},${point.accX},${point.accY},${point.accZ}\n`;
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `Remote_Data_${timestamp}.csv`;

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('Generated CSV file:', filename);
        return { filename, data: csvContent, blob };
    }

    // Get current data buffer for visualization
    getCurrentData() {
        return this.dataBuffer;
    }

    // Get recording status
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            dataPoints: this.recordedData.length,
            duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0
        };
    }

    // Set remote URL
    setRemoteUrl(url) {
        this.remoteUrl = url;
    }

    // Get remote URL
    getRemoteUrl() {
        return this.remoteUrl;
    }
}

export default RemoteDataHandler; 