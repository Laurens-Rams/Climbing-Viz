// 20 Distinctive Boulder Problems - Each with unique style and characteristics
// Structure: { name, grade, moves: [{ sequence, dynamics, isCrux, type }] }

export const mockBoulders = [
    {
        id: 1,
        name: "The Crimper",
        grade: "V7",
        description: "Technical crimping problem with a powerful crux",
        moves: [
            { sequence: 1, dynamics: 0.2, isCrux: false, type: "static", description: "Start holds - small crimps" },
            { sequence: 2, dynamics: 0.3, isCrux: false, type: "static", description: "Right hand crimp" },
            { sequence: 3, dynamics: 0.4, isCrux: false, type: "static", description: "Left hand pinch" },
            { sequence: 4, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Crux dyno to sloper" },
            { sequence: 5, dynamics: 0.5, isCrux: false, type: "static", description: "Match sloper" },
            { sequence: 6, dynamics: 0.3, isCrux: false, type: "static", description: "Top out" }
        ]
    },
    
    {
        id: 2,
        name: "Flow State",
        grade: "V4",
        description: "Smooth flowing problem with consistent movement",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Jug start" },
            { sequence: 2, dynamics: 0.5, isCrux: false, type: "dynamic", description: "Right hand reach" },
            { sequence: 3, dynamics: 0.6, isCrux: true, type: "dynamic", description: "Left hand throw" },
            { sequence: 4, dynamics: 0.6, isCrux: true, type: "dynamic", description: "Right hand catch" },
            { sequence: 5, dynamics: 0.5, isCrux: false, type: "static", description: "Feet up" },
            { sequence: 6, dynamics: 0.4, isCrux: false, type: "static", description: "Left hand hold" },
            { sequence: 7, dynamics: 0.3, isCrux: false, type: "static", description: "Right hand finish" },
            { sequence: 8, dynamics: 0.2, isCrux: false, type: "static", description: "Top out" }
        ]
    },
    
    {
        id: 3,
        name: "Power Surge",
        grade: "V9",
        description: "Explosive problem with multiple dynamic moves",
        moves: [
            { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Low start holds" },
            { sequence: 2, dynamics: 0.7, isCrux: false, type: "dynamic", description: "First throw" },
            { sequence: 3, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Big dyno left" },
            { sequence: 4, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Double dyno" },
            { sequence: 5, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Right hand catch" },
            { sequence: 6, dynamics: 0.6, isCrux: false, type: "static", description: "Stabilize" },
            { sequence: 7, dynamics: 0.4, isCrux: false, type: "static", description: "Left hand up" },
            { sequence: 8, dynamics: 0.5, isCrux: false, type: "dynamic", description: "Right hand reach" },
            { sequence: 9, dynamics: 0.3, isCrux: false, type: "static", description: "Match top" },
            { sequence: 10, dynamics: 0.2, isCrux: false, type: "static", description: "Top out" }
        ]
    },

    {
        id: 4,
        name: "Slab Master",
        grade: "V3",
        description: "Pure slab climbing with delicate balance",
        moves: [
            { sequence: 1, dynamics: 0.1, isCrux: false, type: "static", description: "Delicate start" },
            { sequence: 2, dynamics: 0.1, isCrux: false, type: "static", description: "Tiny crimp" },
            { sequence: 3, dynamics: 0.2, isCrux: true, type: "static", description: "Balance crux" },
            { sequence: 4, dynamics: 0.1, isCrux: false, type: "static", description: "Smear feet" },
            { sequence: 5, dynamics: 0.2, isCrux: false, type: "static", description: "High step" },
            { sequence: 6, dynamics: 0.1, isCrux: false, type: "static", description: "Mantle" }
        ]
    },

    {
        id: 5,
        name: "Overhang Beast",
        grade: "V8",
        description: "Steep overhang with sustained power",
        moves: [
            { sequence: 1, dynamics: 0.6, isCrux: false, type: "dynamic", description: "Steep start" },
            { sequence: 2, dynamics: 0.7, isCrux: false, type: "dynamic", description: "Pull hard" },
            { sequence: 3, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Roof crux" },
            { sequence: 4, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Big move" },
            { sequence: 5, dynamics: 0.7, isCrux: false, type: "dynamic", description: "Keep going" },
            { sequence: 6, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Final throw" },
            { sequence: 7, dynamics: 0.5, isCrux: false, type: "static", description: "Match" },
            { sequence: 8, dynamics: 0.3, isCrux: false, type: "static", description: "Top out" }
        ]
    },

    {
        id: 6,
        name: "Micro Crimps",
        grade: "V6",
        description: "Fingertip strength on tiny holds",
        moves: [
            { sequence: 1, dynamics: 0.2, isCrux: false, type: "static", description: "Small start holds" },
            { sequence: 2, dynamics: 0.3, isCrux: true, type: "static", description: "Micro crimp" },
            { sequence: 3, dynamics: 0.4, isCrux: true, type: "static", description: "Even smaller" },
            { sequence: 4, dynamics: 0.3, isCrux: true, type: "static", description: "Razor crimp" },
            { sequence: 5, dynamics: 0.2, isCrux: false, type: "static", description: "Better hold" },
            { sequence: 6, dynamics: 0.1, isCrux: false, type: "static", description: "Easy finish" }
        ]
    },

    {
        id: 7,
        name: "Dyno Machine",
        grade: "V5",
        description: "All about the big throws",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Setup" },
            { sequence: 2, dynamics: 0.9, isCrux: true, type: "dynamic", description: "First dyno" },
            { sequence: 3, dynamics: 0.3, isCrux: false, type: "static", description: "Reset" },
            { sequence: 4, dynamics: 1.0, isCrux: true, type: "dynamic", description: "Massive dyno" },
            { sequence: 5, dynamics: 0.2, isCrux: false, type: "static", description: "Easy top" }
        ]
    },

    {
        id: 8,
        name: "Endurance Test",
        grade: "V4",
        description: "Long problem testing stamina",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Start" },
            { sequence: 2, dynamics: 0.5, isCrux: false, type: "dynamic", description: "Move 2" },
            { sequence: 3, dynamics: 0.4, isCrux: false, type: "static", description: "Move 3" },
            { sequence: 4, dynamics: 0.5, isCrux: false, type: "dynamic", description: "Move 4" },
            { sequence: 5, dynamics: 0.6, isCrux: false, type: "dynamic", description: "Move 5" },
            { sequence: 6, dynamics: 0.5, isCrux: false, type: "static", description: "Move 6" },
            { sequence: 7, dynamics: 0.4, isCrux: false, type: "static", description: "Move 7" },
            { sequence: 8, dynamics: 0.6, isCrux: true, type: "dynamic", description: "Pump crux" },
            { sequence: 9, dynamics: 0.5, isCrux: false, type: "static", description: "Move 9" },
            { sequence: 10, dynamics: 0.4, isCrux: false, type: "static", description: "Move 10" },
            { sequence: 11, dynamics: 0.3, isCrux: false, type: "static", description: "Move 11" },
            { sequence: 12, dynamics: 0.2, isCrux: false, type: "static", description: "Finish" }
        ]
    },

    {
        id: 9,
        name: "Pinch Fest",
        grade: "V6",
        description: "All about pinch strength",
        moves: [
            { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Start pinch" },
            { sequence: 2, dynamics: 0.5, isCrux: true, type: "static", description: "Hard pinch" },
            { sequence: 3, dynamics: 0.6, isCrux: true, type: "static", description: "Harder pinch" },
            { sequence: 4, dynamics: 0.4, isCrux: false, type: "static", description: "Medium pinch" },
            { sequence: 5, dynamics: 0.3, isCrux: false, type: "static", description: "Easy finish" }
        ]
    },

    {
        id: 10,
        name: "Coordination Chaos",
        grade: "V7",
        description: "Complex body positioning and coordination",
        moves: [
            { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Start" },
            { sequence: 2, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Cross through" },
            { sequence: 3, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Heel hook" },
            { sequence: 4, dynamics: 0.6, isCrux: true, type: "dynamic", description: "Twist move" },
            { sequence: 5, dynamics: 0.5, isCrux: false, type: "static", description: "Reorganize" },
            { sequence: 6, dynamics: 0.4, isCrux: false, type: "static", description: "Top out" }
        ]
    },

    {
        id: 11,
        name: "Sloper Nightmare",
        grade: "V8",
        description: "Terrible slopers requiring core strength",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Start holds" },
            { sequence: 2, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Bad sloper" },
            { sequence: 3, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Worse sloper" },
            { sequence: 4, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Terrible sloper" },
            { sequence: 5, dynamics: 0.6, isCrux: false, type: "static", description: "Better hold" },
            { sequence: 6, dynamics: 0.3, isCrux: false, type: "static", description: "Finish" }
        ]
    },

    {
        id: 12,
        name: "Beginner's Joy",
        grade: "V1",
        description: "Perfect for learning movement",
        moves: [
            { sequence: 1, dynamics: 0.2, isCrux: false, type: "static", description: "Big start holds" },
            { sequence: 2, dynamics: 0.3, isCrux: false, type: "static", description: "Good hold" },
            { sequence: 3, dynamics: 0.4, isCrux: true, type: "static", description: "Small challenge" },
            { sequence: 4, dynamics: 0.2, isCrux: false, type: "static", description: "Easy finish" }
        ]
    },

    {
        id: 13,
        name: "Roof Traverse",
        grade: "V5",
        description: "Horizontal roof climbing",
        moves: [
            { sequence: 1, dynamics: 0.5, isCrux: false, type: "static", description: "Start under roof" },
            { sequence: 2, dynamics: 0.6, isCrux: false, type: "dynamic", description: "Traverse right" },
            { sequence: 3, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Hard traverse" },
            { sequence: 4, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Keep going" },
            { sequence: 5, dynamics: 0.6, isCrux: false, type: "dynamic", description: "Almost there" },
            { sequence: 6, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Exit roof" },
            { sequence: 7, dynamics: 0.3, isCrux: false, type: "static", description: "Top out" }
        ]
    },

    {
        id: 14,
        name: "Mantle Madness",
        grade: "V4",
        description: "All about the mantle finish",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Start" },
            { sequence: 2, dynamics: 0.5, isCrux: false, type: "dynamic", description: "Get established" },
            { sequence: 3, dynamics: 0.6, isCrux: false, type: "dynamic", description: "Set up mantle" },
            { sequence: 4, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Mantle crux" },
            { sequence: 5, dynamics: 0.7, isCrux: true, type: "static", description: "Press out" },
            { sequence: 6, dynamics: 0.3, isCrux: false, type: "static", description: "Stand up" }
        ]
    },

    {
        id: 15,
        name: "Compression Corner",
        grade: "V7",
        description: "Squeeze and compress your way up",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Start compression" },
            { sequence: 2, dynamics: 0.6, isCrux: true, type: "static", description: "Squeeze harder" },
            { sequence: 3, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Compress and move" },
            { sequence: 4, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Maximum squeeze" },
            { sequence: 5, dynamics: 0.5, isCrux: false, type: "static", description: "Release" },
            { sequence: 6, dynamics: 0.3, isCrux: false, type: "static", description: "Easy top" }
        ]
    },

    {
        id: 16,
        name: "Pocket Rocket",
        grade: "V6",
        description: "Finger pockets and precise movement",
        moves: [
            { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Start pockets" },
            { sequence: 2, dynamics: 0.5, isCrux: true, type: "static", description: "Two finger pocket" },
            { sequence: 3, dynamics: 0.6, isCrux: true, type: "static", description: "One finger pocket" },
            { sequence: 4, dynamics: 0.4, isCrux: false, type: "static", description: "Better pocket" },
            { sequence: 5, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Pocket to crimp" },
            { sequence: 6, dynamics: 0.2, isCrux: false, type: "static", description: "Finish" }
        ]
    },

    {
        id: 17,
        name: "Arete Dance",
        grade: "V5",
        description: "Balancing on the edge",
        moves: [
            { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Start on arete" },
            { sequence: 2, dynamics: 0.5, isCrux: false, type: "static", description: "Balance move" },
            { sequence: 3, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Arete crux" },
            { sequence: 4, dynamics: 0.6, isCrux: true, type: "dynamic", description: "Stay on edge" },
            { sequence: 5, dynamics: 0.4, isCrux: false, type: "static", description: "Stabilize" },
            { sequence: 6, dynamics: 0.2, isCrux: false, type: "static", description: "Top out" }
        ]
    },

    {
        id: 18,
        name: "Power Endurance",
        grade: "V8",
        description: "Sustained hard climbing",
        moves: [
            { sequence: 1, dynamics: 0.6, isCrux: false, type: "dynamic", description: "Hard start" },
            { sequence: 2, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Keep it hard" },
            { sequence: 3, dynamics: 0.8, isCrux: true, type: "dynamic", description: "No rest" },
            { sequence: 4, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Still hard" },
            { sequence: 5, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Pump city" },
            { sequence: 6, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Final crux" },
            { sequence: 7, dynamics: 0.4, isCrux: false, type: "static", description: "Finally easy" }
        ]
    },

    {
        id: 19,
        name: "Technical Wizard",
        grade: "V9",
        description: "Complex technical movement",
        moves: [
            { sequence: 1, dynamics: 0.4, isCrux: false, type: "static", description: "Technical start" },
            { sequence: 2, dynamics: 0.6, isCrux: true, type: "static", description: "Precise move" },
            { sequence: 3, dynamics: 0.8, isCrux: true, type: "dynamic", description: "Complex sequence" },
            { sequence: 4, dynamics: 0.9, isCrux: true, type: "dynamic", description: "Mind-bending" },
            { sequence: 5, dynamics: 0.7, isCrux: true, type: "dynamic", description: "Still technical" },
            { sequence: 6, dynamics: 0.5, isCrux: false, type: "static", description: "Easier" },
            { sequence: 7, dynamics: 0.3, isCrux: false, type: "static", description: "Top out" }
        ]
    },

    {
        id: 20,
        name: "Classic Line",
        grade: "V2",
        description: "Perfect movement on perfect holds",
        moves: [
            { sequence: 1, dynamics: 0.3, isCrux: false, type: "static", description: "Perfect start" },
            { sequence: 2, dynamics: 0.4, isCrux: false, type: "static", description: "Nice hold" },
            { sequence: 3, dynamics: 0.5, isCrux: true, type: "dynamic", description: "Fun move" },
            { sequence: 4, dynamics: 0.4, isCrux: false, type: "static", description: "Good hold" },
            { sequence: 5, dynamics: 0.3, isCrux: false, type: "static", description: "Perfect finish" }
        ]
    }
];

// Function to get a boulder by ID
export function getBoulderById(id) {
    // Handle both numeric IDs (for mock boulders) and string IDs (for CSV files)
    const allBoulders = getBoulderList();
    return allBoulders.find(boulder => boulder.id === id || boulder.id === parseInt(id));
}

// Function to get all boulder names for selection
export function getBoulderList() {
    // Add CSV file options to the boulder list
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
        }
    ];
    
    return [...mockBoulders.map(boulder => ({
        id: boulder.id,
        name: boulder.name,
        grade: boulder.grade,
        description: boulder.description,
        moves: boulder.moves
    })), ...csvOptions];
}

// Function to generate random boulder (picks one of the 20 curated boulders randomly)
export function generateRandomBoulder() {
    const randomIndex = Math.floor(Math.random() * mockBoulders.length);
    return mockBoulders[randomIndex];
} 