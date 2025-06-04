import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { AddCustomBoulder } from './components/AddCustomBoulder'
import { BoulderVisualizerSimple } from './components/BoulderVisualizerSimple'
import { StatisticsView } from './components/StatisticsView'
import { ControlPanel } from './components/ControlPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BoulderConfigProvider, useBoulderConfig } from './context/BoulderConfigContext'
import { useCSVData } from './hooks/useCSVData'
import SplitText from './components/SplitText'
import type { BoulderData } from './utils/csvLoader'
import { setBoulderThresholdGetter } from './utils/csvLoader'
import { performStartupCleanup, manualClearAllData } from './utils/dataCleanup'
import Silk from './components/ui/Silk'
import { Play, Square, RotateCcw } from 'lucide-react'
import { 
  updateSelectedBoulder, 
  updateVisualizerSettings,
  updateThreshold,
  getVisualizationState
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
  const [currentView, setCurrentView] = useState<View>('add-boulder')
  const [isControlPanelVisible, setIsControlPanelVisible] = useState(false)
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('3d')
  const [isServerConnected, setIsServerConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const viewChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const liveDataUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Loading screen effect - show for 3 seconds
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false)
    }, 3000) // 3 seconds
    
    return () => clearTimeout(loadingTimer)
  }, [])
  
  const [visualizerSettings, setVisualizerSettings] = useState({
    // Basics - Updated to match user's current settings
    baseRadius: 0.55,
    dynamicsMultiplier: 12.6,
    combinedSize: 2.0,
    ringCount: 29,
    ringSpacing: 0.002,
    
    // Visuals - Updated to match user's current settings
    opacity: 1.00,
    lineWidth: 0.8,
    centerFade: 0.55,
    depthEffect: 1.6,
    organicNoise: 1.27,
    moveColor: '#252cf4', // Blue from user's RGB (37, 44, 244)
    cruxColor: '#8b5cf6', // Purple from user's RGB (139, 92, 246)
    
    // Dynamic Effects
    cruxEmphasis: 3.7,
    
    // Animation
    animationEnabled: true,
    rotationSpeed: 0.0,
    liquidSpeed: 2.70,
    liquidSize: 1.2,
    
    // Attempt Wave Animation - Updated to user's settings
    attemptWaveSpeed: 0.8,
    attemptWaveDirection: 0.7,
    attemptWaveIntensity: 1.6,
    
    // Advanced
    curveResolution: 240,
    liquidEffect: true,
    
    // Text Display
    centerTextSize: 1.0,
    
    // CircularText Settings
    showCircularText: true,
    circularTextSize: 1.0,
    circularTextSpeed: 60,
    
    // Move Detection Algorithm Parameters - Updated to user's settings
    moveThreshold: 1.0,
    stillThreshold: 3.0,
    minStillDuration: 0.65,
    minMoveDuration: 0.5,
    maxMoveDuration: 4.7,
    maxMoveSequence: 2,
    
    // Move Position Lines - Updated to user's settings
    showMovePositionLines: true,
    moveLineLength: 3.3,
    moveLineOpacity: 0.85,
    moveLineWidth: 3.2,
    
    // Attempt Visualization - Updated to user's settings
    showAttemptLines: true,
    maxAttempts: 55.0,
    attemptOpacity: 0.35,
    attemptWaviness: 0.014,
    attemptFadeStrength: 0.7,
    attemptThickness: 0.5,
    attemptIntensity: 0.5,
    attemptRadius: 2.40,
    attemptDotZOffsetMax: 0.55,
    attemptDotZEffectStrength: 0.5,
    
    // Legacy attempt settings (for compatibility)
    attemptCount: 95.0,
    attemptZHeight: 1.5,
    attemptWaveEffect: 0.05,
    maxRadiusScale: 1.30,
    
    // Post-Processing Effects
    postProcessingBW: false,
    postProcessingBWIntensity: 50,
    postProcessingContrast: true,
    postProcessingContrastIntensity: 59,
    postProcessingBloom: false,
    postProcessingBloomIntensity: 31
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
    visualizerSettings.moveLineWidth,
    // Add attempt wave animation parameters
    visualizerSettings.attemptWaveSpeed,
    visualizerSettings.attemptWaveDirection,
    visualizerSettings.attemptWaveIntensity,
    // Add post-processing parameters
    visualizerSettings.postProcessingBW,
    visualizerSettings.postProcessingBWIntensity,
    visualizerSettings.postProcessingContrast,
    visualizerSettings.postProcessingContrastIntensity,
    visualizerSettings.postProcessingBloom,
    visualizerSettings.postProcessingBloomIntensity,
    // Add CircularText parameters
    visualizerSettings.showCircularText,
    visualizerSettings.circularTextSize,
    visualizerSettings.circularTextSpeed
  ])
  
  // Centralized boulder data management
  const { boulders, selectedBoulder, isLoading: csvDataLoading, error, selectBoulder, uploadFile, refreshBoulders } = useCSVData()

  // Perform startup cleanup once when app loads
  useEffect(() => {
    performStartupCleanup()
  }, [])

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

  const handleBoulderDataUpdate = useCallback(async (boulder: BoulderData) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[App] Boulder data updated from component:', boulder.name, 'ID:', boulder.id)
    }
    
    try {
      // First, update the global store immediately with the new boulder data
      console.log('[App] Updating global store with updated boulder data')
      updateSelectedBoulder(boulder)
      
      // Then refresh the boulder list to include any newly saved boulders
      console.log('[App] Refreshing boulder list after data update')
      await refreshBoulders()
      
      // Finally, ensure the updated boulder is selected
      console.log('[App] Re-selecting updated boulder:', boulder.id)
      selectBoulder(boulder.id)
      
    } catch (error) {
      console.error('[App] Error updating boulder data:', error)
    }
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

  const handleAnimationComplete = () => {
    console.log('🧗‍♂️ Loading animation complete!')
  }

  // Loading Screen Component with custom font
  const LoadingScreen = () => {
    const [fontsReady, setFontsReady] = useState(false)
    
    useEffect(() => {
      const loadFonts = async () => {
        try {
          // Check if fonts API is available
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready
            
            // Check specifically for our custom font
            const customFontLoaded = document.fonts.check('bold 72px TT-Supermolot-Neue-Trial-Expanded-Bold')
            
            if (customFontLoaded) {
              console.log('🔤 [LoadingScreen] Custom font TT-Supermolot loaded successfully')
            } else {
              console.log('🔤 [LoadingScreen] Custom font not loaded, using fallback')
            }
            
            setFontsReady(true)
          } else {
            // Fallback for browsers without fonts API
            setTimeout(() => {
              setFontsReady(true)
            }, 1000)
          }
        } catch (error) {
          console.warn('🔤 [LoadingScreen] Font loading error:', error)
          setFontsReady(true) // Continue with fallback
        }
      }
      
      loadFonts()
    }, [])
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center w-full max-w-4xl px-8">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src="./assets/logoTENDOR.png" 
              alt="TENDOR Logo" 
              className="h-16 w-auto opacity-80"
            />
          </div>
          
          {fontsReady && (
            <SplitText
              text="Time to move"
              className="text-5xl font-bold text-white custom-headline-font"
              delay={80}
              duration={1.7}
              ease="elastic.out(1, 0.3)"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
              rootMargin="-100px"
              textAlign="center"
              onLetterAnimationComplete={handleAnimationComplete}
            />
          )}
        </div>
      </div>
    )
  }

  // Listen for navigation events from boulder save confirmation
  useEffect(() => {
    const handleNavigateToStatistics = (event: CustomEvent) => {
      const { boulderId } = event.detail
      console.log('[App] Navigating to statistics view for boulder:', boulderId)
      
      // Switch to visualizer view and statistics mode
      setCurrentView('visualizer')
      setVisualizationMode('statistics')
      setIsControlPanelVisible(true)
      
      // Select the boulder if ID is provided
      if (boulderId) {
        // Small delay to ensure the boulder list is refreshed
        setTimeout(() => {
          selectBoulder(boulderId)
        }, 500)
      }
    }
    
    window.addEventListener('navigateToStatistics', handleNavigateToStatistics as EventListener)
    return () => window.removeEventListener('navigateToStatistics', handleNavigateToStatistics as EventListener)
  }, [selectBoulder])

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
              onViewChange={handleViewChange}
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
          {isLoading ? <LoadingScreen /> : renderView()}
          
          {/* Control Panel - hide during loading screen */}
          {!isLoading && (
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
              isLoading={csvDataLoading}
              error={error}
              selectBoulder={selectBoulder}
              uploadFile={uploadFile}
              refreshBoulders={refreshBoulders}
              isServerConnected={isServerConnected}
              onVisibilityChange={handleControlPanelVisibilityChange}
            />
          )}
          
          {/* Floating Playback Controls - only show when server is connected and not in add-boulder view */}
          {isServerConnected && currentView !== 'add-boulder' && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-black/70 border border-cyan-400/40 rounded-2xl p-4 backdrop-blur-sm flex items-center space-x-4">
                <button
                  onClick={() => handleServerCommand('start')}
                  className="px-4 py-2 bg-green-500/80 hover:bg-green-500 text-white rounded-lg transition-all flex items-center justify-center"
                  title="Start Recording"
                >
                  <Play size={20} className="text-green-100" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleServerCommand('stop')}
                  className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all flex items-center justify-center"
                  title="Stop Recording"
                >
                  <Square size={20} className="text-red-100" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleServerCommand('clear')}
                  className="px-4 py-2 bg-gray-500/80 hover:bg-gray-500 text-white rounded-lg transition-all flex items-center justify-center"
                  title="Clear Data"
                >
                  <RotateCcw size={20} className="text-gray-100" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </BoulderConfigProvider>
  )
}

export default App 