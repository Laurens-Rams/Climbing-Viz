// Boulder data management for real CSV files only
let csvFileCache = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Dynamically discover CSV files in the data directory
async function discoverCSVFiles() {
    const csvFiles = [];
    
    // Common CSV file patterns to try
    const commonPatterns = [
        'Raw Data.csv',
        'Raw Data2.csv', 
        'Raw Data3.csv',
        'Raw Data4.csv',
        'Raw Data5.csv',
        'rawdata.csv',
        'rawdata2.csv',
        'rawdata3.csv',
        'data.csv',
        'climbing.csv',
        'acceleration.csv'
    ];
    
    for (const filename of commonPatterns) {
        const filepath = `src/data/${filename}`;
        try {
            const response = await fetch(filepath);
            if (response.ok) {
                // Validate that the response contains actual CSV data, not HTML
                const text = await response.text();
                if (text.trim().startsWith('<!DOCTYPE html>') || 
                    text.trim().startsWith('<html') ||
                    text.includes('<title>404</title>') ||
                    text.includes('Not Found')) {
                    // This is an HTML error page, not a CSV file
                    continue;
                }
                
                // Basic CSV validation - should have comma-separated headers
                const firstLine = text.split('\n')[0];
                if (firstLine && firstLine.includes(',') && 
                    (firstLine.toLowerCase().includes('time') || 
                     firstLine.toLowerCase().includes('acceleration'))) {
                    csvFiles.push(filepath);
                    console.log(`Found CSV file: ${filepath}`);
                }
            }
        } catch (error) {
            // File doesn't exist, continue
        }
    }
    
    console.log(`Discovered ${csvFiles.length} CSV files:`, csvFiles);
    return csvFiles;
}

// Parse real CSV data from Phyphox format
function parsePhyphoxCSV(csvText, filename) {
    console.log(`Parsing CSV file: ${filename}`);
    
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is too short');
    }

    // Parse headers
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

    if (timeCol === -1) {
        throw new Error('Could not find time column in CSV');
    }
    if (absAccelCol === -1) {
        throw new Error('Could not find absolute acceleration column in CSV');
    }

    console.log(`Found columns - Time: ${timeCol}, Absolute Acceleration: ${absAccelCol}`);

    // Parse data
    const time = [];
    const absoluteAcceleration = [];
    let validRows = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => {
            const trimmed = v.trim().replace(/"/g, '');
            // Handle scientific notation
            const num = parseFloat(trimmed);
            return isNaN(num) ? 0 : num;
        });

        if (values.length <= Math.max(timeCol, absAccelCol)) continue;

        const timeVal = values[timeCol];
        const accelVal = values[absAccelCol];

        if (!isNaN(timeVal) && !isNaN(accelVal) && accelVal > 0) {
            time.push(timeVal);
            absoluteAcceleration.push(accelVal);
            validRows++;
        }
    }

    if (validRows === 0) {
        throw new Error('No valid data rows found in CSV');
    }

    console.log(`Parsed ${validRows} valid data points from ${filename}`);
    console.log(`Time range: ${Math.min(...time).toFixed(3)}s to ${Math.max(...time).toFixed(3)}s`);
    console.log(`Acceleration range: ${Math.min(...absoluteAcceleration).toFixed(2)} to ${Math.max(...absoluteAcceleration).toFixed(2)} m/s²`);

    return {
        time,
        absoluteAcceleration,
        filename,
        duration: Math.max(...time) - Math.min(...time),
        maxAcceleration: Math.max(...absoluteAcceleration),
        avgAcceleration: absoluteAcceleration.reduce((a, b) => a + b, 0) / absoluteAcceleration.length,
        sampleCount: validRows
    };
}

