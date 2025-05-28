// CSV Boulder Data - Real climbing acceleration data from sensor files
// Structure optimized for CSV data processing

// Function to get a boulder by ID
export function getBoulderById(id) {
    const allBoulders = getBoulderList();
    return allBoulders.find(boulder => boulder.id === id);
}

// Function to get all boulder names for selection
export function getBoulderList() {
    // Only CSV file options - real sensor data
    const csvOptions = [
        {
            id: 'csv_raw',
            name: "Raw Sensor Data",
            grade: "CSV", 
            description: "Raw acceleration data from climbing session",
            type: "csv",
            filename: "Raw Data.csv",
            moves: [] // Will be calculated from CSV data
        },
        {
            id: 'csv_raw1',
            name: "Raw Data Session 1",
            grade: "CSV", 
            description: "Climbing session acceleration data",
            type: "csv",
            filename: "Raw Data1.csv",
            moves: [] // Will be calculated from CSV data
        },
        {
            id: 'csv_sample',
            name: "Sample Climbing Data",
            grade: "V5", 
            description: "Real climbing data from DataViz2 - Crimpy Overhang",
            type: "csv",
            filename: "sample_real_climbing_data.csv",
            moves: [] // Will be calculated from CSV data
        }
    ];
    
    return csvOptions;
}

// Function to generate random boulder (picks one of the CSV files randomly)
export function generateRandomBoulder() {
    const csvBoulders = getBoulderList();
    const randomIndex = Math.floor(Math.random() * csvBoulders.length);
    return csvBoulders[randomIndex];
} 