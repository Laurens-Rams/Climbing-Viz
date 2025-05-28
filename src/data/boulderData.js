import { AccelerationAnalyzer } from './accelerationAnalyzer.js';

// Initialize the acceleration analyzer
const accelerationAnalyzer = new AccelerationAnalyzer();

// Available CSV data files - these will be dynamically populated
let csvBoulders = [
    {
        id: 1,
        name: "Raw Data",
        csvFile: "Raw Data.csv",
        description: "Real climbing data from acceleration sensors"
    },
    {
        id: 2,
        name: "Raw Data1", 
        csvFile: "Raw Data1.csv",
        description: "Real climbing data from acceleration sensors"
    }
];

// Cache for processed boulder data
const processedBoulders = new Map();

/**
 * Dynamically discover CSV files in the data directory
 * This function will be enhanced when we have server-side file listing
 */
async function discoverCSVFiles() {
    // For now, we'll use the predefined list, but this can be enhanced
    // to automatically discover CSV files when running on a server
    const knownCSVFiles = [
        "Raw Data.csv",
        "Raw Data1.csv"
        // Add more CSV files here as they become available
    ];
    
    const discoveredBoulders = [];
    let id = 1;
    
    for (const csvFile of knownCSVFiles) {
        try {
            // Test if the file exists by trying to fetch it
            const response = await fetch(`/src/data/${csvFile}`);
            if (response.ok) {
                const name = csvFile.replace('.csv', ''); // Use filename without extension as name
                discoveredBoulders.push({
                    id: id++,
                    name: name,
                    csvFile: csvFile,
                    description: `Real climbing data from ${csvFile}`
                });
            }
        } catch (error) {
            console.warn(`CSV file ${csvFile} not found or not accessible`);
        }
    }
    
    csvBoulders = discoveredBoulders;
    console.log('Discovered CSV files:', csvBoulders.map(b => b.csvFile));
    return csvBoulders;
}

/**
 * Load and process CSV file for a boulder
 * @param {Object} boulderInfo - Boulder metadata
 * @returns {Promise<Object>} - Processed boulder data
 */
async function loadCSVBoulder(boulderInfo) {
    try {
        console.log('Loading CSV boulder:', boulderInfo.name);
        
        // Check cache first
        if (processedBoulders.has(boulderInfo.id)) {
            console.log('Returning cached boulder data for:', boulderInfo.name);
            return processedBoulders.get(boulderInfo.id);
        }
        
        // Load CSV file
        const csvPath = `/src/data/${boulderInfo.csvFile}`;
        console.log('Fetching CSV from:', csvPath);
        
        const response = await fetch(csvPath);
        if (!response.ok) {
            throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('CSV loaded, size:', csvText.length, 'characters');
        
        // Process with acceleration analyzer
        const processedBoulder = await accelerationAnalyzer.analyzeClimbingData(csvText, boulderInfo);
        
        // Cache the processed data
        processedBoulders.set(boulderInfo.id, processedBoulder);
        
        console.log('Boulder processed and cached:', processedBoulder.name);
        return processedBoulder;
        
    } catch (error) {
        console.error('Error loading CSV boulder:', error);
        
        // Return fallback boulder with minimal data
        return {
            id: boulderInfo.id,
            name: boulderInfo.name,
            csvFile: boulderInfo.csvFile,
            description: `Error loading data from ${boulderInfo.csvFile}: ${error.message}`,
            type: 'csv',
            moves: [
                { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Fallback move" }
            ],
            error: true
        };
    }
}

/**
 * Get boulder by ID
 * @param {number} id - Boulder ID
 * @returns {Promise<Object>} - Boulder data
 */
export async function getBoulderById(id) {
    console.log('getBoulderById called with id:', id);
    
    // Ensure CSV files are discovered
    await discoverCSVFiles();
    
    const boulderInfo = csvBoulders.find(b => b.id === id);
    if (!boulderInfo) {
        console.error('Boulder not found with id:', id);
        return null;
    }
    
    return await loadCSVBoulder(boulderInfo);
}

/**
 * Get list of available boulders
 * @returns {Promise<Array>} - Array of boulder metadata
 */
export async function getBoulderList() {
    console.log('getBoulderList called');
    
    // Ensure CSV files are discovered
    await discoverCSVFiles();
    
    const boulderList = csvBoulders.map(boulder => ({
        id: boulder.id,
        name: boulder.name,
        csvFile: boulder.csvFile,
        type: 'csv',
        description: boulder.description
    }));
    
    console.log('Returning boulder list:', boulderList.length, 'boulders');
    return boulderList;
}

/**
 * Generate a random boulder (selects randomly from available CSV boulders)
 * @returns {Promise<Object>} - Random boulder data
 */
export async function generateRandomBoulder() {
    console.log('generateRandomBoulder called');
    
    // Ensure CSV files are discovered
    await discoverCSVFiles();
    
    const randomIndex = Math.floor(Math.random() * csvBoulders.length);
    const randomBoulder = csvBoulders[randomIndex];
    
    console.log('Selected random boulder:', randomBoulder.name);
    return await loadCSVBoulder(randomBoulder);
}

/**
 * Add a new CSV file to the system
 * @param {string} csvFileName - Name of the CSV file (e.g., "Raw Data2.csv")
 * @returns {Object} - New boulder info
 */
export function addCSVFile(csvFileName) {
    const name = csvFileName.replace('.csv', '');
    const newId = Math.max(...csvBoulders.map(b => b.id), 0) + 1;
    
    const newBoulder = {
        id: newId,
        name: name,
        csvFile: csvFileName,
        description: `Real climbing data from ${csvFileName}`
    };
    
    csvBoulders.push(newBoulder);
    console.log('Added new CSV file:', csvFileName, 'as boulder:', name);
    
    return newBoulder;
}

/**
 * Clear the boulder cache (useful for reloading data)
 */
export function clearBoulderCache() {
    console.log('Clearing boulder cache');
    processedBoulders.clear();
}

/**
 * Update acceleration analyzer settings
 * @param {Object} settings - New analyzer settings
 */
export function updateAnalyzerSettings(settings) {
    console.log('Updating analyzer settings:', settings);
    accelerationAnalyzer.updateSettings(settings);
    
    // Clear cache to force reprocessing with new settings
    clearBoulderCache();
}

/**
 * Get acceleration analyzer instance for direct access
 * @returns {AccelerationAnalyzer} - The analyzer instance
 */
export function getAccelerationAnalyzer() {
    return accelerationAnalyzer;
}

/**
 * Get boulder processing status
 * @param {number} id - Boulder ID
 * @returns {Object} - Processing status information
 */
export function getBoulderStatus(id) {
    const isProcessed = processedBoulders.has(id);
    const boulderInfo = csvBoulders.find(b => b.id === id);
    
    return {
        id,
        exists: !!boulderInfo,
        processed: isProcessed,
        cached: isProcessed,
        name: boulderInfo?.name || 'Unknown',
        csvFile: boulderInfo?.csvFile || 'Unknown'
    };
}

/**
 * Get all available CSV files
 * @returns {Array} - Array of CSV filenames
 */
export function getAvailableCSVFiles() {
    return csvBoulders.map(boulder => boulder.csvFile);
}

// Export boulder list for external access
export { csvBoulders }; 