// Convert CSV data to boulder visualization format
function convertCSVToBoulder(csvData, id) {
    const { time, absoluteAcceleration, filename, duration, maxAcceleration, avgAcceleration } = csvData;
    
    // Detect significant moves based on acceleration peaks
    const moves = detectMovesFromAcceleration(time, absoluteAcceleration);
    
    // Determine grade based on acceleration characteristics
    const grade = estimateGradeFromData(maxAcceleration, avgAcceleration, moves.length);
    
    // Clean filename for display
    const cleanName = filename.replace(/^.*\//, '').replace('.csv', '');
    const csvFileName = filename.replace(/^.*\//, '');
    
    console.log(`Converting CSV to boulder - filename: "${filename}", csvFileName: "${csvFileName}", cleanName: "${cleanName}"`);
    
    const boulder = {
        id,
        name: `${cleanName} (Real Data)`,
        grade,
        type: 'csv',
        description: `Real climbing data from ${cleanName}`,
        csvFile: csvFileName, // Store just the filename without path
        moves,
        csvData,
        stats: {
            duration: duration.toFixed(1),
            maxAcceleration: maxAcceleration.toFixed(2),
            avgAcceleration: avgAcceleration.toFixed(2),
            moveCount: moves.length,
            sampleCount: csvData.sampleCount
        }
    };
    
    console.log(`Created boulder object:`, boulder);
    return boulder;
}

// Detect climbing moves from acceleration data
function detectMovesFromAcceleration(time, acceleration) {
    const moves = [];
    const threshold = 12.0; // m/s² threshold for significant moves
    const minMoveDuration = 0.5; // minimum seconds between moves
    
    let lastMoveTime = -minMoveDuration;
    
    // First, detect all the actual moves
    const detectedMoves = [];
    for (let i = 1; i < acceleration.length - 1; i++) {
        const currentAccel = acceleration[i];
        const currentTime = time[i];
        
        // Look for peaks above threshold
        if (currentAccel > threshold && 
            currentAccel > acceleration[i-1] && 
            currentAccel > acceleration[i+1] &&
            (currentTime - lastMoveTime) > minMoveDuration) {
            
            // Determine move type based on acceleration magnitude
            let moveType, dynamics, isCrux;
            
            if (currentAccel > 30) {
                moveType = 'dyno';
                dynamics = 0.9;
                isCrux = true;
            } else if (currentAccel > 20) {
                moveType = 'dynamic';
                dynamics = 0.8;
                isCrux = currentAccel > 25;
            } else if (currentAccel > 15) {
                moveType = 'powerful';
                dynamics = 0.7;
                isCrux = false;
            } else {
                moveType = 'static';
                dynamics = 0.6;
                isCrux = false;
            }
            
            detectedMoves.push({
                time: currentTime,
                type: moveType,
                dynamics,
                isCrux,
                acceleration: currentAccel,
                description: `${moveType} move (${currentAccel.toFixed(1)} m/s²)`
            });
            
            lastMoveTime = currentTime;
        }
    }
    
    // Add starting position at time 0 (this will be at 12 o'clock, move 0)
    moves.push({
        time: 0,
        type: 'start',
        dynamics: 0.5,
        isCrux: false,
        acceleration: acceleration[0] || 9.8, // Use first acceleration value or gravity
        description: 'Starting position'
    });
    
    // Add all detected moves (these will be moves 1, 2, 3, etc. going clockwise)
    moves.push(...detectedMoves);
    
    console.log(`Detected ${moves.length} moves from acceleration data (including start position)`);
    return moves;
}

// Estimate boulder grade from acceleration data
function estimateGradeFromData(maxAccel, avgAccel, moveCount) {
    // Simple heuristic based on acceleration characteristics
    if (maxAccel > 40 || avgAccel > 15) return 'V8+';
    if (maxAccel > 30 || avgAccel > 12) return 'V6-V7';
    if (maxAccel > 20 || avgAccel > 10) return 'V4-V5';
    if (maxAccel > 15 || avgAccel > 8) return 'V2-V3';
    return 'V0-V1';
}

// Load CSV file
async function loadCSVFile(filepath) {
    try {
        console.log(`Loading CSV file: ${filepath}`);
        const response = await fetch(filepath);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${filepath}: ${response.status}`);
        }
        
        const csvText = await response.text();
        const csvData = parsePhyphoxCSV(csvText, filepath);
        
        console.log(`Successfully loaded CSV: ${filepath}`);
        return csvData;
        
    } catch (error) {
        console.error(`Error loading CSV file ${filepath}:`, error);
        throw error;
    }
}

// Get list of available boulders (from real CSV files)
export async function getBoulderList() {
    const boulders = [];
    
    // Dynamically discover CSV files
    const csvFiles = await discoverCSVFiles();
    
    for (let i = 0; i < csvFiles.length; i++) {
        const filepath = csvFiles[i];
        const cacheKey = filepath;
        
        try {
            // Check cache first
            if (csvFileCache.has(cacheKey)) {
                const cached = csvFileCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_DURATION) {
                    boulders.push(cached.boulder);
                    continue;
                }
            }
            
            // Load and parse CSV
            const csvData = await loadCSVFile(filepath);
            const boulder = convertCSVToBoulder(csvData, i + 1);
            
            // Cache the result
            csvFileCache.set(cacheKey, {
                boulder,
                timestamp: Date.now()
            });
            
            boulders.push(boulder);
            
        } catch (error) {
            console.error(`Failed to load boulder from ${filepath}:`, error);
            // Continue with other files
        }
    }
    
    console.log(`Loaded ${boulders.length} real CSV boulders`);
    return boulders;
}

// Get boulder by ID
export async function getBoulderById(id) {
    const boulders = await getBoulderList();
    console.log(`getBoulderById(${id}) - Available boulders:`, boulders.map(b => ({ id: b.id, name: b.name })));
    
    // Convert id to number for comparison since dropdown values might be strings
    const targetId = parseInt(id);
    const boulder = boulders.find(b => parseInt(b.id) === targetId);
    
    console.log(`getBoulderById(${id}) found:`, boulder ? `${boulder.name} (ID: ${boulder.id})` : 'not found');
    return boulder || boulders[0];
}

// Get random boulder
export async function getRandomBoulder() {
    const boulders = await getBoulderList();
    if (boulders.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * boulders.length);
    return boulders[randomIndex];
}

// Clear cache
export function clearCache() {
    csvFileCache.clear();
    console.log('CSV file cache cleared');
}

// Add new boulder from remote data
export async function addBoulderFromRemoteData(csvText, baseFilename) {
    try {
        console.log(`Adding new boulder from remote data: ${baseFilename}`);
        const csvData = parsePhyphoxCSV(csvText, baseFilename); // Use existing parser

        // Get current boulders to determine next ID
        const currentBoulders = await getBoulderList();
        let nextId = 1;
        if (currentBoulders.length > 0) {
            nextId = Math.max(...currentBoulders.map(b => parseInt(b.id))) + 1;
        }

        const newBoulder = convertCSVToBoulder(csvData, nextId);
        
        // Add to cache so it's immediately available
        // The cache key should be unique, use the generated filename perhaps, or a special prefix
        // For simplicity, let's use its new ID as part of a unique key for now, though
        // discoverCSVFiles won't find it. This makes it available via getBoulderById.
        // A more robust solution might involve saving the CSV and re-discovering.
        const cacheKey = `remote_${newBoulder.csvFile}_${newBoulder.id}`;
        csvFileCache.set(cacheKey, {
            boulder: newBoulder,
            timestamp: Date.now()
        });
        
        console.log('Added new remote boulder:', newBoulder);
        // Manually add to the list of boulders if we want it to appear in dropdowns *without* a full refresh
        // This is a bit of a hack. The ideal way is to save the file and have discoverCSVFiles pick it up.
        // For now, returning it and letting UI decide to select it is fine.
        // The controlPanel.rebuildBoulderDropdown() in main.js will call getBoulderList() which includes cache.

        return newBoulder;
    } catch (error) {
        console.error('Error adding boulder from remote data:', error);
        throw error; // Re-throw for main.js to handle
    }
}

// Debug function
export async function debugBoulderState() {
    const discoveredFiles = await discoverCSVFiles();
    return {
        cacheSize: csvFileCache.size,
        lastUpdate: lastCacheUpdate,
        discoveredFiles: discoveredFiles,
        cacheKeys: Array.from(csvFileCache.keys())
    };
} 