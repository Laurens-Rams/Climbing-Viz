import { AccelerationAnalyzer } from './accelerationAnalyzer.js';

// Initialize the acceleration analyzer
const accelerationAnalyzer = new AccelerationAnalyzer();

// Available CSV data files with metadata
const csvBoulders = [
    {
        id: 1,
        name: "Sensor Climb 1",
        grade: "V5",
        csvFile: "Raw Data.csv",
        description: "Real climbing data from acceleration sensors"
    },
    {
        id: 2,
        name: "Sensor Climb 2", 
        grade: "V4",
        csvFile: "Raw Data1.csv",
        description: "Real climbing data from acceleration sensors"
    }
];

// Cache for processed boulder data
const processedBoulders = new Map();

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
            grade: boulderInfo.grade,
            description: `Error loading data: ${error.message}`,
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
    
    const boulderInfo = csvBoulders.find(b => b.id === id);
    if (!boulderInfo) {
        console.error('Boulder not found with id:', id);
        return null;
    }
    
    return await loadCSVBoulder(boulderInfo);
}

/**
 * Get list of available boulders
 * @returns {Array} - Array of boulder metadata
 */
export function getBoulderList() {
    console.log('getBoulderList called, returning:', csvBoulders.length, 'boulders');
    return csvBoulders.map(boulder => ({
        id: boulder.id,
        name: boulder.name,
        grade: boulder.grade,
        type: 'csv',
        description: boulder.description
    }));
}

/**
 * Generate a random boulder (selects randomly from available CSV boulders)
 * @returns {Promise<Object>} - Random boulder data
 */
export async function generateRandomBoulder() {
    console.log('generateRandomBoulder called');
    
    const randomIndex = Math.floor(Math.random() * csvBoulders.length);
    const randomBoulder = csvBoulders[randomIndex];
    
    console.log('Selected random boulder:', randomBoulder.name);
    return await loadCSVBoulder(randomBoulder);
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
 * Add a new CSV boulder to the available list
 * @param {Object} boulderInfo - Boulder metadata
 */
export function addCSVBoulder(boulderInfo) {
    const newId = Math.max(...csvBoulders.map(b => b.id)) + 1;
    const newBoulder = {
        id: newId,
        ...boulderInfo,
        type: 'csv'
    };
    
    csvBoulders.push(newBoulder);
    console.log('Added new CSV boulder:', newBoulder.name);
    
    return newBoulder;
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
        name: boulderInfo?.name || 'Unknown'
    };
}

// Export boulder list for external access
export { csvBoulders }; 