import { useState, useCallback, useEffect, useRef } from 'react'
import { AddCustomBoulder } from './components/AddCustomBoulder'
import { BoulderVisualizer } from './components/BoulderVisualizer'
import { StatisticsView } from './components/StatisticsView'
import { ControlPanel } from './components/ControlPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BoulderConfigProvider } from './context/BoulderConfigContext'
import { useCSVData } from './hooks/useCSVData'
import type { BoulderData } from './utils/csvLoader'
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
    // Basics
    dynamicsMultiplier: 3.3,
    combinedSize: 1.6,
    ringCount: 59.0,
    ringSpacing: 0.020,
    
    // Visuals
    opacity: 1.0,
    centerFade: 0.75,
    depthEffect: 1.2,
    organicNoise: 0.12,
    moveColor: '#22d3ee', // Default cyan for moves
    cruxColor: '#f59e0b', // Default amber for crux
    
    // Dynamic Effects
    cruxEmphasis: 1.6,
    
    // Animation
    animationEnabled: true,
    rotationSpeed: 0.0,
    liquidSpeed: 1.85,
    liquidSize: 3.9,
    
    // Advanced
    curveResolution: 240,
    baseRadius: 1.0,
    liquidEffect: true,
    
    // Text Display
    centerTextSize: 1.0,
    
    // Attempt Visualization - Updated defaults to match current values
    showAttemptLines: true,
    attemptCount: 71.0,
    attemptZHeight: 1.5,
    attemptWaveEffect: 0.06,
    maxRadiusScale: 1.20
  })
  
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
    setVisualizerSettings(prevSettings => ({
      ...prevSettings,
      ...settings
    }))
  }, [])

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
              <BoulderVisualizer 
                settings={visualizerSettings} 
                boulderData={boulderDataToUse}
                currentBoulderId={selectedBoulder?.id || 0}
                boulders={boulders}
                selectedBoulder={selectedBoulder}
                isLoading={isLoading}
                error={error}
                selectBoulder={selectBoulder}
                isControlPanelVisible={isControlPanelVisible}
              />
            </ErrorBoundary>
          )
        }
    }
  }

  return (
    <BoulderConfigProvider>
    <div className="min-h-screen bg-black relative">
      <main className="h-screen relative">
        {renderView()}
        
        {/* Control Panel - now includes view switching and server controls */}
        <ControlPanel 
          currentView={currentView}
          onViewChange={handleViewChange}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={handleVisualizationModeChange}
          onSettingsChange={handleSettingsChange}
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