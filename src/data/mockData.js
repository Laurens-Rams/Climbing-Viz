// Mock climbing data generator
// Structure: { week: number, grades: { V1: count, V2: count, ..., V12: count } }

export function generateMockData() {
    const data = [];
    
    for (let week = 1; week <= 52; week++) {
        const weekData = {
            week: week,
            grades: {}
        };
        
        // Initialize all grades
        for (let grade = 1; grade <= 12; grade++) {
            weekData.grades[`V${grade}`] = 0;
        }
        
        // Clear, structured progression - each week builds on the last
        const generateStructuredWeek = (week) => {
            // Base climbing volume (consistent 10-15 climbs per week)
            const baseVolume = 12;
            
            // Define current max grade based on week (very predictable)
            let maxGrade = 1;
            if (week >= 5) maxGrade = 2;   // Week 5: unlock V2
            if (week >= 9) maxGrade = 3;   // Week 9: unlock V3
            if (week >= 13) maxGrade = 4;  // Week 13: unlock V4
            if (week >= 17) maxGrade = 5;  // Week 17: unlock V5
            if (week >= 21) maxGrade = 6;  // Week 21: unlock V6
            if (week >= 25) maxGrade = 7;  // Week 25: unlock V7
            if (week >= 29) maxGrade = 8;  // Week 29: unlock V8
            
            // Each week, add one more climb to the current max grade
            const weeksAtThisLevel = week - getUnlockWeek(maxGrade) + 1;
            const maxGradeClimbs = Math.min(weeksAtThisLevel, 8); // Cap at 8 climbs
            
            weekData.grades[`V${maxGrade}`] = maxGradeClimbs;
            
            // Distribute remaining climbs across lower grades
            let remainingClimbs = baseVolume - maxGradeClimbs;
            
            // Always do some V1s (warmup/volume)
            if (maxGrade >= 1) {
                const v1Climbs = Math.max(2, Math.floor(remainingClimbs * 0.3));
                weekData.grades['V1'] = v1Climbs;
                remainingClimbs -= v1Climbs;
            }
            
            // Distribute rest across intermediate grades
            for (let grade = 2; grade < maxGrade && remainingClimbs > 0; grade++) {
                const gradeClimbs = Math.max(1, Math.floor(remainingClimbs / (maxGrade - grade)));
                weekData.grades[`V${grade}`] = gradeClimbs;
                remainingClimbs -= gradeClimbs;
            }
            
            // Add any leftover climbs to the grade below max
            if (remainingClimbs > 0 && maxGrade > 1) {
                weekData.grades[`V${maxGrade - 1}`] += remainingClimbs;
            }
        };
        
        // Helper function to get unlock week for a grade
        const getUnlockWeek = (grade) => {
            switch(grade) {
                case 1: return 1;
                case 2: return 5;
                case 3: return 9;
                case 4: return 13;
                case 5: return 17;
                case 6: return 21;
                case 7: return 25;
                case 8: return 29;
                default: return 1;
            }
        };
        
        generateStructuredWeek(week);
        
        // Add special breakthrough weeks (first week of new grade gets extra attempts)
        const unlockWeeks = [5, 9, 13, 17, 21, 25, 29]; // V2, V3, V4, V5, V6, V7, V8
        if (unlockWeeks.includes(week)) {
            const newGrade = Math.ceil((week - 1) / 4) + 1; // Calculate which grade was unlocked
            if (newGrade <= 8) {
                weekData.grades[`V${newGrade}`] += 3; // Extra 3 attempts on breakthrough week
            }
        }
        
        // Add project weeks every 4th week (focus on current max)
        if (week % 4 === 0 && week >= 8) {
            const currentMax = Math.min(8, Math.ceil(week / 4));
            weekData.grades[`V${currentMax}`] += 2; // Extra 2 project attempts
        }
        
        data.push(weekData);
    }
    
    return data;
}

// Calculate statistics for a week's data
export function calculateWeekStats(weekData) {
    let totalClimbs = 0;
    let gradeSum = 0;
    let maxGrade = 0;
    
    for (let grade = 1; grade <= 12; grade++) {
        const count = weekData.grades[`V${grade}`] || 0;
        totalClimbs += count;
        gradeSum += grade * count;
        if (count > 0) maxGrade = grade;
    }
    
    const avgGrade = totalClimbs > 0 ? gradeSum / totalClimbs : 0;
    
    return {
        totalClimbs,
        avgGrade: Math.round(avgGrade * 10) / 10,
        maxGrade,
        week: weekData.week
    };
}

// Calculate radius for a week based on climbing data
export function calculateRadius(weekData, settings = {}) {
    const stats = calculateWeekStats(weekData);
    const {
        baseRadius = 2,
        volumeWeight = 0.7,
        gradeWeight = 0.3,
        maxRadius = 8,
        minRadius = 1
    } = settings;
    
    // Normalize volume (assuming max 25 climbs per week)
    const normalizedVolume = Math.min(stats.totalClimbs / 25, 1);
    
    // Normalize average grade (V1-V12 -> 0-1)
    const normalizedGrade = stats.avgGrade / 12;
    
    // Combine factors
    const radiusFactor = (normalizedVolume * volumeWeight) + (normalizedGrade * gradeWeight);
    
    // Calculate final radius
    const radius = baseRadius + (radiusFactor * (maxRadius - baseRadius));
    
    return Math.max(minRadius, Math.min(maxRadius, radius));
} 