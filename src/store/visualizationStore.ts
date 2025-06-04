// Global Visualization Store
// This store holds all the data needed for visualization and is updated ONLY from the controller

import type { BoulderData } from '../utils/csvLoader'

export interface VisualizationState {
  // Boulder data
  selectedBoulder: BoulderData | null
  processedMoves: ProcessedMove[] | null
  
  // Settings from controller
  threshold: number
  visualizerSettings: {
    // Basics
    baseRadius: number
    dynamicsMultiplier: number
    combinedSize: number
    ringCount: number
    ringSpacing: number
    
    // Visuals
    opacity: number
    centerFade: number
    depthEffect: number
    organicNoise: number
    moveColor: string
    cruxColor: string
    
    // Dynamic Effects
    cruxEmphasis: number
    
    // Animation
    animationEnabled: boolean
    rotationSpeed: number
    liquidSpeed: number
    liquidSize: number
    
    // Advanced
    curveResolution: number
    liquidEffect: boolean
    
    // Move Detection
    centerTextSize: number
    
    // Move Detection Algorithm Parameters
    moveThreshold: number
    stillThreshold: number
    minStillDuration: number
    minMoveDuration: number
    maxMoveDuration: number
    maxMoveSequence: number
    
    // Line Thickness
    lineWidth: number
    
    // Move Position Lines - NEW SETTINGS
    showMovePositionLines: boolean
    moveLineLength: number
    moveLineOpacity: number
    moveLineWidth: number
    
    // Attempt Visualization (restored from original)
    showAttemptLines: boolean
    maxAttempts: number
    attemptOpacity: number
    attemptWaviness: number
    attemptFadeStrength: number
    attemptThickness: number
    attemptIntensity: number
    attemptRadius: number
    attemptDotZOffsetMax: number
    attemptDotZEffectStrength: number
    
    // Legacy attempt settings (for compatibility)
    attemptCount: number
    attemptZHeight: number
    attemptWaveEffect: number
    maxRadiusScale: number
  }
  
  // State flags
  needsUpdate: boolean
  lastUpdateTime: number
  lastMoveUpdateTime: number | null
}

export interface ProcessedMove {
  index: number
  startTime: number
  endTime: number
  duration: number
  acceleration: number // Peak acceleration (for backwards compatibility)
  accelerationRange: { min: number; max: number; avg: number } // NEW: Full range during move
  dynamics: number
  isCrux: boolean
}

// The global state instance
let visualizationState: VisualizationState = {
  selectedBoulder: null,
  processedMoves: null,
  threshold: 12.0,
  visualizerSettings: {
    // Basics - Updated to match user's current settings
    baseRadius: 0.85,
    dynamicsMultiplier: 4.5,
    combinedSize: 1.4,
    ringCount: 59,
    ringSpacing: 0.007,
    
    // Visuals - Updated to match user's current settings
    opacity: 0.90,
    centerFade: 0.90,
    depthEffect: 1.8,
    organicNoise: 1.69,
    moveColor: '#22d3ee',
    cruxColor: '#f59e0b',
    
    // Dynamic Effects
    cruxEmphasis: 1.6,
    
    // Animation
    animationEnabled: true,
    rotationSpeed: 0.0,
    liquidSpeed: 1.85,
    liquidSize: 3.9,
    
    // Advanced
    curveResolution: 240,
    liquidEffect: true,
    
    // Move Detection
    centerTextSize: 1.0,
    
    // Move Detection Algorithm Parameters
    moveThreshold: 1.5,
    stillThreshold: 3.0,
    minStillDuration: 0.5,
    minMoveDuration: 0.5,
    maxMoveDuration: 1.0,
    maxMoveSequence: 2,
    
    // Line Thickness - Updated to match user's current settings
    lineWidth: 0.6,
    
    // Move Position Lines - NEW SETTINGS
    showMovePositionLines: true,
    moveLineLength: 3.0,
    moveLineOpacity: 0.8,
    moveLineWidth: 2.0,
    
    // Attempt Visualization (restored from original) - Updated to match user's current settings
    showAttemptLines: true,
    maxAttempts: 85.0,
    attemptOpacity: 0.90,
    attemptWaviness: 0.09,
    attemptFadeStrength: 2.8,
    attemptThickness: 0.6,
    attemptIntensity: 0.5,
    attemptRadius: 1.70,
    attemptDotZOffsetMax: 1.15,
    attemptDotZEffectStrength: 0.5,
    
    // Legacy attempt settings (for compatibility)
    attemptCount: 71.0,
    attemptZHeight: 1.5,
    attemptWaveEffect: 0.06,
    maxRadiusScale: 1.20
  },
  needsUpdate: false,
  lastUpdateTime: Date.now(),
  lastMoveUpdateTime: null
}

