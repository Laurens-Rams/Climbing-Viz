import { useState, useCallback, useEffect } from 'react'
import { Header } from './components/Header'
import { AddCustomBoulder } from './components/AddCustomBoulder'
import { BoulderVisualizer } from './components/BoulderVisualizer'
import { ControlPanel } from './components/ControlPanel'
import { ServerControlPanel } from './components/ServerControlPanel'
import { DataVizPanel } from './components/DataVizPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useCSVData } from './hooks/useCSVData'
import type { BoulderData } from './utils/csvLoader'
import './App.css'

type View = 'visualizer' | 'add-boulder' | 'dataviz';
type Mode = 'frontend' | 'backend';

function App() {
  const [currentView, setCurrentView] = useState<View>('visualizer')
  const [currentMode, setCurrentMode] = useState<Mode>('frontend')
  const [isServerConnected, setIsServerConnected] = useState(false)
  const [visualizerSettings, setVisualizerSettings] = useState({
    // Basics
    dynamicsMultiplier: 4.9,
    combinedSize: 1.0,
    ringCount: 28,
    ringSpacing: 0.0,
    
    // Visuals
    opacity: 1.0,
    centerFade: 1.0,
    depthEffect: 2.0,
    organicNoise: 0.1,
    
    // Dynamic Effects
    cruxEmphasis: 3.0,
    moveEmphasis: 0.0,
    waveComplexity: 1.0,
    
    // Animation
    animationEnabled: true,
    rotationSpeed: 0.0,
    liquidSpeed: 0.5,
    
    // Advanced
    curveResolution: 240,
    baseRadius: 2.5,
    liquidEffect: true
  })
  
  // Centralized boulder data management
  const { boulders, selectedBoulder, isLoading, error, selectBoulder, uploadFile, refreshBoulders } = useCSVData()

  // Debug logging for boulder data changes
  useEffect(() => {
    console.log('[App] Boulder selection state changed:', {
      selectedBoulder: selectedBoulder?.name,
      selectedBoulderId: selectedBoulder?.id,
      currentView,
      currentMode,
      bouldersCount: boulders.length
    })
  }, [selectedBoulder?.name, selectedBoulder?.id, currentView, currentMode, boulders.length])

  const handleModeChange = useCallback((mode: Mode) => {
    console.log('[App] Mode changing to:', mode)
    setCurrentMode(mode)
    // Switch to appropriate view based on mode
    if (mode === 'backend') {
      setCurrentView('dataviz')
    } else {
      setCurrentView('visualizer')
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
    setVisualizerSettings(settings)
  }, [])

  const handleBoulderChange = useCallback((boulderId: number) => {
    console.log('[App] Boulder ID changing to:', boulderId)
    selectBoulder(boulderId)
  }, [selectBoulder])

  const handleBoulderDataUpdate = useCallback((boulder: BoulderData) => {
    console.log('[App] Boulder data updated from component:', boulder.name, 'ID:', boulder.id)
    selectBoulder(boulder.id)
  }, [selectBoulder])

  const handleSharedBoulderUpdate = useCallback((boulder: BoulderData) => {
    console.log('[App] Shared boulder data updated:', boulder.name, 'ID:', boulder.id)
    selectBoulder(boulder.id)
  }, [selectBoulder])

  const renderView = () => {
    switch (currentView) {
      case 'add-boulder':
        return <AddCustomBoulder />
      case 'dataviz':
        return (
          <ErrorBoundary>
            <DataVizPanel 
              isVisible={true}
              onBoulderDataUpdate={handleBoulderDataUpdate}
              currentBoulderId={selectedBoulder?.id || 0}
            />
          </ErrorBoundary>
        )
      case 'visualizer':
      default:
        // Use shared boulder data with fallback to current boulder data
        const boulderDataToUse = selectedBoulder || boulders[0]
        console.log('[App] Rendering visualizer with boulder data:', boulderDataToUse?.name || 'None')
        
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
            />
          </ErrorBoundary>
        )
    }
  }

  return (
    <div className="min-h-screen bg-black relative">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="h-[calc(100vh-4rem)] relative">
        {renderView()}
        
        {/* Control Panel - only show in visualizer mode and frontend mode */}
        {currentView === 'visualizer' && currentMode === 'frontend' && (
          <ControlPanel 
            onSettingsChange={handleSettingsChange}
            onBoulderChange={handleBoulderChange}
            onBoulderDataUpdate={handleSharedBoulderUpdate}
            currentBoulderId={selectedBoulder?.id || 0}
            boulders={boulders}
            selectedBoulder={selectedBoulder}
            isLoading={isLoading}
            error={error}
            selectBoulder={selectBoulder}
            uploadFile={uploadFile}
            refreshBoulders={refreshBoulders}
          />
        )}
        
        {/* Server Control Panel - always visible, positioned above DataViz */}
        <ServerControlPanel 
          onModeChange={handleModeChange}
          onServerToggle={handleServerToggle}
          onServerCommand={handleServerCommand}
        />
      </main>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 text-xs rounded border border-gray-600 z-50">
          <div>Mode: {currentMode}</div>
          <div>View: {currentView}</div>
          <div>Boulder ID: {selectedBoulder?.id || 'None'}</div>
          <div>Current Data: {selectedBoulder?.name || 'None'}</div>
          <div>Boulders Count: {boulders.length}</div>
        </div>
      )}
    </div>
  )
}

export default App 