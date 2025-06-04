import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { AddCustomBoulder } from './components/AddCustomBoulder'
import { BoulderVisualizerSimple } from './components/BoulderVisualizerSimple'
import { StatisticsView } from './components/StatisticsView'
import { ControlPanel } from './components/ControlPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BoulderConfigProvider, useBoulderConfig } from './context/BoulderConfigContext'
import { useCSVData } from './hooks/useCSVData'
import type { BoulderData } from './utils/csvLoader'
import { setBoulderThresholdGetter } from './utils/csvLoader'
import Silk from './components/ui/Silk'
import { 
  updateSelectedBoulder, 
  updateVisualizerSettings
} from './store/visualizationStore'
import './utils/corsHelper' // Initialize CORS helper
import './App.css'

type View = 'visualizer' | 'add-boulder';
type VisualizationMode = '3d' | 'statistics' | 'simple';

// Component to set up threshold getter inside BoulderConfigProvider
function ThresholdSetup() {
  const { getThreshold } = useBoulderConfig()
  
  useEffect(() => {
    // Set up the threshold getter for CSV loader
    setBoulderThresholdGetter(getThreshold)
    console.log('🔧 [App] Threshold getter set up for CSV loader')
  }, [getThreshold])
  
  return null
}

function App() {
  const [currentView, setCurrentView] = useState<View>('visualizer')
  const [isControlPanelVisible, setIsControlPanelVisible] = useState(true)
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('simple')
  const [isServerConnected, setIsServerConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const viewChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const liveDataUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [visualizerSettings, setVisualizerSettings] = useState({
    // Basics - Updated to match user's current settings
    baseRadius: 0.60,
    dynamicsMultiplier: 2.0,
    combinedSize: 2.1,
    ringCount: 43.0,
    ringSpacing: 0.003,
    
    // Visuals - Updated to match user's current settings
    opacity: 0.90,
    lineWidth: 0.6,
    centerFade: 0.65,
    depthEffect: 0.5,
    organicNoise: 1.60,
    moveColor: '#8b5cf6', // Purple from user's selection
    cruxColor: '#ef4444', // Red from user's selection
    
    // Dynamic Effects
    cruxEmphasis: 0.5,
    
    // Animation
    animationEnabled: true,
    rotationSpeed: 0.0,
    liquidSpeed: 2.0,
    liquidSize: 0.3,
    
    // Advanced
    curveResolution: 240,
    liquidEffect: true,
    
    // Text Display
    centerTextSize: 1.0,
    
    // Move Detection Algorithm Parameters - ADDED TO FIX NaN
    moveThreshold: 1.5,
    stillThreshold: 3.0,
    minStillDuration: 1.5,
    minMoveDuration: 1.0,
    maxMoveDuration: 2.0,
    maxMoveSequence: 2,
    
    // Move Position Lines - ADDED TO FIX NaN
    showMovePositionLines: true,
    moveLineLength: 3.0,
    moveLineOpacity: 0.8,
    moveLineWidth: 2.0,
    
    // Attempt Visualization - Updated to match user's current settings
    showAttemptLines: true,
    maxAttempts: 95.0,
    attemptOpacity: 0.35,
    attemptWaviness: 0.05,
    attemptFadeStrength: 0.8,
    attemptThickness: 0.5,
    attemptIntensity: 0.5,
    attemptRadius: 1.30,
    attemptDotZOffsetMax: 1.15,
    attemptDotZEffectStrength: 0.5,
    
    // Legacy attempt settings (for compatibility)
    attemptCount: 95.0,
    attemptZHeight: 1.5,
    attemptWaveEffect: 0.05,
    maxRadiusScale: 1.30
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
    visualizerSettings.maxRadiusScale,
    // Add move detection parameters
    visualizerSettings.moveThreshold,
    visualizerSettings.minStillDuration,
    visualizerSettings.minMoveDuration,
    visualizerSettings.maxMoveDuration,
    visualizerSettings.maxMoveSequence,
    // Add move line parameters
    visualizerSettings.showMovePositionLines,
    visualizerSettings.moveLineLength,
    visualizerSettings.moveLineOpacity,
    visualizerSettings.moveLineWidth
  ])
  
  // Centralized boulder data management
  const { boulders, selectedBoulder, isLoading, error, selectBoulder, uploadFile, refreshBoulders } = useCSVData()

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
      if (liveDataUpdateIntervalRef.current) {
        clearInterval(liveDataUpdateIntervalRef.current)
      }
    }
  }, [])

  const handleServerToggle = useCallback((connected: boolean) => {
    setIsServerConnected(connected)
    console.log('Server connection:', connected)
  }, [])

  const handleServerCommand = useCallback(async (command: string) => {
    console.log('Server command:', command)
    
    if (!isServerConnected) {
      console.warn('Not connected to server')
      return
    }

    try {
      // Use the current server URL from localStorage or default
      const savedServerUrl = localStorage.getItem('phyphox-server-url') || 'http://10.237.1.101'
      
      const response = await fetch(`${savedServerUrl}/control?cmd=${command}`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`[App] Server command '${command}' result:`, result)
      
      if (result.result === true) {
        console.log(`✅ ${command.toUpperCase()} successful`)
        
        // Update recording status and handle live data
        if (command === 'start') {
          setIsRecording(true)
          startLiveDataPolling(savedServerUrl)
        } else if (command === 'stop') {
          setIsRecording(false)
          stopLiveDataPolling()
        } else if (command === 'clear') {
          setIsRecording(false)
          stopLiveDataPolling()
        }
      } else {
        console.warn(`⚠️ ${command.toUpperCase()} failed: ${result.message || 'Unknown error'}`)
      }
      
      return result
      
    } catch (error) {
      console.error(`[App] Server command '${command}' failed:`, error)
      throw error
    }
  }, [isServerConnected])

  // Live data polling for visualization updates
  const startLiveDataPolling = useCallback((serverUrl: string) => {
    if (liveDataUpdateIntervalRef.current) return // Already polling

    console.log('[App] Starting live data polling for visualization updates')
    
    liveDataUpdateIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${serverUrl}/get?acc_time=full&accX=full&accY=full&accZ=full`, {
          method: 'GET',
          mode: 'cors',
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Dispatch event to update any listening visualizations
          window.dispatchEvent(new CustomEvent('liveDataUpdate', {
            detail: { 
              data: data.buffer,
              isRecording,
              timestamp: Date.now()
            }
          }))
        }
      } catch (error) {
        console.warn('[App] Live data polling error:', error)
      }
    }, 1000) // Poll every second
  }, [isRecording])

  const stopLiveDataPolling = useCallback(() => {
    if (liveDataUpdateIntervalRef.current) {
      clearInterval(liveDataUpdateIntervalRef.current)
      liveDataUpdateIntervalRef.current = null
      console.log('[App] Stopped live data polling')
    }
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
    // Refresh the boulder list to include any newly saved boulders
    refreshBoulders()
    // Select the updated boulder
    selectBoulder(boulder.id)
  }, [refreshBoulders, selectBoulder])

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
    } else {
      updateSelectedBoulder(null)
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
      <ThresholdSetup />
      <div className="min-h-screen relative">
        {/* Silk Animated Background */}
        <Silk
          speed={5.0}
          scale={0.20}
          color="#041313"
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