// Getter for the visualizer to read state
export function getVisualizationState(): VisualizationState {
  return visualizationState
}

// Update functions - ONLY called from controller
export function updateSelectedBoulder(boulder: BoulderData | null, savedThreshold?: number) {
  console.log(`📊 [VisualizationStore] BOULDER UPDATED: ${boulder ? `"${boulder.name}" (${boulder.csvData?.time.length || 0} data points)` : 'null'}`)
  visualizationState.selectedBoulder = boulder
  
  // If a saved threshold is provided, use it
  if (savedThreshold !== undefined) {
    console.log(`📊 [VisualizationStore] Using saved threshold: ${savedThreshold}`)
    visualizationState.threshold = savedThreshold
  }
  
  // When a new boulder is selected, recalculate moves with current threshold
  if (boulder && boulder.csvData) {
    const moves = detectAndProcessMoves(
      boulder.csvData.time,
      boulder.csvData.absoluteAcceleration
    )
    console.log(`📊 [VisualizationStore] AUTO-CALCULATED ${moves.length} moves with threshold ${visualizationState.threshold}`)
    visualizationState.processedMoves = moves
  } else {
    visualizationState.processedMoves = null
  }
  
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = Date.now()
}

export function updateProcessedMoves(moves: ProcessedMove[] | null, source: string = 'unknown') {
  const timestamp = Date.now()
  console.log(`📊 [VisualizationStore] MOVES UPDATED: ${moves ? `${moves.length} moves` : 'null'} (source: ${source}, timestamp: ${timestamp})`)
  
  if (moves && moves.length > 0) {
    console.log(`📊 [VisualizationStore] First move: dynamics=${moves[0].dynamics}, Last move: dynamics=${moves[moves.length-1].dynamics}`)
  }
  visualizationState.processedMoves = moves
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = timestamp
}

export function updateThreshold(threshold: number) {
  console.log(`📊 [VisualizationStore] THRESHOLD UPDATED: ${visualizationState.threshold} → ${threshold}`)
  visualizationState.threshold = threshold
  
  // Automatically recalculate moves when threshold changes
  if (visualizationState.selectedBoulder && visualizationState.selectedBoulder.csvData) {
    const moves = detectAndProcessMoves(
      visualizationState.selectedBoulder.csvData.time,
      visualizationState.selectedBoulder.csvData.absoluteAcceleration
    )
    console.log(`📊 [VisualizationStore] AUTO-RECALCULATED ${moves.length} moves with new threshold ${threshold}`)
    visualizationState.processedMoves = moves
  }
  
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = Date.now()
}

export function updateVisualizerSettings(settings: Partial<VisualizationState['visualizerSettings']>) {
  const oldSettings = visualizationState.visualizerSettings
  visualizationState.visualizerSettings = {
    ...visualizationState.visualizerSettings,
    ...settings
  }
  
  // Check if move detection settings changed
  const moveDetectionKeys = ['moveThreshold', 'minStillDuration', 'minMoveDuration', 'maxMoveDuration', 'maxMoveSequence']
  const moveDetectionChanged = moveDetectionKeys.some(key => 
    settings[key as keyof typeof settings] !== undefined && 
    settings[key as keyof typeof settings] !== oldSettings[key as keyof typeof oldSettings]
  )
  
  // If move detection settings changed and we have a boulder, recalculate moves
  if (moveDetectionChanged && visualizationState.selectedBoulder && visualizationState.selectedBoulder.csvData) {
    console.log(`📊 [VisualizationStore] Move detection settings changed, recalculating moves`)
    const moves = detectAndProcessMoves(
      visualizationState.selectedBoulder.csvData.time,
      visualizationState.selectedBoulder.csvData.absoluteAcceleration
    )
    console.log(`📊 [VisualizationStore] RECALCULATED ${moves.length} moves with new detection settings`)
    visualizationState.processedMoves = moves
  }
  
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = Date.now()
}

