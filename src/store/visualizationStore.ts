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
    
    // Line Thickness
    lineWidth: number
    
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
}

export interface ProcessedMove {
  index: number
  startTime: number
  endTime: number
  duration: number
  acceleration: number
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
    
    // Line Thickness - Updated to match user's current settings
    lineWidth: 0.6,
    
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
  lastUpdateTime: Date.now()
}

// Getter for the visualizer to read state
export function getVisualizationState(): VisualizationState {
  return visualizationState
}

// Update functions - ONLY called from controller
export function updateSelectedBoulder(boulder: BoulderData | null) {
  visualizationState.selectedBoulder = boulder
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = Date.now()
}

export function updateProcessedMoves(moves: ProcessedMove[] | null) {
  visualizationState.processedMoves = moves
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = Date.now()
}

export function updateThreshold(threshold: number) {
  visualizationState.threshold = threshold
  visualizationState.needsUpdate = true
  visualizationState.lastUpdateTime = Date.now()
}

export function updateVisualizerSettings(settings: Partial<VisualizationState['visualizerSettings']>) {
  visualizationState.visualizerSettings = {
    ...visualizationState.visualizerSettings,
    ...settings
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
  acceleration: number[],
  threshold: number
): ProcessedMove[] {
  const moves: ProcessedMove[] = []
  let inMove = false
  let moveStartIdx = 0
  let moveIndex = 0
  
  for (let i = 0; i < acceleration.length; i++) {
    if (!inMove && acceleration[i] >= threshold) {
      inMove = true
      moveStartIdx = i
    } else if (inMove && acceleration[i] < threshold) {
      inMove = false
      const maxAccel = Math.max(...acceleration.slice(moveStartIdx, i))
      moves.push({
        index: moveIndex++,
        startTime: time[moveStartIdx],
        endTime: time[i - 1],
        duration: time[i - 1] - time[moveStartIdx],
        acceleration: maxAccel,
        dynamics: 0, // Will be calculated after all moves detected
        isCrux: false
      })
    }
  }
  
  // Handle case where last move extends to end
  if (inMove && moveStartIdx < acceleration.length) {
    const maxAccel = Math.max(...acceleration.slice(moveStartIdx))
    moves.push({
      index: moveIndex++,
      startTime: time[moveStartIdx],
      endTime: time[time.length - 1],
      duration: time[time.length - 1] - time[moveStartIdx],
      acceleration: maxAccel,
      dynamics: 0,
      isCrux: false
    })
  }
  
  // Calculate dynamics and identify crux moves
  if (moves.length > 0) {
    const accelerations = moves.map(m => m.acceleration)
    const maxAccel = Math.max(...accelerations)
    const minAccel = Math.min(...accelerations)
    const range = maxAccel - minAccel
    
    // Normalize dynamics and identify crux
    const avgAccel = accelerations.reduce((a, b) => a + b, 0) / accelerations.length
    const threshold = avgAccel * 1.2
    
    moves.forEach(move => {
      // Normalize dynamics between 0.1 and 1.0
      if (range > 0) {
        move.dynamics = 0.1 + ((move.acceleration - minAccel) / range) * 0.9
      } else {
        move.dynamics = 0.5
      }
      
      // Mark as crux if above threshold
      move.isCrux = move.acceleration >= threshold
    })
  }
  
  return moves
} 