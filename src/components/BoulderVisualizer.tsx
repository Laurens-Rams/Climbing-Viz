import React, { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useBoulderVisualizer } from '../hooks/useBoulderVisualizer'
import { useCSVData } from '../hooks/useCSVData'
import type { BoulderData } from '../utils/csvLoader'

interface BoulderVisualizerProps {
  boulderData?: BoulderData | null
  settings?: any
  currentBoulderId?: number
  // Add props for centralized boulder data when no boulderData is provided  
  boulders?: BoulderData[]
  selectedBoulder?: BoulderData | null
  isLoading?: boolean
  error?: string | null
  selectBoulder?: (id: number) => void
}

// Convert CSV BoulderData to hook-compatible format - memoized to prevent excessive conversions
function convertBoulderDataForHook(boulderData: BoulderData | null) {
  if (!boulderData) {
    return null
  }
  
  if (!boulderData.moves || !Array.isArray(boulderData.moves)) {
    console.warn('[BoulderVisualizer] Invalid or missing moves array:', boulderData.moves)
    return null
  }
  
  try {
    const convertedMoves = boulderData.moves.map((move, index) => {
      if (!move || typeof move !== 'object') {
        console.warn('[BoulderVisualizer] Invalid move at index', index, ':', move)
        return {
          move_number: index + 1,
          dynamics: 0.5, // Fallback value
          crux: false,
          isCrux: false,
          angle: 0,
          x: 0,
          y: 0,
          z: 0
        }
      }
      
      // CSV moves have: move_number, dynamics, isCrux
      // Hook expects: move_number, dynamics, crux, isCrux, angle, x, y, z
      return {
        move_number: move.move_number || index + 1,
        dynamics: typeof move.dynamics === 'number' && isFinite(move.dynamics) ? move.dynamics : 0.5,
        crux: move.isCrux || false, // Map isCrux to crux for compatibility
        isCrux: move.isCrux || false,
        angle: 0, // Default angle since CSV data doesn't have this
        x: 0,     // Default position values
        y: 0,
        z: 0
      }
    })
    
    const converted = {
      ...boulderData,
      grade: boulderData.grade || 'V0', // Provide default grade if undefined
      moves: convertedMoves
    }
    
    return converted
  } catch (error) {
    console.error('[BoulderVisualizer] Error converting boulder data:', error)
    return null
  }
}

function BoulderScene({ boulderData, settings }: { boulderData?: BoulderData | null, settings?: any }) {
  // Memoize the conversion to prevent excessive re-computation
  const convertedData = useMemo(() => {
    const converted = convertBoulderDataForHook(boulderData || null)
    
    // If we have threshold settings and CSV data, recalculate moves
    if (converted && settings?.moveDetectionThreshold && converted.csvData) {
      const dynamicMoves = detectMovesFromCSV(converted.csvData, settings.moveDetectionThreshold)
      return {
        ...converted,
        moves: dynamicMoves
      }
    }
    
    return converted
  }, [boulderData?.id, boulderData?.moves?.length, settings?.moveDetectionThreshold]) // Add threshold dependency

  // Use the hook within the Canvas context - let it manage its own refs
  const { ringsRef, centerTextRef, attemptLinesRef, moveLinesRef, moveSegmentsRef } = useBoulderVisualizer(convertedData, settings)

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      
      {/* Only render objects if we have valid converted data */}
      {convertedData && (
        <>
          <primitive object={ringsRef.current} />
          <primitive object={attemptLinesRef.current} />
          <primitive object={moveLinesRef.current} />
          <primitive object={moveSegmentsRef.current} />
        </>
      )}
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        zoomSpeed={0.6}
        panSpeed={0.8}
        rotateSpeed={0.4}
      />
    </>
  )
}

// Add move detection function for frontend
function detectMovesFromCSV(csvData: any, threshold: number = 15.0) {
  if (!csvData || !csvData.time || !csvData.absoluteAcceleration) {
    return []
  }

  const detectedMoves = []
  const minMoveDuration = 0.5 // minimum seconds between moves
  
  let lastMoveTime = -minMoveDuration
  
  // Always add starting position
  detectedMoves.push({
    move_number: 1,
    dynamics: 0.3,
    crux: false,
    isCrux: false,
    angle: 0,
    x: 0,
    y: 0,
    z: 0
  })
  
  const { time, absoluteAcceleration } = csvData
  
  // Detect moves above threshold
  for (let i = 1; i < absoluteAcceleration.length - 1; i++) {
    const currentAccel = absoluteAcceleration[i]
    const currentTime = time[i]
    
    // Look for peaks above threshold
    if (currentAccel > threshold && 
        currentAccel > absoluteAcceleration[i-1] && 
        currentAccel > absoluteAcceleration[i+1] &&
        (currentTime - lastMoveTime) > minMoveDuration) {
      
      // Calculate move properties
      const dynamics = Math.min(currentAccel / 30, 1.0) // Normalize dynamics
      const isCrux = currentAccel > threshold * 1.5
      
      detectedMoves.push({
        move_number: detectedMoves.length + 1,
        dynamics,
        crux: isCrux,
        isCrux,
        angle: 0,
        x: 0,
        y: 0,
        z: 0
      })
      
      lastMoveTime = currentTime
    }
  }
  
  return detectedMoves
}

export function BoulderVisualizer({ boulderData, settings, currentBoulderId, boulders, selectedBoulder, isLoading, error, selectBoulder }: BoulderVisualizerProps) {
  // Use effect to sync boulder selection with currentBoulderId prop
  useEffect(() => {
    if (!boulderData && currentBoulderId && boulders && boulders.length > 0 && (!selectedBoulder || selectedBoulder.id !== currentBoulderId)) {
      // Find the boulder with the current ID and select it if it's not already selected
      const targetBoulder = boulders.find(b => b.id === currentBoulderId)
      if (targetBoulder && selectBoulder) {
        selectBoulder(currentBoulderId)
      }
    }
  }, [currentBoulderId, boulderData, boulders, selectedBoulder, selectBoulder])
  
  // Determine which data source to use - ensure type is BoulderData | null
  const effectiveBoulderData: BoulderData | null = boulderData || selectedBoulder || null
  const hasValidData = effectiveBoulderData && effectiveBoulderData.moves && effectiveBoulderData.moves.length > 0
  
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 50 }}
        style={{ background: '#000000' }}
      >
        <Suspense fallback={null}>
          <BoulderScene boulderData={effectiveBoulderData} settings={settings} />
        </Suspense>
      </Canvas>
      
      {/* Show appropriate message based on data state */}
      {!hasValidData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white text-lg text-center">
            {isLoading ? (
              'Loading boulder data...'
            ) : error ? (
              `Error loading data: ${error}`
            ) : effectiveBoulderData === null ? (
              'Select a boulder from the control panel to begin visualization'
            ) : (
              'Loading boulder data...'
            )}
          </div>
        </div>
      )}
    </div>
  )
} 