export function markAsUpdated() {
  visualizationState.needsUpdate = false
}

// Helper to detect moves from acceleration data
export function detectAndProcessMoves(
  time: number[],
  acceleration: number[]
): ProcessedMove[] {
  console.log(`🧗 [Move Detection] Starting stillness-based detection`)
  
  const moves: ProcessedMove[] = []
  
  // Get configurable constants from visualizer settings
  const settings = visualizationState.visualizerSettings
  const MOVE_THRESHOLD = settings.moveThreshold // Use the configurable threshold for movement
  const STILL_THRESHOLD = MOVE_THRESHOLD / 2.5 // Auto-calculate: still = move/2.5 (logical gap)
  const MIN_STILL_DURATION = settings.minStillDuration // seconds - minimum time to be considered "holding"
  const MIN_MOVE_DURATION = settings.minMoveDuration // seconds - minimum time for a movement to count
  const MAX_MOVE_DURATION = settings.maxMoveDuration // seconds - longer moves get split
  const MAX_MOVE_SEQUENCE = settings.maxMoveSequence // maximum consecutive moves without still period
  
  console.log(`🔧 [Move Detection] Using settings: move=${MOVE_THRESHOLD}, still=${STILL_THRESHOLD.toFixed(1)} (auto), minStill=${MIN_STILL_DURATION}s, minMove=${MIN_MOVE_DURATION}s, maxMove=${MAX_MOVE_DURATION}s, maxSeq=${MAX_MOVE_SEQUENCE}`)
  
  // State tracking
  let currentState: 'still' | 'moving' = 'still'
  let stateStartIdx = 0
  let stateStartTime = time[0] || 0
  let lastStillEndIdx = 0
  let moveSequenceCount = 0 // Track consecutive moves without still period
  
  // Always add a start move at index 0 with dynamics 0
  moves.push({
    index: 0,
    startTime: time[0] || 0,
    endTime: time[0] || 0,
    duration: 0,
    acceleration: acceleration[0] || 0,
    accelerationRange: { min: 0, max: 0, avg: 0 },
    dynamics: 0, // Start move always has dynamics 0
    isCrux: false
  })
  
  let moveIndex = 1 // Start at 1 since index 0 is the start move
  
  // Process each data point
  for (let i = 0; i < acceleration.length; i++) {
    const currentAccel = acceleration[i]
    const currentTime = time[i]
    const timeSinceStateStart = currentTime - stateStartTime
    
    if (currentState === 'still') {
      // Check if we should transition to moving
      if (currentAccel >= MOVE_THRESHOLD) {
        // Only transition if we've been still long enough
        if (timeSinceStateStart >= MIN_STILL_DURATION) {
          console.log(`🏃 [Move Detection] Transition STILL→MOVING at ${currentTime.toFixed(2)}s (was still for ${timeSinceStateStart.toFixed(2)}s)`)
          currentState = 'moving'
          stateStartIdx = i
          stateStartTime = currentTime
          lastStillEndIdx = i - 1
          moveSequenceCount = 0
        }
      }
    } else { // currentState === 'moving'
      // Check if we should transition back to still
      if (currentAccel < STILL_THRESHOLD) {
        // Only count as a move if movement lasted long enough
        if (timeSinceStateStart >= MIN_MOVE_DURATION) {
          // Find peak acceleration during this movement
          const moveAccelerations = acceleration.slice(stateStartIdx, i)
          const maxAccel = Math.max(...moveAccelerations)
          
          // Check if move is too long and needs splitting
          if (timeSinceStateStart > MAX_MOVE_DURATION) {
            console.log(`✂️ [Move Detection] Splitting long move (${timeSinceStateStart.toFixed(2)}s) at ${currentTime.toFixed(2)}s`)
            // Split the move at natural low points
            const splitPoints = findMoveSplitPoints(
              acceleration.slice(stateStartIdx, i),
              time.slice(stateStartIdx, i),
              MAX_MOVE_DURATION
            )
            
            // Create multiple moves from split points
            let lastSplitIdx = 0
            for (const splitPoint of splitPoints) {
              const splitIdx = stateStartIdx + splitPoint.index
              const splitAccelerations = acceleration.slice(
                stateStartIdx + lastSplitIdx,
                splitIdx + 1
              )
              const splitMaxAccel = Math.max(...splitAccelerations)
              
              moves.push({
                index: moveIndex++,
                startTime: time[stateStartIdx + lastSplitIdx],
                endTime: time[splitIdx],
                duration: time[splitIdx] - time[stateStartIdx + lastSplitIdx],
                acceleration: splitMaxAccel,
                accelerationRange: { min: Math.min(...splitAccelerations), max: Math.max(...splitAccelerations), avg: splitAccelerations.reduce((a, b) => a + b, 0) / splitAccelerations.length },
                dynamics: 0, // Will be calculated later
                isCrux: false
              })
              
              lastSplitIdx = splitPoint.index
            }
            
            // Add the final segment
            const finalAccelerations = acceleration.slice(stateStartIdx + lastSplitIdx, i)
            const finalMaxAccel = Math.max(...finalAccelerations)
            moves.push({
              index: moveIndex++,
              startTime: time[stateStartIdx + lastSplitIdx],
              endTime: time[i - 1],
              duration: time[i - 1] - time[stateStartIdx + lastSplitIdx],
              acceleration: finalMaxAccel,
              accelerationRange: { min: Math.min(...finalAccelerations), max: Math.max(...finalAccelerations), avg: finalAccelerations.reduce((a, b) => a + b, 0) / finalAccelerations.length },
              dynamics: 0,
              isCrux: false
            })
          } else {
            // Normal move (not too long)
            console.log(`🧗 [Move Detection] Move detected: ${stateStartTime.toFixed(2)}s → ${currentTime.toFixed(2)}s (${timeSinceStateStart.toFixed(2)}s, max: ${maxAccel.toFixed(1)} m/s²)`)
            
            // Calculate acceleration range for this move
            const moveAccelRange = {
              min: Math.min(...moveAccelerations),
              max: Math.max(...moveAccelerations),
              avg: moveAccelerations.reduce((a, b) => a + b, 0) / moveAccelerations.length
            }
            
            moves.push({
              index: moveIndex++,
              startTime: stateStartTime,
              endTime: currentTime,
              duration: timeSinceStateStart,
              acceleration: maxAccel,
              accelerationRange: moveAccelRange,
              dynamics: 0, // Will be calculated later
              isCrux: false
            })
          }
          
          moveSequenceCount++
        } else {
          console.log(`⚡ [Move Detection] Ignoring spike at ${currentTime.toFixed(2)}s (only ${timeSinceStateStart.toFixed(2)}s)`)
        }
        
        // Transition back to still
        currentState = 'still'
        stateStartIdx = i
        stateStartTime = currentTime
        
        // Check if we've had too many moves in sequence
        if (moveSequenceCount >= MAX_MOVE_SEQUENCE) {
          console.log(`⚠️ [Move Detection] Resetting after ${moveSequenceCount} moves in sequence`)
          moveSequenceCount = 0
        }
      }
    }
  }
  
  // Handle case where we end in a moving state
  if (currentState === 'moving' && time[stateStartIdx] !== time[time.length - 1]) {
    const timeSinceStateStart = time[time.length - 1] - stateStartTime
    if (timeSinceStateStart >= MIN_MOVE_DURATION) {
      const moveAccelerations = acceleration.slice(stateStartIdx)
      const maxAccel = Math.max(...moveAccelerations)
      
      // Calculate acceleration range for final move
      const moveAccelRange = {
        min: Math.min(...moveAccelerations),
        max: Math.max(...moveAccelerations),
        avg: moveAccelerations.reduce((a, b) => a + b, 0) / moveAccelerations.length
      }
      
      console.log(`🏁 [Move Detection] Final move: ${stateStartTime.toFixed(2)}s → end (${timeSinceStateStart.toFixed(2)}s, max: ${maxAccel.toFixed(1)} m/s²)`)
      
      moves.push({
        index: moveIndex++,
        startTime: stateStartTime,
        endTime: time[time.length - 1],
        duration: timeSinceStateStart,
        acceleration: maxAccel,
        accelerationRange: moveAccelRange,
        dynamics: 0,
        isCrux: false
      })
    }
  }
  
  // Calculate dynamics and identify crux moves (skip the start move at index 0)
  if (moves.length > 1) {
    const actualMoves = moves.slice(1) // Exclude start move from calculations
    
    // Safety check: if we only have the start move, no actual moves to process
    if (actualMoves.length === 0) {
      console.log(`📊 [Move Detection] Only start move detected, no dynamics to calculate`)
      console.log(`✅ [Move Detection] Detected ${moves.length} total moves (including start move)`)
      return moves
    }
    
    const accelerations = actualMoves.map(m => m.acceleration)
    const maxAccel = Math.max(...accelerations)
    const minAccel = Math.min(...accelerations)
    const range = maxAccel - minAccel
    
    console.log(`📊 [Move Detection] Dynamics calculation - Min: ${minAccel.toFixed(1)}, Max: ${maxAccel.toFixed(1)}, Range: ${range.toFixed(1)}`)
    
    // Normalize dynamics and identify crux
    const avgAccel = accelerations.reduce((a, b) => a + b, 0) / accelerations.length
    const cruxThreshold = avgAccel * 1.2
    
    actualMoves.forEach((move, idx) => {
      // Normalize dynamics between 0.1 and 1.0
      if (range > 0) {
        move.dynamics = 0.1 + ((move.acceleration - minAccel) / range) * 0.9
      } else {
        move.dynamics = 0.5
      }
      
      // Mark as crux if above threshold
      move.isCrux = move.acceleration >= cruxThreshold
      
      if (move.isCrux) {
        console.log(`🔥 [Move Detection] Move ${idx + 2} is CRUX (${move.acceleration.toFixed(1)} m/s² > ${cruxThreshold.toFixed(1)} m/s²)`)
      }
    })
  }
  
  console.log(`✅ [Move Detection] Detected ${moves.length} total moves (including start move)`)
  return moves
}

// Helper function to find natural split points in a long move
function findMoveSplitPoints(
  accelerations: number[],
  times: number[],
  maxDuration: number
): Array<{ index: number; time: number }> {
  const splitPoints: Array<{ index: number; time: number }> = []
  const totalDuration = times[times.length - 1] - times[0]
  const numSplits = Math.ceil(totalDuration / maxDuration) - 1
  
  if (numSplits <= 0) return splitPoints
  
  // Find local minima as natural split points
  const windowSize = Math.floor(accelerations.length / (numSplits + 1))
  
  for (let split = 1; split <= numSplits; split++) {
    const targetIdx = split * windowSize
    const searchStart = Math.max(0, targetIdx - windowSize / 2)
    const searchEnd = Math.min(accelerations.length - 1, targetIdx + windowSize / 2)
    
    // Find minimum acceleration in this window
    let minIdx = searchStart
    let minAccel = accelerations[searchStart]
    
    for (let i = searchStart + 1; i <= searchEnd; i++) {
      if (accelerations[i] < minAccel) {
        minAccel = accelerations[i]
        minIdx = i
      }
    }
    
    splitPoints.push({
      index: minIdx,
      time: times[minIdx]
    })
  }
  
  return splitPoints
} 