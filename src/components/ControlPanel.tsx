import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCwIcon, SettingsIcon, WifiIcon, WifiOffIcon } from 'lucide-react'
import type { BoulderData } from '../utils/csvLoader'
import { useBoulderConfig } from '../context/BoulderConfigContext'
import ElasticSlider from "./ui/ElasticSlider"
import { useCSVData } from '../hooks/useCSVData'
import { debounce } from '../utils/debounce'
import { 
  updateThreshold, 
  updateVisualizerSettings,
  getVisualizationState
} from '../store/visualizationStore'

interface ControlPanelProps {
  // View management
  currentView: 'visualizer' | 'add-boulder'
  onViewChange: (view: 'visualizer' | 'add-boulder') => void
  
  // Visualization mode (within visualizer view)
  visualizationMode: '3d' | 'statistics' | 'simple'
  onVisualizationModeChange: (mode: '3d' | 'statistics' | 'simple') => void
  
  // Settings
  onSettingsChange: (settings: any) => void
  onBoulderChange: (boulderId: number) => void
  onBoulderDataUpdate?: (boulder: BoulderData) => void
  
  // Boulder data
  currentBoulderId: number
  boulders: BoulderData[]
  selectedBoulder: BoulderData | null
  isLoading: boolean
  error: string | null
  selectBoulder: (id: number) => void
  uploadFile: (file: File) => Promise<void>
  refreshBoulders: () => void
  
  // Server controls
  onServerToggle: (connected: boolean) => void
  onServerCommand: (command: string) => void
  isServerConnected: boolean
  
  // Visibility control
  onVisibilityChange: (visible: boolean) => void

  visualizerSettings: any
  setVisualizerSettings: (settings: any) => void
}

interface ServerOption {
  name: string
  url: string
}

interface StatData {
  maxAccel: number
  avgAccel: number
  moveCount: number
  duration: number
  sampleCount: number
}

