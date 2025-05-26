// Mock boulder data - 3 completely different problems
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
    }
];

// Function to get a boulder by ID
export function getBoulderById(id) {
    return mockBoulders.find(boulder => boulder.id === id);
}

// Function to get all boulder names for selection
export function getBoulderList() {
    return mockBoulders.map(boulder => ({
        id: boulder.id,
        name: boulder.name,
        grade: boulder.grade,
        description: boulder.description
    }));
}

// Function to generate random boulder (for testing)
export function generateRandomBoulder() {
    const grades = ['V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
    const moveTypes = ['static', 'dynamic'];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const moveCount = Math.floor(Math.random() * 10) + 3; // 3-12 moves
    
    const moves = [];
    const cruxPosition = Math.floor(Math.random() * (moveCount - 2)) + 1; // Not first or last move
    
    for (let i = 0; i < moveCount; i++) {
        const isCrux = i === cruxPosition || (Math.random() < 0.1 && moveCount > 6); // 10% chance of additional crux
        const dynamics = isCrux ? 
            Math.random() * 0.4 + 0.6 : // Crux moves: 0.6-1.0
            Math.random() * 0.6 + 0.2;  // Normal moves: 0.2-0.8
        
        moves.push({
            sequence: i + 1,
            dynamics: Math.round(dynamics * 10) / 10, // Round to 1 decimal
            isCrux: isCrux,
            type: dynamics > 0.6 ? 'dynamic' : 'static',
            description: `Move ${i + 1}`
        });
    }
    
    return {
        id: Date.now(),
        name: `Random Boulder ${grade}`,
        grade: grade,
        description: `Randomly generated ${grade} problem`,
        moves: moves
    };
} 