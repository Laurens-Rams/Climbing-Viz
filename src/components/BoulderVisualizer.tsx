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
  isControlPanelVisible?: boolean
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
    return convertBoulderDataForHook(boulderData || null)
  }, [boulderData?.id, boulderData?.moves?.length]) // Only recalculate if ID or move count changes
  
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

export function BoulderVisualizer({ boulderData, settings, currentBoulderId, boulders, selectedBoulder, isLoading, error, selectBoulder: selectBoulderFromAppProps, isControlPanelVisible }: BoulderVisualizerProps) {
  // Use effect to react to boulderSelectionChanged events, primarily for logging or side-effects if needed in future.
  // The component will primarily re-render based on prop changes (selectedBoulder, currentBoulderId).
  useEffect(() => {
    const handleBoulderSelectionChanged = (event: CustomEvent) => {
      const { boulderId: eventBoulderId, source } = event.detail;
      if (source !== 'visualizer') {
        // console.log(`[BoulderVisualizer] Heard boulderSelectionChanged from ${source} to ${eventBoulderId}. Current prop ID: ${currentBoulderId}`);
        // The visualizer should automatically update when its props (like selectedBoulder or currentBoulderId) change.
        // No need to call selectBoulderFromAppProps(eventBoulderId) here as it can cause loops
        // and App.tsx is already the source of truth for selectedBoulder prop.
      }
    };

    document.addEventListener('boulderSelectionChanged', handleBoulderSelectionChanged as EventListener);

    // Initial sync logic removed: The component should rely on initial props from App.tsx.
    // If currentBoulderId is provided, App.tsx should ensure selectedBoulder matches it.
    // if (!boulderData && currentBoulderId && boulders && boulders.length > 0 && (!selectedBoulder || selectedBoulder.id !== currentBoulderId)) {
    //   const targetBoulder = boulders.find(b => b.id === currentBoulderId);
    //   if (targetBoulder && selectBoulderFromAppProps) {
    //      // selectBoulderFromAppProps(currentBoulderId); // This was problematic
    //   }
    // }

    return () => {
      document.removeEventListener('boulderSelectionChanged', handleBoulderSelectionChanged as EventListener);
    };
  // Ensure dependencies are correct for this simplified effect.
  // selectBoulderFromAppProps is removed from deps as it's not directly used in the simplified handler.
  }, [currentBoulderId, boulders, selectedBoulder]); 
  
  // Determine which data source to use - ensure type is BoulderData | null
  const effectiveBoulderData: BoulderData | null = boulderData || selectedBoulder || null
  const hasValidData = effectiveBoulderData && effectiveBoulderData.moves && effectiveBoulderData.moves.length > 0
  
  return (
    <div className={`w-full h-full relative transition-all duration-300 ${isControlPanelVisible ? 'mr-[25rem]' : 'mr-0'}`}>
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