import React, { Suspense, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useBoulderVisualizer } from '../hooks/useBoulderVisualizer'
import { useCSVData } from '../hooks/useCSVData'
import { useBoulderConfig } from '../context/BoulderConfigContext'
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

// Move detection function (same as in StatisticsView)
const detectMoves = (time: number[], acceleration: number[], threshold: number) => {
  const detectedMoves = [];
  const minMoveDuration = 0.5;
  let lastMoveTime = -minMoveDuration;
  
  detectedMoves.push({
    time: 0,
    acceleration: acceleration[0] || 9.8
  });
  
  for (let i = 1; i < acceleration.length - 1; i++) {
    const currentAccel = acceleration[i];
    const currentTime = time[i];
    
    if (currentAccel > threshold && 
        currentAccel > acceleration[i-1] && 
        currentAccel > acceleration[i+1] &&
        (currentTime - lastMoveTime) > minMoveDuration) {
      
      detectedMoves.push({
        time: currentTime,
        acceleration: currentAccel
      });
      
      lastMoveTime = currentTime;
    }
  }
  
  return detectedMoves;
};

// Convert CSV BoulderData to hook-compatible format - memoized to prevent excessive conversions
function convertBoulderDataForHook(boulderData: BoulderData | null, threshold: number) {
  if (!boulderData) {
    return null
  }
  
  // If we have CSV data and a threshold, recalculate moves
  if (boulderData.csvData && threshold) {
    const detectedMoves = detectMoves(
      boulderData.csvData.time,
      boulderData.csvData.absoluteAcceleration,
      threshold
    );
    
    // Calculate dynamics range (same as CSV loader)
    const accelerations = detectedMoves.map(m => m.acceleration);
    const maxAccel = Math.max(...accelerations);
    const minAccel = Math.min(...accelerations);
    const range = maxAccel - minAccel;
    
    const recalculatedMoves = detectedMoves.map((move, index) => {
      // Normalize dynamics between 0.1 and 1.0 (same as CSV loader)
      let dynamics = 0.1;
      if (index === 0) {
        // First move is always the start move with dynamics 0
        dynamics = 0;
      } else if (range > 0) {
        dynamics = 0.1 + ((move.acceleration - minAccel) / range) * 0.9;
      }
      
      return {
        move_number: index + 1,
        dynamics: dynamics,
        crux: move.acceleration > threshold * 1.5,
        isCrux: move.acceleration > threshold * 1.5,
        angle: 0,
        x: 0,
        y: 0,
        z: 0
      };
    });
    
    console.log(`[BoulderVisualizer] Recalculated ${recalculatedMoves.length} moves with threshold ${threshold}`);
    
    return {
      ...boulderData,
      grade: boulderData.grade || 'V0',
      moves: recalculatedMoves
    };
  }
  
  // Otherwise use existing moves
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

function BoulderScene({ boulderData, settings, threshold }: { boulderData?: BoulderData | null, settings?: any, threshold?: number }) {
  // Memoize the conversion to prevent excessive re-computation
  const convertedData = useMemo(() => {
    console.log('[BoulderScene] Recalculating moves with threshold:', threshold);
    const converted = convertBoulderDataForHook(boulderData || null, threshold || 12.0);
    
    // Add a unique key based on threshold and move count to force updates
    if (converted) {
      return {
        ...converted,
        // Add a stable identifier that changes when threshold or moves change
        _thresholdKey: `${threshold}_${converted.moves.length}`
      };
    }
    return converted;
  }, [boulderData?.id, boulderData?.csvData, threshold]) // Simplified dependencies
  
  // Log when convertedData changes
  useEffect(() => {
    if (convertedData) {
      console.log('[BoulderScene] Converted data updated:', {
        id: convertedData.id,
        moveCount: convertedData.moves.length,
        threshold: threshold
      });
    }
  }, [convertedData, threshold]);
  
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

// Memoize the BoulderScene component to prevent unnecessary re-renders
const MemoizedBoulderScene = React.memo(BoulderScene, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if essential props changed
  const shouldRerender = 
    prevProps.boulderData?.id !== nextProps.boulderData?.id ||
    prevProps.threshold !== nextProps.threshold ||
    prevProps.settings !== nextProps.settings // This will use reference equality
  
  if (shouldRerender) {
    console.log('[MemoizedBoulderScene] Re-rendering due to prop changes:', {
      boulderIdChanged: prevProps.boulderData?.id !== nextProps.boulderData?.id,
      thresholdChanged: prevProps.threshold !== nextProps.threshold,
      settingsChanged: prevProps.settings !== nextProps.settings
    })
  }
  
  return !shouldRerender // Return true to prevent re-render, false to allow
})

export function BoulderVisualizer({ boulderData, settings, currentBoulderId, boulders, selectedBoulder, isLoading, error, selectBoulder: selectBoulderFromAppProps, isControlPanelVisible }: BoulderVisualizerProps) {
  const { getThreshold, configs } = useBoulderConfig()
  
  // Get current threshold for the selected boulder - this will re-render when configs change
  const currentThreshold = useMemo(() => {
    if (!selectedBoulder) return 12.0
    const config = configs.get(selectedBoulder.id)
    return config?.threshold || 12.0
  }, [selectedBoulder?.id, configs])
  
  // Log threshold changes
  useEffect(() => {
    if (selectedBoulder) {
      console.log(`[BoulderVisualizer] Threshold for boulder ${selectedBoulder.id} is ${currentThreshold}`)
    }
  }, [selectedBoulder?.id, currentThreshold])
  
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
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <MemoizedBoulderScene boulderData={effectiveBoulderData} settings={settings} threshold={currentThreshold} />
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