export function ControlPanel({ 
  currentView, 
  onViewChange, 
  visualizationMode, 
  onVisualizationModeChange, 
  onSettingsChange, 
  onBoulderChange, 
  onBoulderDataUpdate, 
  currentBoulderId, 
  boulders, 
  selectedBoulder, 
  isLoading, 
  error, 
  selectBoulder, 
  uploadFile, 
  refreshBoulders,
  onServerToggle, 
  onServerCommand, 
  isServerConnected, 
  onVisibilityChange,
  visualizerSettings,
  setVisualizerSettings
}: ControlPanelProps) {
  const { getThreshold, setThreshold } = useBoulderConfig()
  const { selectBoulder: selectBoulderFromHook } = useCSVData()
  const [isVisible, setIsVisible] = useState(true)
  const [currentFolder, setCurrentFolder] = useState<string | null>('selection')
  const [isLiveModeActive, setIsLiveModeActive] = useState(false)
  const [selectedServer, setSelectedServer] = useState(0)
  const [serverUrl, setServerUrl] = useState('http://10.237.1.101')
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected')
  const [fontLoaded, setFontLoaded] = useState(false)
  const [autoSaveBlinking, setAutoSaveBlinking] = useState(false)
  
  // Scroll position ref to maintain scroll position
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  
  // Add debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get current state from global store
  const state = getVisualizationState()
  const selectedBoulderId = state.selectedBoulder?.id
  const currentThreshold = state.threshold
  const globalMoves = state.processedMoves || []
  
  // Notify parent of initial visibility state
  useEffect(() => {
    onVisibilityChange(isVisible)
  }, []) // Only run on mount
  
  // Check font loading status
  useEffect(() => {
    const checkFont = async () => {
      if (document.fonts && document.fonts.check) {
        try {
          const loaded = document.fonts.check('bold 16px TT-Supermolot-Neue-Trial-Expanded-Bold')
          if (loaded) {
            setFontLoaded(true)
          } else {
            await document.fonts.load('bold 16px TT-Supermolot-Neue-Trial-Expanded-Bold')
            setFontLoaded(true)
          }
        } catch (error) {
          console.warn('Font loading check failed:', error)
          setFontLoaded(false)
        }
      }
    }
    
    checkFont()
    
    // Also listen for font load events
    if (document.fonts) {
      document.fonts.addEventListener('loadingdone', checkFont)
      return () => document.fonts.removeEventListener('loadingdone', checkFont)
    }
  }, [])
  
  const servers: ServerOption[] = [
    { name: 'Server 1 (192.168.1.36)', url: 'http://10.237.1.101' },
    { name: 'Server 2 (10.237.1.101)', url: 'http://10.237.1.101' },
    { name: 'Server 3 (192.168.1.100)', url: 'http://192.168.1.100' },
    { name: 'Server 4 (172.20.10.1)', url: 'http://172.20.10.1' },
    { name: 'Server 5 (10.224.1.221)', url: 'http://10.224.1.221' }
  ]

  // Calculate statistics using global store data
  const stats = useMemo((): StatData => {
    if (!selectedBoulder?.csvData) return {
      maxAccel: 0,
      avgAccel: 0,
      moveCount: 0,
      duration: 0,
      sampleCount: 0
    };
    
    // Use moves from global store instead of calculating locally
    return {
      maxAccel: selectedBoulder.csvData.maxAcceleration,
      avgAccel: selectedBoulder.csvData.avgAcceleration,
      moveCount: globalMoves.length,
      duration: selectedBoulder.csvData.duration,
      sampleCount: selectedBoulder.csvData.sampleCount
    };
  }, [selectedBoulder, globalMoves.length]);
  
  // Handle threshold change
  const handleThresholdChange = useCallback((value: number) => {
    if (selectedBoulder?.id !== undefined) {
      console.log(`🎯 [ControlPanel] THRESHOLD CHANGE: ${currentThreshold} → ${value} for boulder "${selectedBoulder.name}"`)
      
      // Update local state for UI
      setThreshold(selectedBoulder.id, value)
      
      // Update global store - it will automatically recalculate moves
      updateThreshold(value)
    }
  }, [selectedBoulder, currentThreshold, setThreshold])
  
  // Create debounced settings update
  const debouncedSettingsUpdate = useRef(
    debounce((newSettings: any) => {
      console.log('[ControlPanel] Updating visualizer settings')
      setVisualizerSettings(newSettings)
      updateVisualizerSettings(newSettings) // Update global store
    }, 100)
  ).current
  
  // Handle settings changes
  const handleSettingChange = useCallback((key: string, value: any) => {
    const newSettings = { ...visualizerSettings, [key]: value }
    debouncedSettingsUpdate(newSettings)
    
    // If it's a move detection setting, trigger move recalculation
    const moveDetectionKeys = ['moveThreshold', 'minStillDuration', 'minMoveDuration', 'maxMoveDuration', 'maxMoveSequence']
    if (moveDetectionKeys.includes(key) && selectedBoulder) {
      console.log(`🔧 [ControlPanel] Move detection setting changed: ${key} = ${value}, triggering recalculation`)
      // The global store will automatically recalculate when settings are updated
    }
  }, [visualizerSettings, debouncedSettingsUpdate, selectedBoulder])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSettingsUpdate.cancel()
    }
  }, [debouncedSettingsUpdate])

  const handleBoulderSelect = useCallback((boulderId: string) => {
    if (boulderId) {
      const id = parseInt(boulderId)
      console.log(`🗂️ [ControlPanel] BOULDER SELECTED: ID ${id}`)
      selectBoulderFromHook(id)
      onBoulderChange(id)
      
      // Sync the saved threshold to the global store
      const savedThreshold = getThreshold(id)
      console.log(`🗂️ [ControlPanel] Syncing saved threshold ${savedThreshold} to global store`)
      updateThreshold(savedThreshold)
      
      // Load saved move detection settings for this boulder
      const savedSettings = localStorage.getItem(`boulder-settings-${id}`)
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          const moveDetectionUpdates: any = {}
          
          if (settings.moveThreshold !== undefined) moveDetectionUpdates.moveThreshold = settings.moveThreshold
          if (settings.minStillDuration !== undefined) moveDetectionUpdates.minStillDuration = settings.minStillDuration
          if (settings.minMoveDuration !== undefined) moveDetectionUpdates.minMoveDuration = settings.minMoveDuration
          if (settings.maxMoveDuration !== undefined) moveDetectionUpdates.maxMoveDuration = settings.maxMoveDuration
          if (settings.maxMoveSequence !== undefined) moveDetectionUpdates.maxMoveSequence = settings.maxMoveSequence
          
          if (Object.keys(moveDetectionUpdates).length > 0) {
            console.log(`🔧 [ControlPanel] Loading saved move detection settings for boulder ${id}:`, moveDetectionUpdates)
            updateVisualizerSettings(moveDetectionUpdates)
          }
        } catch (error) {
          console.error('Error loading boulder settings:', error)
        }
      }
    }
  }, [selectBoulderFromHook, onBoulderChange, getThreshold])

  // Auto-save move detection settings every 15 seconds when they change
  useEffect(() => {
    if (!selectedBoulder?.id) return
    
    const moveDetectionSettings = {
      moveThreshold: state.visualizerSettings.moveThreshold,
      minStillDuration: state.visualizerSettings.minStillDuration,
      minMoveDuration: state.visualizerSettings.minMoveDuration,
      maxMoveDuration: state.visualizerSettings.maxMoveDuration,
      maxMoveSequence: state.visualizerSettings.maxMoveSequence
    }
    
    const timeoutId = setTimeout(() => {
      const settings = {
        ...moveDetectionSettings,
        savedAt: new Date().toISOString()
      }
      
      localStorage.setItem(`boulder-settings-${selectedBoulder.id}`, JSON.stringify(settings))
      console.log(`💾 [ControlPanel] Auto-saved move detection settings for boulder ${selectedBoulder.id}`)
      
      // Trigger blink animation
      setAutoSaveBlinking(true)
      setTimeout(() => setAutoSaveBlinking(false), 2000) // Blink for 2 seconds
    }, 15000) // 15 second delay
    
    return () => clearTimeout(timeoutId)
  }, [selectedBoulder?.id, state.visualizerSettings.moveThreshold, state.visualizerSettings.minStillDuration, state.visualizerSettings.minMoveDuration, state.visualizerSettings.maxMoveDuration, state.visualizerSettings.maxMoveSequence])

  // Regular blink timer every 15 seconds to show auto-save is active
  useEffect(() => {
    if (!selectedBoulder?.id) return
    
    const intervalId = setInterval(() => {
      setAutoSaveBlinking(true)
      setTimeout(() => setAutoSaveBlinking(false), 1500) // Blink for 1.5 seconds
    }, 15000) // Every 15 seconds
    
    return () => clearInterval(intervalId)
  }, [selectedBoulder?.id])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      try {
        await uploadFile(file)
      } catch (error) {
        console.error('Upload failed:', error)
        alert('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'))
      } finally {
        event.target.value = ''
      }
    } else if (file) {
      alert('Please select a CSV file')
      event.target.value = ''
    }
  }, [uploadFile])

  // Server connection logic
  const testConnection = useCallback(async (serverUrl: string) => {
    try {
      const response = await fetch(`${serverUrl}/get?acc_time`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        return true
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        throw new Error('Connection timeout - check if Phyphox is running and accessible')
      } else if (err.message.includes('Failed to fetch')) {
        throw new Error('Cannot reach server - check IP address and WiFi connection')
      } else {
        throw new Error(err.message)
      }
    }
  }, [])

  const handleLiveModeToggle = useCallback(async () => {
    const newState = !isLiveModeActive
    
    if (newState) {
      setConnectionStatus('checking')
      
      try {
        await testConnection(serverUrl)
        
        // Store server URL for later use
        localStorage.setItem('phyphox-server-url', serverUrl)
        
        setIsLiveModeActive(true)
        setConnectionStatus('connected')
        onServerToggle(true)
        
        console.log('[ControlPanel] Live mode activated with server:', serverUrl)
        console.log('[ControlPanel] Live recording will be auto-created and selected')
        
      } catch (error) {
        setIsLiveModeActive(false)
        setConnectionStatus('disconnected')
        onServerToggle(false)
        console.error('[ControlPanel] Live mode connection failed:', error)
      }
    } else {
      setIsLiveModeActive(false)
      setConnectionStatus('disconnected')
      onServerToggle(false)
      
      console.log('[ControlPanel] Live mode deactivated')
    }
  }, [isLiveModeActive, serverUrl, testConnection, onServerToggle])

  const folders = [
    {
      id: 'selection',
      name: '🧗 Data & Live',
      icon: '🧗',
      controls: []
    },
    {
      id: 'presets',
      name: '🎯 Presets',
      icon: '🎯',
      controls: []
    },
    {
      id: 'moveDetection',
      name: '🔍 Move Detection',
      icon: '🔍',
      controls: [
        { key: 'moveThreshold', name: 'Move Threshold', min: 0.5, max: 3.0, step: 0.1 },
        { key: 'minStillDuration', name: 'Min Still Duration', min: 0.2, max: 3.0, step: 0.05 },
        { key: 'minMoveDuration', name: 'Min Move Duration', min: 0.2, max: 3.0, step: 0.1 },
        { key: 'maxMoveDuration', name: 'Max Move Duration', min: 1.0, max: 8.0, step: 0.1 },
        { key: 'maxMoveSequence', name: 'Max Move Sequence', min: 1, max: 4, step: 1 }
      ]
    },
    {
      id: 'basics',
      name: '⚙️ Basics',
      icon: '⚙️',
      controls: [
        { key: 'baseRadius', name: 'Overall Radius', min: 0.1, max: 2.0, step: 0.05 },
        { key: 'dynamicsMultiplier', name: 'Dynamics Effect', min: 0.5, max: 15.0, step: 0.1 },
        { key: 'combinedSize', name: 'Overall Size', min: 0.5, max: 5.0, step: 0.1 },
        { key: 'ringCount', name: 'Ring Count', min: 10, max: 150, step: 1 },
        { key: 'ringSpacing', name: 'Ring Spacing', min: 0.0, max: 0.05, step: 0.001 }
      ]
    },
    {
      id: 'visuals',
      name: '🎨 Visuals',
      icon: '🎨',
      controls: [
        { key: 'opacity', name: 'Line Opacity', min: 0.1, max: 1.0, step: 0.05 },
        { key: 'lineWidth', name: 'Line Thickness', min: 0.1, max: 3.0, step: 0.1 },
        { key: 'centerFade', name: 'Center Fade', min: 0.0, max: 1.0, step: 0.05 },
        { key: 'depthEffect', name: '3D Depth Effect', min: 0.0, max: 8.0, step: 0.1 },
        { key: 'organicNoise', name: 'Organic Noise', min: 0.0, max: 2.0, step: 0.01 }
      ],
      colorControls: [
        { key: 'moveColor', name: 'Move Color' },
        { key: 'cruxColor', name: 'Crux Color' }
      ]
    },
    {
      id: 'effects',
      name: '🌊 Dynamic Effects',
      icon: '🌊',
      controls: [
        { key: 'cruxEmphasis', name: 'Crux Emphasis', min: 0.5, max: 50.0, step: 0.1 }
      ]
    },
    {
      id: 'animation',
      name: '🔄 Animation',
      icon: '🔄',
      controls: [
        { key: 'rotationSpeed', name: 'Rotation Speed', min: 0.0, max: 2.0, step: 0.1 },
        { key: 'liquidSpeed', name: 'Animation Speed', min: 0.0, max: 10.0, step: 0.05 },
        { key: 'liquidSize', name: 'Liquid Size', min: 0.1, max: 5.0, step: 0.1 },
        { key: 'attemptWaveSpeed', name: 'Attempt Wave Speed', min: 0.0, max: 5.0, step: 0.1 },
        { key: 'attemptWaveDirection', name: 'Wave Direction', min: -2.0, max: 2.0, step: 0.1 },
        { key: 'attemptWaveIntensity', name: 'Wave Animation Intensity', min: 0.0, max: 3.0, step: 0.1 }
      ]
    },
    {
      id: 'moveLines',
      name: '📍 Move Lines',
      icon: '📍',
      controls: [
        { key: 'moveLineLength', name: 'Line Length', min: 0.5, max: 10.0, step: 0.1 },
        { key: 'moveLineOpacity', name: 'Line Opacity', min: 0.0, max: 1.0, step: 0.05 },
        { key: 'moveLineWidth', name: 'Line Width', min: 0.5, max: 5.0, step: 0.1 }
      ],
      toggleControls: [
        { key: 'showMovePositionLines', name: 'Show Move Position Lines' }
      ]
    },
    {
      id: 'attempts',
      name: '🎯 Attempts',
      icon: '🎯',
      controls: [
        { key: 'maxAttempts', name: 'Number of Attempts', min: 10, max: 200, step: 5 },
        { key: 'attemptOpacity', name: 'Attempt Opacity', min: 0.0, max: 1.0, step: 0.05 },
        { key: 'attemptWaviness', name: 'Line Waviness', min: 0.0, max: 0.1, step: 0.001 },
        { key: 'attemptThickness', name: 'Line Thickness', min: 0.1, max: 2.0, step: 0.1 },
        { key: 'attemptRadius', name: 'Max Radius', min: 0.5, max: 3.0, step: 0.05 },
        { key: 'attemptDotZOffsetMax', name: 'Dot Z Offset', min: 0.0, max: 2.0, step: 0.05 },
        { key: 'attemptFadeStrength', name: 'Fade Effect', min: 0.0, max: 3.0, step: 0.1 }
      ]
    }
  ]

  // Define preset configurations based on user's dialed-in defaults
  const presets = {
    // Current settings saved as "Current" preset
    current: {
      name: 'Current Settings',
      description: 'Your current configuration',
      settings: {
        // Basics
        baseRadius: 0.50,
        dynamicsMultiplier: 13.7,
        combinedSize: 2.3,
        ringCount: 26,
        ringSpacing: 0.004,
        
        // Visuals
        opacity: 1.00,
        lineWidth: 0.4,
        centerFade: 0.80,
        depthEffect: 0.5,
        organicNoise: 1.52,
        moveColor: '#10b981',
        cruxColor: '#ec4899',
        
        // Dynamic Effects
        cruxEmphasis: 0.5,
        
        // Animation
        rotationSpeed: 0.0,
        liquidSpeed: 3.20,
        liquidSize: 0.8,
        
        // Attempt Wave Animation
        attemptWaveSpeed: 0.7,
        attemptWaveDirection: 1.1,
        attemptWaveIntensity: 1.6,
        
        // Move Position Lines
        showMovePositionLines: true,
        moveLineLength: 3.2,
        moveLineOpacity: 0.80,
        moveLineWidth: 2.0,
        
        // Attempts
        showAttemptLines: true,
        maxAttempts: 120.0,
        attemptOpacity: 0.45,
        attemptWaviness: 0.030,
        attemptThickness: 0.5,
        attemptRadius: 2.40,
        attemptDotZOffsetMax: 1.15,
        attemptFadeStrength: 0.7
      }
    },
    
    // 1. Default - Your base settings
    default: {
      name: 'Default',
      description: 'Your perfect base configuration',
      settings: {
        baseRadius: 0.50, dynamicsMultiplier: 13.7, combinedSize: 2.3, ringCount: 26, ringSpacing: 0.004,
        opacity: 1.00, lineWidth: 0.4, centerFade: 0.80, depthEffect: 0.5, organicNoise: 1.52,
        moveColor: '#10b981', cruxColor: '#ec4899', cruxEmphasis: 0.5,
        rotationSpeed: 0.0, liquidSpeed: 3.20, liquidSize: 0.8,
        attemptWaveSpeed: 0.7, attemptWaveDirection: 1.1, attemptWaveIntensity: 1.6,
        showMovePositionLines: true, moveLineLength: 3.2, moveLineOpacity: 0.80, moveLineWidth: 2.0,
        showAttemptLines: true, maxAttempts: 120.0, attemptOpacity: 0.45, attemptWaviness: 0.030,
        attemptThickness: 0.5, attemptRadius: 2.40, attemptDotZOffsetMax: 1.15, attemptFadeStrength: 0.7
      }
    },
    
    // 2. Neon Glow - Electric colors
    neonGlow: {
      name: 'Neon Glow',
      description: 'Electric neon vibes',
      settings: {
        baseRadius: 0.50, dynamicsMultiplier: 13.7, combinedSize: 2.3, ringCount: 26, ringSpacing: 0.004,
        opacity: 1.00, lineWidth: 0.6, centerFade: 0.60, depthEffect: 0.8, organicNoise: 1.52,
        moveColor: '#00ffff', cruxColor: '#ff00ff', cruxEmphasis: 0.8,
        rotationSpeed: 0.0, liquidSpeed: 4.0, liquidSize: 1.0,
        attemptWaveSpeed: 1.2, attemptWaveDirection: 1.5, attemptWaveIntensity: 2.0,
        showMovePositionLines: true, moveLineLength: 3.2, moveLineOpacity: 0.90, moveLineWidth: 2.5,
        showAttemptLines: true, maxAttempts: 120.0, attemptOpacity: 0.60, attemptWaviness: 0.040,
        attemptThickness: 0.7, attemptRadius: 2.40, attemptDotZOffsetMax: 1.15, attemptFadeStrength: 0.9
      }
    },
    
    // 3. Minimal Clean - Reduced everything
    minimalClean: {
      name: 'Minimal Clean',
      description: 'Clean and simple',
      settings: {
        baseRadius: 0.60, dynamicsMultiplier: 10.0, combinedSize: 1.8, ringCount: 20, ringSpacing: 0.006,
        opacity: 0.80, lineWidth: 0.3, centerFade: 0.90, depthEffect: 0.2, organicNoise: 0.5,
        moveColor: '#10b981', cruxColor: '#ec4899', cruxEmphasis: 0.3,
        rotationSpeed: 0.0, liquidSpeed: 2.0, liquidSize: 0.4,
        attemptWaveSpeed: 0.3, attemptWaveDirection: 0.8, attemptWaveIntensity: 0.8,
        showMovePositionLines: true, moveLineLength: 2.5, moveLineOpacity: 0.60, moveLineWidth: 1.5,
        showAttemptLines: true, maxAttempts: 80.0, attemptOpacity: 0.30, attemptWaviness: 0.015,
        attemptThickness: 0.3, attemptRadius: 2.00, attemptDotZOffsetMax: 0.8, attemptFadeStrength: 0.5
      }
    },
    
    // 4. Dramatic High - Everything cranked
    dramaticHigh: {
      name: 'Dramatic High',
      description: 'Maximum intensity',
      settings: {
        baseRadius: 0.40, dynamicsMultiplier: 18.0, combinedSize: 2.8, ringCount: 35, ringSpacing: 0.003,
        opacity: 1.00, lineWidth: 0.6, centerFade: 0.60, depthEffect: 1.0, organicNoise: 2.5,
        moveColor: '#ff4444', cruxColor: '#ffaa00', cruxEmphasis: 1.2,
        rotationSpeed: 0.0, liquidSpeed: 5.0, liquidSize: 1.2,
        attemptWaveSpeed: 1.5, attemptWaveDirection: 2.0, attemptWaveIntensity: 2.5,
        showMovePositionLines: true, moveLineLength: 4.0, moveLineOpacity: 1.00, moveLineWidth: 3.0,
        showAttemptLines: true, maxAttempts: 150.0, attemptOpacity: 0.70, attemptWaviness: 0.050,
        attemptThickness: 0.8, attemptRadius: 3.00, attemptDotZOffsetMax: 1.5, attemptFadeStrength: 1.0
      }
    },
    
    // 5. Ocean Waves - Blue theme
    oceanWaves: {
      name: 'Ocean Waves',
      description: 'Deep blue ocean vibes',
      settings: {
        baseRadius: 0.50, dynamicsMultiplier: 13.7, combinedSize: 2.3, ringCount: 26, ringSpacing: 0.004,
        opacity: 0.90, lineWidth: 0.4, centerFade: 0.70, depthEffect: 0.8, organicNoise: 2.0,
        moveColor: '#0ea5e9', cruxColor: '#06b6d4', cruxEmphasis: 0.6,
        rotationSpeed: 0.0, liquidSpeed: 2.5, liquidSize: 1.5,
        attemptWaveSpeed: 0.5, attemptWaveDirection: 0.8, attemptWaveIntensity: 1.2,
        showMovePositionLines: true, moveLineLength: 3.2, moveLineOpacity: 0.70, moveLineWidth: 2.0,
        showAttemptLines: true, maxAttempts: 120.0, attemptOpacity: 0.40, attemptWaviness: 0.025,
        attemptThickness: 0.4, attemptRadius: 2.40, attemptDotZOffsetMax: 1.15, attemptFadeStrength: 0.6
      }
    },
    
    // 6. Fire Storm - Red/orange theme
    fireStorm: {
      name: 'Fire Storm',
      description: 'Blazing red intensity',
      settings: {
        baseRadius: 0.45, dynamicsMultiplier: 15.0, combinedSize: 2.5, ringCount: 30, ringSpacing: 0.003,
        opacity: 1.00, lineWidth: 0.5, centerFade: 0.50, depthEffect: 0.7, organicNoise: 1.8,
        moveColor: '#f97316', cruxColor: '#ef4444', cruxEmphasis: 0.9,
        rotationSpeed: 0.0, liquidSpeed: 4.5, liquidSize: 0.9,
        attemptWaveSpeed: 1.0, attemptWaveDirection: 1.3, attemptWaveIntensity: 1.8,
        showMovePositionLines: true, moveLineLength: 3.5, moveLineOpacity: 0.85, moveLineWidth: 2.2,
        showAttemptLines: true, maxAttempts: 130.0, attemptOpacity: 0.50, attemptWaviness: 0.035,
        attemptThickness: 0.6, attemptRadius: 2.60, attemptDotZOffsetMax: 1.2, attemptFadeStrength: 0.8
      }
    },
    
    // 7. Forest Deep - Dark greens
    forestDeep: {
      name: 'Forest Deep',
      description: 'Deep forest greens',
      settings: {
        baseRadius: 0.50, dynamicsMultiplier: 13.7, combinedSize: 2.3, ringCount: 26, ringSpacing: 0.004,
        opacity: 0.85, lineWidth: 0.5, centerFade: 0.85, depthEffect: 0.8, organicNoise: 2.2,
        moveColor: '#059669', cruxColor: '#065f46', cruxEmphasis: 0.6,
        rotationSpeed: 0.0, liquidSpeed: 2.2, liquidSize: 1.1,
        attemptWaveSpeed: 0.6, attemptWaveDirection: 0.9, attemptWaveIntensity: 1.3,
        showMovePositionLines: true, moveLineLength: 3.2, moveLineOpacity: 0.75, moveLineWidth: 2.0,
        showAttemptLines: true, maxAttempts: 120.0, attemptOpacity: 0.40, attemptWaviness: 0.035,
        attemptThickness: 0.6, attemptRadius: 2.40, attemptDotZOffsetMax: 1.15, attemptFadeStrength: 0.7
      }
    },
    
    // 8. Lava Flow - Molten theme
    lavaFlow: {
      name: 'Lava Flow',
      description: 'Molten lava patterns',
      settings: {
        baseRadius: 0.48, dynamicsMultiplier: 14.5, combinedSize: 2.4, ringCount: 28, ringSpacing: 0.004,
        opacity: 0.95, lineWidth: 0.5, centerFade: 0.60, depthEffect: 0.8, organicNoise: 2.0,
        moveColor: '#dc2626', cruxColor: '#991b1b', cruxEmphasis: 0.8,
        rotationSpeed: 0.0, liquidSpeed: 3.5, liquidSize: 1.0,
        attemptWaveSpeed: 0.8, attemptWaveDirection: 1.2, attemptWaveIntensity: 1.5,
        showMovePositionLines: true, moveLineLength: 3.3, moveLineOpacity: 0.85, moveLineWidth: 2.1,
        showAttemptLines: true, maxAttempts: 125.0, attemptOpacity: 0.50, attemptWaviness: 0.038,
        attemptThickness: 0.6, attemptRadius: 2.50, attemptDotZOffsetMax: 1.2, attemptFadeStrength: 0.8
      }
    },
    
    // 9. Crystal Matrix - Geometric
    crystalMatrix: {
      name: 'Crystal Matrix',
      description: 'Geometric crystal patterns',
      settings: {
        baseRadius: 0.50, dynamicsMultiplier: 13.7, combinedSize: 2.3, ringCount: 32, ringSpacing: 0.003,
        opacity: 1.00, lineWidth: 0.3, centerFade: 0.90, depthEffect: 0.4, organicNoise: 0.3,
        moveColor: '#06b6d4', cruxColor: '#0891b2', cruxEmphasis: 0.5,
        rotationSpeed: 0.0, liquidSpeed: 3.0, liquidSize: 0.5,
        attemptWaveSpeed: 0.9, attemptWaveDirection: 1.0, attemptWaveIntensity: 1.2,
        showMovePositionLines: true, moveLineLength: 3.2, moveLineOpacity: 0.90, moveLineWidth: 1.8,
        showAttemptLines: true, maxAttempts: 120.0, attemptOpacity: 0.45, attemptWaviness: 0.015,
        attemptThickness: 0.4, attemptRadius: 2.40, attemptDotZOffsetMax: 1.15, attemptFadeStrength: 0.7
      }
    }
  }

  // Handle preset application
  const applyPreset = useCallback((presetKey: keyof typeof presets) => {
    const preset = presets[presetKey]
    if (preset) {
      console.log(`Applying preset: ${preset.name}`)
      const newSettings = { ...visualizerSettings, ...preset.settings }
      setVisualizerSettings(newSettings)
      updateVisualizerSettings(newSettings)
    }
  }, [visualizerSettings, setVisualizerSettings])

  // Save current settings as a preset (updates the current preset)
  const saveCurrentAsPreset = useCallback(() => {
    presets.current.settings = { ...visualizerSettings }
    console.log('Current settings saved as preset')
  }, [visualizerSettings])

  const ControlSlider = ({ control }: { control: any }) => {
    // Read current value directly from global store instead of local state
    const currentValue = Number(state.visualizerSettings[control.key as keyof typeof state.visualizerSettings]);
    
    // Local state for immediate UI feedback
    const [localValue, setLocalValue] = useState(currentValue);
    
    // Sync local value with global store when settings change
    useEffect(() => {
      setLocalValue(currentValue);
    }, [currentValue]);

    const handleValueChange = (value: number) => {
      setLocalValue(value); // Update local state immediately for UI feedback
      handleSettingChange(control.key, value); // Update parent state (debounced)
    };

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-cyan-400">{control.name}</label>
          <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/40">
            {localValue.toFixed(control.step < 0.01 ? 3 : control.step < 0.1 ? 2 : 1)}
          </span>
        </div>
        <ElasticSlider
          key={`${control.key}-${currentValue}`}
          defaultValue={currentValue}
          startingValue={control.min}
          maxValue={control.max}
          isStepped={control.step > 0}
          stepSize={control.step}
          className="w-full"
          onChange={handleValueChange}
        />
      </div>
    );
  };

  const ColorPicker = ({ control }: { control: { key: string; name: string } }) => {
    const currentColor = visualizerSettings[control.key as keyof typeof visualizerSettings] as string;

    const handleColorChange = (color: string) => {
      handleSettingChange(control.key, color);
    };

    const predefinedColors = [
      '#22d3ee', // Cyan
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#10b981', // Emerald
      '#8b5cf6', // Violet
      '#f97316', // Orange
      '#06b6d4', // Sky
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#6366f1', // Indigo
      '#14b8a6', // Teal
      '#f59e0b', // Yellow
    ];

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-cyan-400">{control.name}</label>
          <div 
            className="w-8 h-6 rounded border border-cyan-400/40"
            style={{ backgroundColor: currentColor }}
          />
        </div>
        
        {/* Color Input */}
        <div className="mb-3">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-10 rounded-lg border border-cyan-400/40 bg-black/50 cursor-pointer"
          />
        </div>
        
        {/* Predefined Colors */}
        <div className="grid grid-cols-6 gap-2">
          {predefinedColors.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-8 h-8 rounded border-2 transition-all ${
                currentColor === color 
                  ? 'border-cyan-400 scale-110' 
                  : 'border-gray-600 hover:border-cyan-400/60'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Listen for new boulder saves
  useEffect(() => {
    const handleBoulderSaved = (event: CustomEvent) => {
      console.log('[ControlPanel] New boulder saved, refreshing list')
      refreshBoulders()
      
      // If it's a live recording, auto-select it
      const boulder = event.detail?.boulder
      if (boulder && boulder.source === 'live') {
        console.log('[ControlPanel] Auto-selecting live recording:', boulder.name)
        setTimeout(() => {
          selectBoulder(boulder.id)
          onBoulderChange(boulder.id)
        }, 500) // Small delay to ensure boulder list is refreshed
      }
    }
    
    window.addEventListener('boulderSaved', handleBoulderSaved as EventListener)
    return () => window.removeEventListener('boulderSaved', handleBoulderSaved as EventListener)
  }, [refreshBoulders, selectBoulder, onBoulderChange])

  return (
    <div className={`fixed top-20 right-6 bottom-6 z-50 transition-all duration-300 ${!isVisible ? 'translate-x-full' : ''}`}>
      {/* Toggle button */}
      <button
        onClick={() => {
          const newVisibility = !isVisible
          setIsVisible(newVisibility)
          onVisibilityChange(newVisibility)
        }}
        className="absolute -left-14 top-6 bg-black/70 hover:bg-black/90 text-cyan-400 p-3 rounded-l-xl border border-cyan-400/40 border-r-0 transition-all backdrop-blur-sm"
      >
        <SettingsIcon size={20} />
      </button>

      {/* Control panel */}
      <div className="w-96 h-full bg-black/70 border border-cyan-400/40 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm flex flex-col">
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border-b border-red-400/40 p-4">
            <div className="text-red-400 text-sm">⚠️ {error}</div>
          </div>
        )}

        {/* Header with View Switcher and CSV Selector */}
        <div className="p-4 border-b border-cyan-400/20 bg-black/50">
          {/* Header row with title and refresh */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-cyan-400 font-bold text-xl">Control Center</h2>
            </div>
            <div className="flex items-center space-x-2">
              {/* Auto-save indicator */}
              <div className={`transition-all duration-500 ${autoSaveBlinking ? 'animate-pulse scale-125 text-green-300' : 'opacity-30 text-green-500'}`}>
                <div className="text-base">💾</div>
              </div>
              <button
                onClick={refreshBoulders}
                className="px-3 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 rounded-lg transition-all text-sm font-medium"
                disabled={isLoading}
              >
                <RefreshCwIcon size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* View Switcher */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => {
                if (currentView === 'visualizer') {
                  // Skip 'simple' mode - go directly from 3d to statistics
                  onVisualizationModeChange(visualizationMode === '3d' ? 'statistics' : '3d')
                } else {
                  // Switch to visualizer view
                  onViewChange('visualizer')
                }
              }}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                currentView === 'visualizer'
                  ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                  : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10'
              }`}
            >
              {currentView === 'visualizer' 
                ? (visualizationMode === '3d' ? '🧗 3D View' : '📊 Statistics')
                : '🧗 Visualizer'
              }
            </button>
            <button
              onClick={() => {
                onViewChange('add-boulder')
                // Collapse the control panel when switching to add boulder view
                setIsVisible(false)
                onVisibilityChange(false)
              }}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                currentView === 'add-boulder'
                  ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                  : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10'
              }`}
            >
              ➕ Add Boulder
            </button>
          </div>
          
          {/* CSV Data Selector */}
          <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">Current Data</label>
            <select
              value={selectedBoulder?.id.toString() || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onBoulderChange(parseInt(e.target.value))
                }
              }}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-black/50 border border-cyan-400/40 rounded-xl text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none disabled:opacity-50 backdrop-blur-sm transition-all text-sm"
            >
              <option value="" disabled>
                {isLoading ? "Loading..." : "Select CSV..."}
              </option>
              {boulders.map((boulder) => (
                <option key={boulder.id} value={boulder.id.toString()}>
                  {boulder.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Folder tabs */}
        <div className="flex border-b border-cyan-400/20 bg-black/50">
          {folders
            .filter(folder => {
              // In statistics view, only show selection and moveDetection tabs
              if (visualizationMode === 'statistics') {
                return folder.id === 'selection' || folder.id === 'moveDetection'
              }
              // In other views, show all tabs
              return true
            })
            .map((folder) => (
            <button
              key={folder.id}
              onClick={() => setCurrentFolder(currentFolder === folder.id ? null : folder.id)}
              className={`flex-1 px-3 py-4 text-sm font-medium transition-all border-r border-cyan-400/20 last:border-r-0 ${
                currentFolder === folder.id
                  ? 'bg-cyan-400/20 text-cyan-400'
                  : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10'
              }`}
            >
              <div className="text-center">
                <div className="text-base mb-1">{folder.icon}</div>
                <div className="hidden sm:block text-xs">{folder.name.replace(/^.+ /, '')}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Control content - scrollable */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
          {currentFolder === 'selection' && (
            <div className="space-y-6">
              {/* Statistics - Current Raw Data */}
              {selectedBoulder && (
                <div>
                  <h4 className="text-cyan-400 font-medium mb-4">Current: {selectedBoulder.name}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div className="text-lg font-bold text-blue-400">{stats.moveCount}</div>
                      <div className="text-xs text-gray-400">Moves</div>
                    </div>
                    <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div className="text-lg font-bold text-yellow-400">{stats.duration.toFixed(1)}s</div>
                      <div className="text-xs text-gray-400">Duration</div>
                    </div>
                    <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div className="text-lg font-bold text-red-400">{stats.maxAccel.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">Max (m/s²)</div>
                    </div>
                    <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-3 text-center backdrop-blur-sm">
                      <div className="text-lg font-bold text-green-400">{stats.avgAccel.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">Avg (m/s²)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Mode Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-cyan-400">Connect to Live Server</label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' 
                          ? 'bg-green-400' 
                          : connectionStatus === 'checking'
                          ? 'bg-yellow-400 animate-pulse'
                          : 'bg-red-400'
                      }`} 
                    />
                    <span className="text-xs text-gray-400">
                      {connectionStatus === 'connected' ? 'Connected' : 
                       connectionStatus === 'checking' ? 'Connecting...' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleLiveModeToggle}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all mb-4 ${
                    isLiveModeActive
                      ? 'bg-green-500/80 hover:bg-green-500 text-white'
                      : 'bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/40'
                  }`}
                >
                  {isLiveModeActive ? 'Disconnect Live Mode' : 'Go Live Mode'}
                </button>

                {/* Server Selection - only show when not connected */}
                {!isLiveModeActive && (
                  <div>
                    <label className="block text-sm font-medium text-cyan-400 mb-3">Server</label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://10.237.1.101"
                      className="w-full px-4 py-3 bg-black/50 border border-cyan-400/40 rounded-xl text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none text-sm backdrop-blur-sm transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Presets Tab */}
          {currentFolder === 'presets' && (
            <div className="space-y-6">
              {/* Save Current Settings */}
              <div>
                <h4 className="text-cyan-400 font-medium mb-4">Save Current Settings</h4>
                <button
                  onClick={saveCurrentAsPreset}
                  className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-400/40 rounded-xl font-medium transition-all"
                >
                  💾 Save Current as Preset
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  This will update the "Current Settings" preset with your current configuration.
                </p>
              </div>

              {/* Preset Buttons */}
              <div>
                <h4 className="text-cyan-400 font-medium mb-4">Apply Presets</h4>
                <div className="space-y-3">
                  {Object.entries(presets).map(([key, preset]) => (
                    <div key={key} className="space-y-2">
                      <button
                        onClick={() => applyPreset(key as keyof typeof presets)}
                        className="w-full px-4 py-3 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/40 rounded-xl font-medium transition-all text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{preset.name}</div>
                            <div className="text-xs text-gray-400">{preset.description}</div>
                          </div>
                          <div className="text-lg">
                            {key === 'current' && '💾'}
                            {key === 'default' && '⚙️'}
                            {key === 'neonGlow' && '⚡'}
                            {key === 'minimalClean' && '✨'}
                            {key === 'dramaticHigh' && '🔥'}
                            {key === 'oceanWaves' && '🌊'}
                            {key === 'fireStorm' && '🌋'}
                            {key === 'forestDeep' && '🌲'}
                            {key === 'lavaFlow' && '🌋'}
                            {key === 'crystalMatrix' && '💎'}
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Processing Effects */}
              <div>
                <h4 className="text-cyan-400 font-medium mb-4">🎨 Post-Processing</h4>
                <div className="space-y-4">
                  {/* Black & White Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-cyan-400">Black & White</label>
                      <button
                        onClick={() => {
                          const newValue = !visualizerSettings.postProcessingBW
                          handleSettingChange('postProcessingBW', newValue)
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          visualizerSettings.postProcessingBW ? 'bg-cyan-400' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            visualizerSettings.postProcessingBW ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {visualizerSettings.postProcessingBW && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-400">Intensity</span>
                          <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/40">
                            {(visualizerSettings.postProcessingBWIntensity || 50)}%
                          </span>
                        </div>
                        <ElasticSlider
                          defaultValue={visualizerSettings.postProcessingBWIntensity || 50}
                          startingValue={0}
                          maxValue={100}
                          isStepped={true}
                          stepSize={1}
                          className="w-full"
                          onChange={(value) => handleSettingChange('postProcessingBWIntensity', value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Contrast Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-cyan-400">High Contrast</label>
                      <button
                        onClick={() => {
                          const newValue = !visualizerSettings.postProcessingContrast
                          handleSettingChange('postProcessingContrast', newValue)
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          visualizerSettings.postProcessingContrast ? 'bg-cyan-400' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            visualizerSettings.postProcessingContrast ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {visualizerSettings.postProcessingContrast && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-400">Intensity</span>
                          <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/40">
                            {(visualizerSettings.postProcessingContrastIntensity || 50)}%
                          </span>
                        </div>
                        <ElasticSlider
                          defaultValue={visualizerSettings.postProcessingContrastIntensity || 50}
                          startingValue={0}
                          maxValue={100}
                          isStepped={true}
                          stepSize={1}
                          className="w-full"
                          onChange={(value) => handleSettingChange('postProcessingContrastIntensity', value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bloom/Glow Effect */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-cyan-400">Bloom Glow</label>
                      <button
                        onClick={() => {
                          const newValue = !visualizerSettings.postProcessingBloom
                          handleSettingChange('postProcessingBloom', newValue)
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          visualizerSettings.postProcessingBloom ? 'bg-cyan-400' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            visualizerSettings.postProcessingBloom ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {visualizerSettings.postProcessingBloom && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-400">Intensity</span>
                          <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/40">
                            {(visualizerSettings.postProcessingBloomIntensity || 50)}%
                          </span>
                        </div>
                        <ElasticSlider
                          defaultValue={visualizerSettings.postProcessingBloomIntensity || 50}
                          startingValue={0}
                          maxValue={100}
                          isStepped={true}
                          stepSize={1}
                          className="w-full"
                          onChange={(value) => handleSettingChange('postProcessingBloomIntensity', value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset Info */}
              <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-4">
                <h5 className="text-cyan-400 font-medium mb-2">About Presets (10 Total)</h5>
                <div className="text-xs text-gray-400 space-y-1">
                  <div><strong>🎯 Core:</strong> Default, Current Settings</div>
                  <div><strong>🎨 Colors:</strong> Neon Glow, Ocean Waves, Fire Storm, Forest Deep</div>
                  <div><strong>⚡ Energy:</strong> Dramatic High</div>
                  <div><strong>🔮 Themes:</strong> Lava Flow, Crystal Matrix</div>
                  <div><strong>✨ Clean:</strong> Minimal Clean</div>
                </div>
              </div>
            </div>
          )}

          {/* Attempts Settings */}
          {currentFolder === 'attempts' && (
            <div className="space-y-6">
              {/* Attempts Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-cyan-400">Show Attempt Lines</label>
                <button
                  onClick={() => {
                    const newValue = !visualizerSettings.showAttemptLines
                    handleSettingChange('showAttemptLines', newValue)
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    visualizerSettings.showAttemptLines ? 'bg-cyan-400' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      visualizerSettings.showAttemptLines ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Attempt Controls - only show when enabled */}
              {visualizerSettings.showAttemptLines && (
                <div className="space-y-4">
                  {folders.find(f => f.id === 'attempts')?.controls.map((control) => (
                    <ControlSlider key={control.key} control={control} />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Move Lines Settings */}
          {currentFolder === 'moveLines' && (
            <div className="space-y-6">
              {/* Move Lines Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-cyan-400">Show Move Position Lines</label>
                <button
                  onClick={() => {
                    const newValue = !visualizerSettings.showMovePositionLines
                    handleSettingChange('showMovePositionLines', newValue)
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    visualizerSettings.showMovePositionLines ? 'bg-cyan-400' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      visualizerSettings.showMovePositionLines ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Move Line Controls - only show when enabled */}
              {visualizerSettings.showMovePositionLines && (
                <div className="space-y-4">
                  {folders.find(f => f.id === 'moveLines')?.controls.map((control) => (
                    <ControlSlider key={control.key} control={control} />
                  ))}
                </div>
              )}
              
              {/* Info about move lines */}
              <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-4">
                <h5 className="text-cyan-400 font-medium mb-2">Move Position Lines</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong>Green line:</strong> Start position (12 o'clock)</li>
                  <li>• <strong>Colored lines:</strong> Move positions around circle</li>
                  <li>• <strong>Crux moves:</strong> Use crux color</li>
                  <li>• <strong>Dots:</strong> Show exact move positions</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Move Detection Settings */}
          {currentFolder === 'moveDetection' && (
            <div className="space-y-6">
              {/* Data Cropping Controls */}
              <div className="bg-orange-400/10 border border-orange-400/40 rounded-lg p-4">
                <h5 className="text-orange-400 font-medium mb-3">✂️ Data Cropping</h5>
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    {/* Start and End Time inputs */}
                    <div className="flex gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Start (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          className="w-20 px-2 py-1 bg-black/50 border border-orange-400/40 rounded text-orange-400 text-xs focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">End (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="10.0"
                          className="w-20 px-2 py-1 bg-black/50 border border-orange-400/40 rounded text-orange-400 text-xs focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    {/* Preview and Apply buttons */}
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 bg-orange-400/20 border border-orange-400/40 text-orange-400 rounded font-medium transition-all hover:bg-orange-400/30 text-xs"
                      >
                        👁️ Preview
                      </button>
                      <button
                        className="px-2 py-1 bg-red-400/20 border border-red-400/40 text-red-400 rounded font-medium transition-all hover:bg-red-400/30 text-xs"
                      >
                        ✂️ Apply
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-200">
                    💡 Drag on graph to select range. Heavy smoothing auto-applied.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {folders.find(f => f.id === 'moveDetection')?.controls.map((control) => (
                  <ControlSlider key={control.key} control={control} />
                ))}
              </div>
              
              <div className="bg-cyan-400/10 border border-cyan-400/40 rounded-lg p-4">
                <h5 className="text-cyan-400 font-medium mb-2">Move Detection Algorithm</h5>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• <strong>Move Threshold:</strong> Acceleration above this = potential move</li>
                  <li>• <strong>Everything is either:</strong> 🟢 Move or ⬜ Stillness (rest)</li>
                  <li>• <strong>Min Still Duration:</strong> Must hold still this long before/after moves</li>
                  <li>• <strong>Min Move Duration:</strong> Movement must last this long to count</li>
                  <li>• <strong>Max Move Duration:</strong> Longer movements get split into multiple moves</li>
                  <li>• <strong>Max Move Sequence:</strong> Max consecutive moves without rest</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Other Settings Folders */}
          {currentFolder && currentFolder !== 'selection' && currentFolder !== 'presets' && currentFolder !== 'attempts' && currentFolder !== 'moveLines' && currentFolder !== 'moveDetection' && (
            <div className="space-y-4">
              {/* Regular Controls */}
              {folders.find(f => f.id === currentFolder)?.controls.map((control) => (
                <ControlSlider key={control.key} control={control} />
              ))}
              
              {/* Color Controls (only for visuals tab) */}
              {currentFolder === 'visuals' && 
                folders.find(f => f.id === 'visuals')?.colorControls?.map((control) => (
                  <ColorPicker key={control.key} control={control} />
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 