import * as dat from 'dat.gui';
import { getBoulderList, getBoulderById } from '../data/boulderData.js';

export class BoulderControlPanel {
    constructor(visualizer, dataVizIntegration = null) {
        this.visualizer = visualizer;
        this.dataVizIntegration = dataVizIntegration;
        this.onBoulderChange = null; // Callback for when boulder changes
        this.gui = null;
        this.currentBoulderId = 'csv_raw'; // Default to first CSV file
        this.updateTimeout = null; // For debouncing updates
        
        // Add global test function for debugging
        window.testCSVParsing = () => this.testCSVParsing();
        
        // Initialize GUI
        this.gui = new dat.GUI();
        
        this.setupControls();
        this.styleGUI();
    }
    
    setupControls() {
        // Boulder Selection - CSV Files Only
        const boulderFolder = this.gui.addFolder('📊 CSV Data Selection');
        
        const boulderList = getBoulderList();
        console.log('=== CSV CONTROL PANEL DEBUG ===');
        console.log('Available CSV files:', boulderList);
        console.log('Timestamp:', new Date().toISOString());
        
        const boulderNames = {};
        boulderList.forEach(boulder => {
            const displayName = `${boulder.name} - ${boulder.description}`;
            boulderNames[displayName] = boulder.id;
            
            console.log('CSV File found:', {
                id: boulder.id,
                name: boulder.name,
                type: boulder.type,
                filename: boulder.filename,
                displayName: displayName
            });
        });
        console.log('CSV files for dropdown:', boulderNames);
        console.log('=== END CSV CONTROL PANEL DEBUG ===');
        
        // Create a persistent object for the dropdown
        this.boulderSelection = { boulder: this.currentBoulderId };
        
        boulderFolder.add(this.boulderSelection, 'boulder', boulderNames)
            .name('Select CSV File')
            .onChange((boulderId) => {
                console.log('CSV file selection changed to:', boulderId);
                this.currentBoulderId = boulderId;
                this.loadBoulder(boulderId);
            });
            
        const boulderControls = {
            reloadCurrent: () => this.loadBoulder(this.currentBoulderId)
        };
        
        boulderFolder.add(boulderControls, 'reloadCurrent').name('🔄 Reload CSV Data');
        
        boulderFolder.open();
        
        // Visual Settings
        const visualFolder = this.gui.addFolder('⚙️ Visual Settings');
        
        visualFolder.add(this.visualizer.settings, 'ringCount', 10, 70, 1)
            .name('Ring Count')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'baseRadius', 1.0, 4.0, 0.1)
            .name('Base Radius')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'ringSpacing', 0.00, 0.15, 0.005)
            .name('Ring Spacing')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'dynamicsMultiplier', 0.5, 8.0, 0.1)
            .name('Dynamics Effect')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'opacity', 0.1, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => this.updateVisualization());
            
        visualFolder.add(this.visualizer.settings, 'radiusMultiplier', 0.5, 3.0, 0.1)
            .name('Overall Size')
            .onChange(() => this.updateVisualization());
            
        visualFolder.open();
        
        // Dynamic Effects Settings
        const effectsFolder = this.gui.addFolder('🌊 Dynamic Effects');
        
        effectsFolder.add(this.visualizer.settings, 'timelineSubdivision', 0, 100, 1)
            .name('Timeline Smoothness (%)')
            .onChange(() => this.updateVisualization());
        
        effectsFolder.add(this.visualizer.settings, 'organicNoise', 0.0, 1.0, 0.05)
            .name('Organic Noise')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'cruxEmphasis', 0.5, 3.0, 0.1)
            .name('Crux Emphasis')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'moveEmphasis', 0.0, 10.0, 0.1)
            .name('Move Emphasis (All)')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'waveComplexity', 0.5, 4.0, 0.1)
            .name('Wave Complexity')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'depthEffect', 0.0, 2.0, 0.1)
            .name('3D Depth Effect')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.add(this.visualizer.settings, 'centerFade', 0.0, 1.0, 0.05)
            .name('Center Fade (Slab)')
            .onChange(() => this.updateVisualization());
            
        effectsFolder.open();
        
        // Move Segments Settings
        const segmentsFolder = this.gui.addFolder('🍕 Move Segments');
        
        segmentsFolder.add(this.visualizer.settings, 'showMoveSegments')
            .name('Show Move Segments')
            .onChange(() => this.updateVisualization());
            
        segmentsFolder.add(this.visualizer.settings, 'segmentOpacity', 0.0, 0.5, 0.01)
            .name('Segment Opacity')
            .onChange(() => this.updateVisualization());
            
        segmentsFolder.add(this.visualizer.settings, 'segmentGap', 0.0, 0.2, 0.01)
            .name('Gap Between Segments')
            .onChange(() => this.updateVisualization());
            
        segmentsFolder.open();
        
        // Move Lines Settings
        const linesFolder = this.gui.addFolder('📍 Move Lines');
        
        linesFolder.add(this.visualizer.settings, 'showMoveLines')
            .name('Show Move Lines')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'lineLength', 1.0, 6.0, 0.1)
            .name('Line Length')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'lineOpacity', 0.0, 1.0, 0.05)
            .name('Line Opacity')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'dotSize', 0.02, 0.2, 0.01)
            .name('Dot Size')
            .onChange(() => this.updateVisualization());
            
        linesFolder.add(this.visualizer.settings, 'dotOpacity', 0.0, 1.0, 0.05)
            .name('Dot Opacity')
            .onChange(() => this.updateVisualization());
            
        linesFolder.open();
        
        // Attempt Visualization Settings
        const attemptsFolder = this.gui.addFolder('🎯 Attempt Visualization');
        
        attemptsFolder.add(this.visualizer.settings, 'showAttempts')
            .name('Show Attempts')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'maxAttempts', 10, 200, 5)
            .name('Number of Attempts')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptOpacity', 0.0, 1.0, 0.05)
            .name('Attempt Opacity')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptWaviness', 0.001, 0.2, 0.001)
            .name('Line Waviness')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptFadeStrength', 0.0, 2.0, 0.1)
            .name('Multiple Try Effect')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptThickness', 0.1, 5.0, 0.1)
            .name('Line Thickness')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptIntensity', 0.5, 3.0, 0.1)
            .name('Visual Intensity')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.add(this.visualizer.settings, 'attemptRadius', 0.5, 2.0, 0.1)
            .name('Max Radius')
            .onChange(() => this.updateVisualization());
            
        attemptsFolder.open();
        
        // Camera Controls
        const cameraFolder = this.gui.addFolder('📷 Camera');
        
        const cameraControls = {
            resetView: () => this.resetCamera(),
            topView: () => this.setTopView(),
            sideView: () => this.setSideView()
        };
        
        cameraFolder.add(cameraControls, 'resetView').name('🔄 Reset View');
        cameraFolder.add(cameraControls, 'topView').name('⬆️ Top View');
        cameraFolder.add(cameraControls, 'sideView').name('➡️ Side View');
        
        cameraFolder.open();
        
        // Info Display
        const infoFolder = this.gui.addFolder('ℹ️ Boulder Info');
        
        this.boulderInfo = {
            name: '',
            grade: '',
            moveCount: 0,
            cruxMoves: 0,
            avgDynamics: 0
        };
        
        infoFolder.add(this.boulderInfo, 'name').name('Name').listen();
        infoFolder.add(this.boulderInfo, 'grade').name('Grade').listen();
        infoFolder.add(this.boulderInfo, 'moveCount').name('Move Count').listen();
        infoFolder.add(this.boulderInfo, 'cruxMoves').name('Crux Moves').listen();
        infoFolder.add(this.boulderInfo, 'avgDynamics').name('Avg Dynamics').listen();
        
        infoFolder.open();
        
        // Load initial boulder
        this.loadBoulder(this.currentBoulderId);
        
        // Setup keyboard controls
        this.setupKeyboardControls();
    }
    
    loadBoulder(boulderId) {
        console.log('Loading boulder with ID:', boulderId, 'Type:', typeof boulderId);
        
        // Convert to proper type if needed
        let boulder;
        if (typeof boulderId === 'string' && boulderId.startsWith('csv_')) {
            boulder = getBoulderById(boulderId);
        } else {
            const numericId = typeof boulderId === 'string' ? parseInt(boulderId) : boulderId;
            boulder = getBoulderById(numericId);
        }
        
        if (!boulder) {
            console.error('Boulder not found with ID:', boulderId);
            return;
        }
        
        console.log('Found boulder:', boulder);
        
        // Update current boulder ID and sync dropdown
        this.currentBoulderId = boulderId;
        this.boulderSelection.boulder = boulderId;
        
        // Handle CSV files
        if (boulder.type === 'csv' && this.dataVizIntegration) {
            console.log('Loading CSV file:', boulder.filename);
            this.loadCSVFile(boulder);
        } else {
            // Regular boulder data
            this.visualizer.loadBoulder(boulder);
            this.updateBoulderInfo(boulder);
        }
        
        // Notify main app of boulder change
        if (this.onBoulderChange) {
            this.onBoulderChange(boulder);
        }
    }
    
    async loadCSVFile(boulder) {
        try {
            console.log('Attempting to load CSV file:', boulder.filename);
            
            // Load CSV file from public data directory (accessible by browser)
            const response = await fetch(`data/${boulder.filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load CSV file: ${boulder.filename} (${response.status})`);
            }
            
            const csvText = await response.text();
            console.log('CSV file loaded, length:', csvText.length);
            
            // Parse CSV and generate move data using DataViz logic
            const csvData = this.parseCSVForBoulder(csvText, boulder);
            
            console.log('CSV parsing complete. Generated moves:', csvData.moves);
            
            // Update boulder with CSV-derived moves BEFORE loading into visualizer
            boulder.moves = csvData.moves;
            
            // Ensure we have valid moves
            if (!boulder.moves || boulder.moves.length === 0) {
                console.warn('No moves generated from CSV, creating default moves');
                boulder.moves = [
                    { sequence: 1, dynamics: 0.5, isCrux: false, type: 'static', description: 'Default move - CSV parsing failed' }
                ];
            }
            
            console.log('Boulder with moves ready for visualizer:', boulder);
            
            // Load the updated boulder into visualizer
            this.visualizer.loadBoulder(boulder);
            console.log('Boulder loaded into visualizer');
            
            this.updateBoulderInfo(boulder);
            console.log('Boulder info updated');
            
            console.log('Successfully loaded CSV boulder with', boulder.moves.length, 'moves');
            
            // Notify main app of boulder change
            if (this.onBoulderChange) {
                this.onBoulderChange(boulder);
            }
            
        } catch (error) {
            console.error('Error loading CSV file:', error);
            alert(`Error loading CSV file: ${error.message}`);
            
            // Fallback to a default boulder
            const fallbackBoulder = getBoulderById(1);
            if (fallbackBoulder) {
                this.visualizer.loadBoulder(fallbackBoulder);
                this.updateBoulderInfo(fallbackBoulder);
            }
        }
    }
    
    parseCSVForBoulder(csvText, boulder) {
        console.log('=== CSV PARSING DEBUG ===');
        console.log('Boulder filename:', boulder.filename);
        console.log('CSV text length:', csvText.length);
        
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        console.log('CSV Headers:', headers);
        console.log('Number of lines:', lines.length);
        
        const time = [];
        const acceleration = [];
        
        // Parse CSV data - handle scientific notation
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            
            if (values.length < 2) continue;
            
            // Parse time (first column) - handle scientific notation
            const t = parseFloat(values[0]);
            if (isNaN(t)) continue;
            
            let magnitude = 0;
            
            // Check if we have absolute acceleration column (Phyphox format)
            if (headers.includes('Absolute acceleration (m/s^2)') || headers.includes('"Absolute acceleration (m/s^2)"')) {
                // Use the absolute acceleration directly
                const absIndex = headers.findIndex(h => h.includes('Absolute acceleration'));
                if (absIndex >= 0 && values[absIndex]) {
                    magnitude = parseFloat(values[absIndex]);
                }
            } else if (headers.includes('left_wrist_x')) {
                // Multi-sensor format from sample data
                const ax = parseFloat(values[1]) || 0;
                const ay = parseFloat(values[2]) || 0;
                const az = parseFloat(values[3]) || 0;
                magnitude = Math.sqrt(ax*ax + ay*ay + az*az);
            } else if (headers.length >= 4) {
                // Calculate magnitude from x, y, z components
                const ax = parseFloat(values[1]) || 0;
                const ay = parseFloat(values[2]) || 0;
                const az = parseFloat(values[3]) || 0;
                magnitude = Math.sqrt(ax*ax + ay*ay + az*az);
            } else {
                // Simple format - assume second column is acceleration
                magnitude = parseFloat(values[1]) || 0;
            }
            
            if (!isNaN(magnitude) && magnitude > 0) {
                time.push(t);
                acceleration.push(magnitude);
            }
        }
        
        console.log(`Parsed ${acceleration.length} data points from CSV`);
        if (acceleration.length > 0) {
            console.log('Time range:', Math.min(...time), 'to', Math.max(...time));
            console.log('Acceleration range:', Math.min(...acceleration), 'to', Math.max(...acceleration));
            console.log('First 10 acceleration values:', acceleration.slice(0, 10));
        } else {
            console.error('NO ACCELERATION DATA PARSED!');
            console.log('Sample line values:', lines[1]?.split(','));
            console.log('Headers again:', headers);
        }
        
        // Detect moves from acceleration peaks with improved algorithm
        const moves = this.detectMovesFromAccelerationImproved(acceleration, time);
        
        console.log('=== END CSV PARSING DEBUG ===');
        
        return { moves, time, acceleration };
    }
    
    detectMovesFromAccelerationImproved(acceleration, time) {
        console.log('Starting move detection with', acceleration.length, 'data points');
        
        if (acceleration.length === 0) {
            console.log('No acceleration data - creating default move');
            return [this.createDefaultMove()];
        }
        
        const moves = [];
        
        // Calculate dynamic target number of moves based on data duration and complexity
        const totalDuration = time[time.length - 1] - time[0];
        const dataPoints = acceleration.length;
        
        // Determine target number of moves based on duration and data complexity
        let targetMoves;
        if (totalDuration < 15) {
            // Short route: 3-8 moves
            targetMoves = Math.max(3, Math.min(8, Math.floor(totalDuration / 2)));
        } else if (totalDuration < 30) {
            // Medium route: 8-15 moves
            targetMoves = Math.max(8, Math.min(15, Math.floor(totalDuration / 2)));
        } else if (totalDuration < 60) {
            // Long route: 15-25 moves
            targetMoves = Math.max(15, Math.min(25, Math.floor(totalDuration / 2.5)));
        } else {
            // Very long route: 25-35 moves
            targetMoves = Math.max(25, Math.min(35, Math.floor(totalDuration / 3)));
        }
        
        // Also consider data density
        const dataDensity = dataPoints / totalDuration;
        if (dataDensity > 100) {
            targetMoves = Math.min(targetMoves * 1.2, 35);
        } else if (dataDensity < 20) {
            targetMoves = Math.max(targetMoves * 0.8, 3);
        }
        
        targetMoves = Math.floor(targetMoves);
        
        console.log(`Target moves: ${targetMoves} (duration: ${totalDuration.toFixed(1)}s, density: ${dataDensity.toFixed(1)} pts/s)`);
        
        // Smooth the data to reduce noise
        const smoothedAccel = this.smoothData(acceleration, 3);
        console.log('Smoothed data, length:', smoothedAccel.length);
        
        // Calculate statistics
        const maxAccel = Math.max(...smoothedAccel);
        const minAccel = Math.min(...smoothedAccel);
        const avgAccel = smoothedAccel.reduce((a, b) => a + b, 0) / smoothedAccel.length;
        const variance = smoothedAccel.reduce((sum, val) => sum + Math.pow(val - avgAccel, 2), 0) / smoothedAccel.length;
        const stdDev = Math.sqrt(variance);
        
        // Adaptive thresholds based on target move count
        const baseThreshold = avgAccel + stdDev * 0.3;
        const minMoveDistance = Math.max(3, Math.floor(smoothedAccel.length / (targetMoves * 1.5)));
        
        console.log('Acceleration stats:', {
            maxAccel, minAccel, avgAccel, stdDev, 
            baseThreshold, minMoveDistance, targetMoves
        });
        
        // Try multiple threshold strategies to get close to target
        const thresholds = [
            avgAccel + stdDev * 0.4,
            avgAccel + stdDev * 0.3,
            avgAccel + stdDev * 0.2,
            avgAccel + stdDev * 0.15,
            avgAccel + stdDev * 0.1,
            avgAccel + stdDev * 0.05
        ];
        
        let bestPeaks = [];
        let bestScore = Infinity;
        
        for (const threshold of thresholds) {
            const peaks = this.findPeaks(smoothedAccel, threshold, minMoveDistance);
            const score = Math.abs(peaks.length - targetMoves);
            
            console.log(`Threshold ${threshold.toFixed(2)}: found ${peaks.length} peaks (score: ${score})`);
            
            if (score < bestScore) {
                bestPeaks = peaks;
                bestScore = score;
            }
            
            // If we're close to target, use this
            if (peaks.length >= targetMoves * 0.7 && peaks.length <= targetMoves * 1.3) {
                bestPeaks = peaks;
                break;
            }
        }
        
        // If still not enough peaks, try different approach
        if (bestPeaks.length < targetMoves * 0.5) {
            console.log('Using alternative peak detection method');
            const altPeaks = this.findPeaksAlternative(smoothedAccel, time);
            if (altPeaks.length > bestPeaks.length) {
                bestPeaks = altPeaks;
            }
        }
        
        // If still not enough, create artificial peaks
        if (bestPeaks.length < targetMoves * 0.6) {
            console.log('Creating artificial peaks to reach target count');
            bestPeaks = this.createArtificialPeaks(smoothedAccel, time, bestPeaks, targetMoves);
        }
        
        // If we have too many, select the best ones
        if (bestPeaks.length > targetMoves * 1.4) {
            console.log(`Limiting ${bestPeaks.length} peaks to ${Math.floor(targetMoves * 1.2)} moves`);
            bestPeaks = this.selectBestPeaks(bestPeaks, smoothedAccel, Math.floor(targetMoves * 1.2));
        }
        
        console.log(`Final peak count: ${bestPeaks.length} (target was ${targetMoves})`);
        
        // Convert peaks to moves
        for (let i = 0; i < bestPeaks.length; i++) {
            const peakIndex = bestPeaks[i];
            const peakValue = smoothedAccel[peakIndex];
            
            // Normalize dynamics (0.1 to 1.0)
            const normalizedDynamics = Math.max(0.1, Math.min(1.0, 
                0.3 + (peakValue - avgAccel) / (maxAccel - avgAccel) * 0.7
            ));
            
            // Determine if this is a crux move (top 20% of peaks)
            const sortedPeaks = bestPeaks.map(idx => smoothedAccel[idx]).sort((a, b) => b - a);
            const cruxThreshold = sortedPeaks[Math.floor(sortedPeaks.length * 0.2)] || 0;
            const isCrux = peakValue >= cruxThreshold && peakValue > avgAccel + stdDev;
            
            // Classify move type based on peak characteristics
            const moveType = this.classifyMoveType(smoothedAccel, peakIndex, peakValue, avgAccel);
            
            moves.push({
                sequence: i + 1,
                dynamics: normalizedDynamics,
                isCrux: isCrux,
                type: moveType,
                description: `${moveType} move ${i + 1}${isCrux ? ' (crux)' : ''}`
            });
        }
        
        console.log(`Generated ${moves.length} moves:`, moves.map(m => `${m.sequence}: ${m.dynamics.toFixed(2)} ${m.isCrux ? '(CRUX)' : ''}`));
        return moves;
    }
    
    findPeaksAlternative(acceleration, time) {
        // Alternative method: find local maxima with adaptive window
        const peaks = [];
        const windowSize = Math.max(3, Math.floor(acceleration.length / 30));
        
        for (let i = windowSize; i < acceleration.length - windowSize; i++) {
            let isLocalMax = true;
            const currentValue = acceleration[i];
            
            // Check if this is a local maximum
            for (let j = i - windowSize; j <= i + windowSize; j++) {
                if (j !== i && acceleration[j] >= currentValue) {
                    isLocalMax = false;
                    break;
                }
            }
            
            if (isLocalMax) {
                // Check if it's significant enough
                const localAvg = acceleration.slice(Math.max(0, i - windowSize * 2), 
                                                 Math.min(acceleration.length, i + windowSize * 2))
                                               .reduce((a, b) => a + b, 0) / (windowSize * 4);
                
                if (currentValue > localAvg * 1.1) { // 10% above local average
                    peaks.push(i);
                }
            }
        }
        
        // Remove peaks that are too close together
        const filteredPeaks = [];
        const minDistance = Math.max(5, Math.floor(acceleration.length / 25));
        
        for (const peak of peaks) {
            if (filteredPeaks.length === 0 || 
                Math.min(...filteredPeaks.map(p => Math.abs(p - peak))) >= minDistance) {
                filteredPeaks.push(peak);
            }
        }
        
        return filteredPeaks;
    }
    
    createArtificialPeaks(acceleration, time, existingPeaks, targetMoves = null) {
        const targetCount = targetMoves || Math.max(3, Math.min(6, Math.floor(acceleration.length / 80) + 3));
        const needed = targetCount - existingPeaks.length;
        
        if (needed <= 0) return existingPeaks;
        
        console.log(`Creating ${needed} artificial peaks to reach target of ${targetCount}`);
        
        // Find good spots for artificial peaks
        const avgAccel = acceleration.reduce((a, b) => a + b, 0) / acceleration.length;
        const candidates = [];
        
        // Look for points above average that aren't too close to existing peaks
        const minDistanceToExisting = Math.max(10, Math.floor(acceleration.length / (targetCount * 2)));
        
        for (let i = 10; i < acceleration.length - 10; i++) {
            if (acceleration[i] > avgAccel * 1.02) { // Lower threshold for more candidates
                const distanceToExisting = existingPeaks.length > 0 ? 
                    Math.min(...existingPeaks.map(p => Math.abs(p - i))) : Infinity;
                
                if (distanceToExisting > minDistanceToExisting) {
                    candidates.push({ index: i, value: acceleration[i] });
                }
            }
        }
        
        // Sort by value and take the best ones
        candidates.sort((a, b) => b.value - a.value);
        const newPeaks = candidates.slice(0, needed).map(c => c.index);
        
        console.log(`Added ${newPeaks.length} artificial peaks from ${candidates.length} candidates`);
        
        return [...existingPeaks, ...newPeaks].sort((a, b) => a - b);
    }
    
    selectBestPeaks(peaks, acceleration, maxCount) {
        // Select the highest peaks, but maintain temporal distribution
        const peakData = peaks.map(index => ({
            index,
            value: acceleration[index]
        }));
        
        // Sort by value (highest first)
        peakData.sort((a, b) => b.value - a.value);
        
        // Take the top peaks but ensure they're spread out
        const selected = [];
        const minDistance = Math.floor(acceleration.length / (maxCount + 1));
        
        for (const peak of peakData) {
            if (selected.length >= maxCount) break;
            
            const tooClose = selected.some(s => Math.abs(s.index - peak.index) < minDistance);
            if (!tooClose) {
                selected.push(peak);
            }
        }
        
        // If we still need more, add the remaining highest ones
        if (selected.length < maxCount) {
            for (const peak of peakData) {
                if (selected.length >= maxCount) break;
                if (!selected.some(s => s.index === peak.index)) {
                    selected.push(peak);
                }
            }
        }
        
        return selected.map(p => p.index).sort((a, b) => a - b);
    }
    
    createDefaultMove() {
        return {
            sequence: 1,
            dynamics: 0.5,
            isCrux: false,
            type: 'static',
            description: 'Default move - no acceleration data'
        };
    }
    
    smoothData(data, windowSize) {
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
                sum += data[j];
                count++;
            }
            
            smoothed.push(sum / count);
        }
        
        return smoothed;
    }
    
    classifyMoveType(smoothedAccel, peakIndex, peakValue, avgAccel) {
        // Analyze the shape around the peak to classify move type
        const windowSize = Math.min(10, Math.floor(smoothedAccel.length / 20));
        const startIdx = Math.max(0, peakIndex - windowSize);
        const endIdx = Math.min(smoothedAccel.length - 1, peakIndex + windowSize);
        
        // Calculate rise and fall rates
        const riseRate = peakIndex > startIdx ? 
            (peakValue - smoothedAccel[startIdx]) / (peakIndex - startIdx) : 0;
        const fallRate = endIdx > peakIndex ? 
            (smoothedAccel[endIdx] - peakValue) / (endIdx - peakIndex) : 0;
        
        // Calculate peak width (how long the acceleration stays high)
        let peakWidth = 1;
        const threshold = peakValue * 0.7;
        
        // Count points above threshold around the peak
        for (let i = peakIndex + 1; i < endIdx && smoothedAccel[i] > threshold; i++) {
            peakWidth++;
        }
        for (let i = peakIndex - 1; i >= startIdx && smoothedAccel[i] > threshold; i--) {
            peakWidth++;
        }
        
        // Calculate intensity relative to average
        const intensity = (peakValue - avgAccel) / avgAccel;
        
        // Classification logic
        if (intensity > 0.5 && riseRate > 0.1 && Math.abs(fallRate) > 0.1) {
            return 'dynamic'; // High intensity, sharp rise and fall = dyno/throw
        } else if (intensity > 0.3 && peakWidth > 8) {
            return 'dynamic'; // High intensity, sustained = lock-off/compression
        } else if (intensity > 0.2 && riseRate > 0.05) {
            return 'dynamic'; // Medium intensity, moderate rise = reach/cross
        } else if (peakWidth > 12) {
            return 'static'; // Long duration = balance/mantle
        } else {
            return 'static'; // Default to static
        }
    }
    
    findPeaks(acceleration, threshold, minDistance) {
        const peaks = [];
        
        // Find local maxima that exceed threshold
        for (let i = 2; i < acceleration.length - 2; i++) {
            // Check if it's a local maximum (5-point check for better accuracy)
            if (acceleration[i] > acceleration[i-1] && 
                acceleration[i] > acceleration[i+1] && 
                acceleration[i] > acceleration[i-2] && 
                acceleration[i] > acceleration[i+2] && 
                acceleration[i] > threshold) {
                peaks.push(i);
            }
        }
        
        // Filter peaks that are too close together
        const filteredPeaks = [];
        for (const peak of peaks) {
            if (filteredPeaks.length === 0 || 
                Math.min(...filteredPeaks.map(p => Math.abs(p - peak))) >= minDistance) {
                filteredPeaks.push(peak);
            }
        }
        
        return filteredPeaks;
    }
    
    updateBoulderInfo(boulder) {
        this.boulderInfo.name = boulder.name;
        this.boulderInfo.grade = boulder.grade;
        this.boulderInfo.moveCount = boulder.moves.length;
        this.boulderInfo.cruxMoves = boulder.moves.filter(move => move.isCrux).length;
        this.boulderInfo.avgDynamics = Math.round(
            boulder.moves.reduce((sum, move) => sum + move.dynamics, 0) / boulder.moves.length * 100
        ) / 100;
    }
    
    setupKeyboardControls() {
        // Add keyboard event listener for arrow keys to navigate CSV files
        document.addEventListener('keydown', (event) => {
            // Arrow key navigation through CSV files
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                event.preventDefault();
                
                const boulderList = getBoulderList();
                const currentIndex = boulderList.findIndex(boulder => boulder.id === this.currentBoulderId);
                
                let newIndex;
                if (event.code === 'ArrowLeft') {
                    // Go to previous CSV file (wrap around to end if at beginning)
                    newIndex = currentIndex <= 0 ? boulderList.length - 1 : currentIndex - 1;
                } else {
                    // Go to next CSV file (wrap around to beginning if at end)
                    newIndex = currentIndex >= boulderList.length - 1 ? 0 : currentIndex + 1;
                }
                
                const newBoulderId = boulderList[newIndex].id;
                this.boulderSelection.boulder = newBoulderId;
                this.loadBoulder(newBoulderId);
                
                // Update the dropdown display
                const boulderController = this.gui.__folders['📊 CSV Data Selection'].__controllers.find(
                    controller => controller.property === 'boulder'
                );
                if (boulderController) {
                    boulderController.updateDisplay();
                }
            }
        });
    }
    
    updateVisualization() {
        // Debounce rapid updates to prevent shaking
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        this.updateTimeout = setTimeout(() => {
            this.visualizer.updateSettings(this.visualizer.settings);
            this.visualizer.updateColors(this.visualizer.colors);
        }, 50); // 50ms debounce
    }
    
    resetCamera() {
        this.visualizer.camera.position.set(0, 0, 15);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    setTopView() {
        this.visualizer.camera.position.set(0, 0, 20);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    setSideView() {
        this.visualizer.camera.position.set(20, 0, 0);
        this.visualizer.camera.lookAt(0, 0, 0);
    }
    
    styleGUI() {
        // Position the GUI
        this.gui.domElement.style.position = 'absolute';
        this.gui.domElement.style.top = '20px';
        this.gui.domElement.style.right = '20px';
        this.gui.domElement.style.zIndex = '1000';
        
        // Custom styling
        const style = document.createElement('style');
        style.textContent = `
            .dg.ac {
                background: rgba(0, 0, 0, 0.9) !important;
                border: 1px solid #333 !important;
                border-radius: 8px !important;
            }
            
            .dg .folder-title {
                background: rgba(0, 255, 204, 0.2) !important;
                border-bottom: 1px solid #333 !important;
                color: #00ffcc !important;
            }
            
            .dg .c {
                border-bottom: 1px solid #222 !important;
            }
            
            .dg .property-name {
                color: #cccccc !important;
            }
            
            .dg .c input[type=text] {
                background: #1a1a1a !important;
                color: #ffffff !important;
                border: 1px solid #333 !important;
            }
            
            .dg .c .slider {
                background: #333 !important;
            }
            
            .dg .c .slider-fg {
                background: #00ffcc !important;
            }
            
            .dg .c select {
                background: #1a1a1a !important;
                color: #ffffff !important;
                border: 1px solid #333 !important;
            }
            
            .dg .button {
                background: #00ffcc !important;
                color: #000000 !important;
                border: none !important;
                border-radius: 4px !important;
                font-weight: bold !important;
            }
            
            .dg .button:hover {
                background: #00cc99 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    destroy() {
        if (this.gui) {
            this.gui.destroy();
        }
    }
    
    async testCSVParsing() {
        console.log('=== TESTING CSV PARSING ===');
        try {
            const response = await fetch('data/Raw Data.csv');
            console.log('Fetch response status:', response.status);
            
            if (!response.ok) {
                console.error('Failed to fetch CSV file');
                return;
            }
            
            const csvText = await response.text();
            console.log('CSV text length:', csvText.length);
            console.log('First 200 characters:', csvText.substring(0, 200));
            
            const boulder = {
                id: 'csv_raw',
                name: 'Test Raw Data',
                grade: 'CSV',
                type: 'csv',
                filename: 'Raw Data.csv',
                moves: []
            };
            
            const result = this.parseCSVForBoulder(csvText, boulder);
            console.log('Parsing result:', result);
            console.log('Generated moves:', result.moves);
            
        } catch (error) {
            console.error('Test failed:', error);
        }
        console.log('=== END TEST ===');
    }
    
    show() {
        if (this.gui && this.gui.domElement) {
            this.gui.domElement.style.display = 'block';
        }
    }
    
    hide() {
        if (this.gui && this.gui.domElement) {
            this.gui.domElement.style.display = 'none';
        }
    }
} 