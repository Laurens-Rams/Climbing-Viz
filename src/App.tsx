import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { AddCustomBoulder } from './components/AddCustomBoulder'
import { BoulderVisualizerSimple } from './components/BoulderVisualizerSimple'
import { StatisticsView } from './components/StatisticsView'
import { ControlPanel } from './components/ControlPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BoulderConfigProvider } from './context/BoulderConfigContext'
import { useCSVData } from './hooks/useCSVData'
import type { BoulderData } from './utils/csvLoader'
import Silk from './components/ui/Silk'
import { 
  updateSelectedBoulder, 
  updateProcessedMoves, 
  detectAndProcessMoves,
  updateVisualizerSettings
} from './store/visualizationStore'
import './utils/corsHelper' // Initialize CORS helper
import './App.css'

type View = 'visualizer' | 'add-boulder';
type VisualizationMode = '3d' | 'statistics';

function App() {
  const [currentView, setCurrentView] = useState<View>('visualizer')
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('3d')
  const [isServerConnected, setIsServerConnected] = useState(false)
  const [isControlPanelVisible, setIsControlPanelVisible] = useState(true)
  const viewChangeTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [visualizerSettings, setVisualizerSettings] = useState({
    // Basics - Updated to match user's current settings
    baseRadius: 0.85,
    dynamicsMultiplier: 4.5,
    combinedSize: 1.4,
    ringCount: 59,
    ringSpacing: 0.007,
    
    // Visuals - Updated to match user's current settings
    opacity: 0.90,
    lineWidth: 0.6,
    centerFade: 0.90,
    depthEffect: 1.8,
    organicNoise: 1.69,
    moveColor: '#8b5cf6', // Purple from user's selection
    cruxColor: '#ef4444', // Red from user's selection
    
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
    
    // Text Display
    centerTextSize: 1.0,
    
    // Attempt Visualization - Updated to match user's current settings
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
  })
  
  // Memoize the visualizer settings to prevent unnecessary re-renders
  const memoizedVisualizerSettings = useMemo(() => visualizerSettings, [
    visualizerSettings.dynamicsMultiplier,
    visualizerSettings.combinedSize,
    visualizerSettings.ringCount,
    visualizerSettings.ringSpacing,
    visualizerSettings.opacity,
    visualizerSettings.centerFade,
    visualizerSettings.depthEffect,
    visualizerSettings.organicNoise,
    visualizerSettings.moveColor,
    visualizerSettings.cruxColor,
    visualizerSettings.cruxEmphasis,
    visualizerSettings.animationEnabled,
    visualizerSettings.rotationSpeed,
    visualizerSettings.liquidSpeed,
    visualizerSettings.liquidSize,
    visualizerSettings.curveResolution,
    visualizerSettings.baseRadius,
    visualizerSettings.liquidEffect,
    visualizerSettings.centerTextSize,
    visualizerSettings.showAttemptLines,
    visualizerSettings.attemptCount,
    visualizerSettings.attemptZHeight,
    visualizerSettings.attemptWaveEffect,
    visualizerSettings.maxRadiusScale
  ])
  
  // Centralized boulder data management
  const { boulders, selectedBoulder, isLoading, error, selectBoulder, updateBoulderData, uploadFile, refreshBoulders } = useCSVData()

  // Debug logging for boulder data changes - reduce frequency to prevent spam
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    console.log('[App] Boulder selection state changed:', {
      selectedBoulder: selectedBoulder?.name,
      selectedBoulderId: selectedBoulder?.id,
      currentView,
      visualizationMode,
      bouldersCount: boulders.length
    })
    }
  }, [selectedBoulder?.id, currentView, visualizationMode, boulders.length]) // Only log when ID changes, not name

  const handleViewChange = useCallback((view: View) => {
    console.log('[App] View changing to:', view)
    
    // Clear any pending view change
    if (viewChangeTimeoutRef.current) {
      clearTimeout(viewChangeTimeoutRef.current)
    }
    
    // Debounce the view change
    viewChangeTimeoutRef.current = setTimeout(() => {
      setCurrentView(view)
      
      // Auto-hide control panel when switching to Add Boulder mode
      // Auto-show control panel when switching to Visualizer mode
      if (view === 'add-boulder') {
        setIsControlPanelVisible(false)
      } else if (view === 'visualizer') {
        setIsControlPanelVisible(true)
      }
      
      // Ensure boulder selection is maintained when switching views
      if (selectedBoulder) {
        document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
          detail: { boulderId: selectedBoulder.id, source: 'app' }
        }))
      }
    }, 100)
  }, [selectedBoulder])

  const handleVisualizationModeChange = useCallback((mode: VisualizationMode) => {
    console.log('[App] Visualization mode changing to:', mode)
    setVisualizationMode(mode)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (viewChangeTimeoutRef.current) {
        clearTimeout(viewChangeTimeoutRef.current)
      }
    }
  }, [])

  const handleServerToggle = useCallback((connected: boolean) => {
    setIsServerConnected(connected)
    console.log('Server connection:', connected)
  }, [])

  const handleServerCommand = useCallback((command: string) => {
    console.log('Server command:', command)
    // In real implementation, this would send commands to the Phyphox server
    // fetch(`http://192.168.1.36/control?cmd=${command}`)
  }, [])

  const handleSettingsChange = useCallback((settings: any) => {
    console.log('[App] Settings change received:', {
      dynamicsMultiplier: settings.dynamicsMultiplier,
      combinedSize: settings.combinedSize,
      ringCount: settings.ringCount
    });
    
    setVisualizerSettings(prevSettings => {
      // Only update if settings actually changed
      const hasChanges = Object.keys(settings).some(key => settings[key] !== prevSettings[key as keyof typeof prevSettings]);
      
      if (hasChanges) {
        console.log('[App] Applying settings changes');
        return {
          ...prevSettings,
          ...settings
        };
      } else {
        console.log('[App] No actual changes in settings, skipping update');
        return prevSettings;
      }
    });
  }, []);

  const handleBoulderChange = useCallback((boulderId: number) => {
    console.log('[App] Boulder ID changing to:', boulderId)
    // Update the boulder selection in the global state
    selectBoulder(boulderId)
    
    // Emit a custom event for cross-view synchronization
    document.dispatchEvent(new CustomEvent('boulderSelectionChanged', {
      detail: { boulderId, source: 'app' }
    }))
  }, [selectBoulder])

  const handleBoulderDataUpdate = useCallback((boulder: BoulderData) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[App] Boulder data updated from component:', boulder.name, 'ID:', boulder.id)
    }
    // Only update the boulder data in the global state. Do not attempt to re-select.
    updateBoulderData(boulder)
  }, [updateBoulderData])

  const handleControlPanelVisibilityChange = useCallback((visible: boolean) => {
    setIsControlPanelVisible(visible)
  }, [])

  const handleBoulderSelect = useCallback((value: string) => {
    if (value) {
      handleBoulderChange(parseInt(value))
    }
  }, [handleBoulderChange])

  // Update global store when settings change
  useEffect(() => {
    updateVisualizerSettings(memoizedVisualizerSettings)
  }, [memoizedVisualizerSettings])
  
  // Update global store when boulder selection changes
  useEffect(() => {
    if (selectedBoulder) {
      console.log('[App] Updating global store with selected boulder:', selectedBoulder.name)
      updateSelectedBoulder(selectedBoulder)
      
      // Process moves if CSV data exists
      if (selectedBoulder.csvData) {
        const moves = detectAndProcessMoves(
          selectedBoulder.csvData.time,
          selectedBoulder.csvData.absoluteAcceleration,
          12.0 // Default threshold, will be updated by ControlPanel
        )
        updateProcessedMoves(moves)
      }
    } else {
      updateSelectedBoulder(null)
      updateProcessedMoves(null)
    }
  }, [selectedBoulder])

  const renderView = () => {
    switch (currentView) {
      case 'add-boulder':
        return (
          <div className={`transition-all duration-300 ${isControlPanelVisible ? 'mr-[25rem]' : 'mr-0'}`}>
            <AddCustomBoulder 
              uploadFile={uploadFile}
              onServerToggle={handleServerToggle}
              onServerCommand={handleServerCommand}
              isServerConnected={isServerConnected}
              currentView={currentView}
              isControlPanelVisible={isControlPanelVisible}
            />
          </div>
        )
      case 'visualizer':
      default:
        if (visualizationMode === 'statistics') {
          return (
            <ErrorBoundary>
              <StatisticsView 
                selectedBoulder={selectedBoulder}
                onBoulderDataUpdate={handleBoulderDataUpdate}
                isControlPanelVisible={isControlPanelVisible}
              />
            </ErrorBoundary>
          )
        } else {
          // Use shared boulder data with fallback to current boulder data
          const boulderDataToUse = selectedBoulder || boulders[0]
          if (process.env.NODE_ENV === 'development') {
          console.log('[App] Rendering 3D visualizer with boulder data:', boulderDataToUse?.name || 'None')
          }
          
          return (
            <ErrorBoundary>
              <BoulderVisualizerSimple />
            </ErrorBoundary>
          )
        }
    }
  }

  return (
    <BoulderConfigProvider>
    <div className="min-h-screen relative">
      {/* Silk Animated Background */}
      <Silk
        speed={7.0}
        scale={0.3}
        color="#052323"
        noiseIntensity={0.2}
        rotation={4.75}
      />
      
      <main className="h-screen relative">
        {renderView()}
        
        {/* Control Panel - now includes view switching and server controls */}
        <ControlPanel 
          currentView={currentView}
          onViewChange={handleViewChange}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={handleVisualizationModeChange}
          onSettingsChange={handleSettingsChange}
          visualizerSettings={visualizerSettings}
          setVisualizerSettings={setVisualizerSettings}
          onBoulderChange={handleBoulderChange}
          onBoulderDataUpdate={handleBoulderDataUpdate}
          onServerToggle={handleServerToggle}
          onServerCommand={handleServerCommand}
          currentBoulderId={selectedBoulder?.id || 0}
          boulders={boulders}
          selectedBoulder={selectedBoulder}
          isLoading={isLoading}
          error={error}
          selectBoulder={selectBoulder}
          uploadFile={uploadFile}
          refreshBoulders={refreshBoulders}
          isServerConnected={isServerConnected}
          onVisibilityChange={handleControlPanelVisibilityChange}
        />
        
        {/* Floating Playback Controls - only show when server is connected and not in add-boulder view */}
        {isServerConnected && currentView !== 'add-boulder' && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-black/70 border border-cyan-400/40 rounded-2xl p-4 backdrop-blur-sm flex items-center space-x-4">
              <button
                onClick={() => handleServerCommand('start')}
                className="px-4 py-2 bg-green-500/80 hover:bg-green-500 text-white rounded-lg transition-all"
                title="Start Recording"
              >
                ▶️
              </button>
              <button
                onClick={() => handleServerCommand('stop')}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all"
                title="Stop Recording"
              >
                ⏹️
              </button>
              <button
                onClick={() => handleServerCommand('clear')}
                className="px-4 py-2 bg-gray-500/80 hover:bg-gray-500 text-white rounded-lg transition-all"
                title="Clear Data"
              >
                🔄
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 text-xs rounded border border-gray-600 z-50">
          <div>View: {currentView}</div>
          <div>Viz Mode: {visualizationMode}</div>
          <div>Boulder ID: {selectedBoulder?.id || 'None'}</div>
          <div>Current Data: {selectedBoulder?.name || 'None'}</div>
          <div>Boulders Count: {boulders.length}</div>
          <div>Server: {isServerConnected ? 'Connected' : 'Disconnected'}</div>
          <div>Panel: {isControlPanelVisible ? 'Visible' : 'Hidden'}</div>
        </div>
      )}
    </div>
    </BoulderConfigProvider>
  )
}

export default App 