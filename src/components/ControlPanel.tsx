import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCwIcon, SettingsIcon, WifiIcon, WifiOffIcon } from 'lucide-react'
import type { BoulderData } from '../utils/csvLoader'
import { useBoulderConfig } from '../context/BoulderConfigContext'
import ElasticSlider from "./ui/ElasticSlider"
import { useCSVData } from '../hooks/useCSVData'
import { debounce } from '../utils/debounce'
import { 
  updateSelectedBoulder, 
  updateProcessedMoves, 
  updateThreshold, 
  updateVisualizerSettings,
  detectAndProcessMoves,
  getVisualizationState
} from '../store/visualizationStore'

interface ControlPanelProps {
  // View management
  currentView: 'visualizer' | 'add-boulder'
  onViewChange: (view: 'visualizer' | 'add-boulder') => void
  
  // Visualization mode (within visualizer view)
  visualizationMode: '3d' | 'statistics'
  onVisualizationModeChange: (mode: '3d' | 'statistics') => void
  
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

// Move detection function for statistics
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
  const [serverUrl, setServerUrl] = useState('http://192.168.1.36')
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected')
  
  // Scroll position ref to maintain scroll position
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  
  // Add debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get current state from global store
  const state = getVisualizationState()
  const selectedBoulderId = state.selectedBoulder?.id
  
  // Notify parent of initial visibility state
  useEffect(() => {
    onVisibilityChange(isVisible)
  }, []) // Only run on mount
  
  const servers: ServerOption[] = [
    { name: 'Server 1 (192.168.1.36)', url: 'http://192.168.1.36' },
    { name: 'Server 2 (10.237.1.101)', url: 'http://10.237.1.101' },
    { name: 'Server 3 (192.168.1.100)', url: 'http://192.168.1.100' },
    { name: 'Server 4 (172.20.10.1)', url: 'http://172.20.10.1' },
    { name: 'Server 5 (10.224.1.221)', url: 'http://10.224.1.221' }
  ]

  const currentThreshold = selectedBoulder ? getThreshold(selectedBoulder.id) : 12.0

  // Calculate statistics
  const stats = useMemo((): StatData => {
    if (!selectedBoulder?.csvData) return {
      maxAccel: 0,
      avgAccel: 0,
      moveCount: 0,
      duration: 0,
      sampleCount: 0
    };
    
    const moves = detectMoves(selectedBoulder.csvData.time, selectedBoulder.csvData.absoluteAcceleration, currentThreshold);
    
    return {
      maxAccel: selectedBoulder.csvData.maxAcceleration,
      avgAccel: selectedBoulder.csvData.avgAcceleration,
      moveCount: moves.length,
      duration: selectedBoulder.csvData.duration,
      sampleCount: selectedBoulder.csvData.sampleCount
    };
  }, [selectedBoulder, currentThreshold]);

  // Create debounced threshold update
  const debouncedThresholdUpdate = useRef(
    debounce((boulderId: number, threshold: number) => {
      console.log(`[ControlPanel] Updating threshold for boulder ${boulderId} to ${threshold}`)
      
      // Update config
      setThreshold(boulderId, threshold)
      
      // Recalculate moves if we have CSV data
      if (state.selectedBoulder?.csvData) {
        const moves = detectAndProcessMoves(
          state.selectedBoulder.csvData.time,
          state.selectedBoulder.csvData.absoluteAcceleration,
          threshold
        )
        updateProcessedMoves(moves)
      }
    }, 500)
  ).current
  
  // Handle threshold change
  const handleThresholdChange = useCallback((value: number) => {
    if (selectedBoulder?.id !== undefined) {
      // Update local state for UI
      setThreshold(selectedBoulder.id, value)
      
      // Update global store
      updateThreshold(value)
      
      // Recalculate moves
      if (selectedBoulder.csvData) {
        const moves = detectAndProcessMoves(
          selectedBoulder.csvData.time,
          selectedBoulder.csvData.absoluteAcceleration,
          value
        )
        updateProcessedMoves(moves)
      }
    }
  }, [selectedBoulder, setThreshold])
  
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
  }, [visualizerSettings, debouncedSettingsUpdate])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedThresholdUpdate.cancel()
      debouncedSettingsUpdate.cancel()
    }
  }, [debouncedThresholdUpdate, debouncedSettingsUpdate])

  const handleBoulderSelect = useCallback((boulderId: string) => {
    if (boulderId) {
      const id = parseInt(boulderId)
      selectBoulderFromHook(id)
      onBoulderChange(id)
    }
  }, [selectBoulderFromHook, onBoulderChange])

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
        
        setIsLiveModeActive(true)
        setConnectionStatus('connected')
        onServerToggle(true)
        
      } catch (error) {
        setIsLiveModeActive(false)
        setConnectionStatus('disconnected')
        onServerToggle(false)
      }
    } else {
      setIsLiveModeActive(false)
      setConnectionStatus('disconnected')
      onServerToggle(false)
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
        { key: 'liquidSize', name: 'Liquid Size', min: 0.1, max: 5.0, step: 0.1 }
      ]
    },
    {
      id: 'attempts',
      name: '🎯 Attempts',
      icon: '🎯',
      controls: [
        { key: 'maxAttempts', name: 'Number of Attempts', min: 10, max: 200, step: 5 },
        { key: 'attemptOpacity', name: 'Attempt Opacity', min: 0.0, max: 1.0, step: 0.05 },
        { key: 'attemptWaviness', name: 'Line Waviness', min: 0.0, max: 1.0, step: 0.01 },
        { key: 'attemptThickness', name: 'Line Thickness', min: 0.1, max: 2.0, step: 0.1 },
        { key: 'attemptRadius', name: 'Max Radius', min: 0.5, max: 3.0, step: 0.05 },
        { key: 'attemptDotZOffsetMax', name: 'Dot Z Offset', min: 0.0, max: 2.0, step: 0.05 },
        { key: 'attemptFadeStrength', name: 'Fade Effect', min: 0.0, max: 3.0, step: 0.1 }
      ]
    }
  ]

  const ControlSlider = ({ control }: { control: any }) => {
    const currentValue = Number(visualizerSettings[control.key as keyof typeof visualizerSettings]);
    
    // Local state for immediate UI feedback
    const [localValue, setLocalValue] = useState(currentValue);
    
    // Sync local value with settings when settings change
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
          // Remove the key prop that includes value to prevent remounting
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
            <h2 className="text-cyan-400 font-bold text-xl">Control Center</h2>
            <button
              onClick={refreshBoulders}
              className="px-3 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 rounded-lg transition-all text-sm font-medium"
              disabled={isLoading}
            >
              <RefreshCwIcon size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* View Switcher */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => {
                if (currentView === 'visualizer') {
                  // Toggle visualization mode if already in visualizer
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
              onClick={() => onViewChange('add-boulder')}
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
          {folders.map((folder) => (
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

              {/* Move Threshold */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-cyan-400">Move Threshold</label>
                  <span className="text-cyan-400 text-sm font-medium bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/40">
                    {currentThreshold.toFixed(1)} m/s²
                  </span>
                </div>
                <ElasticSlider
                  defaultValue={currentThreshold}
                  startingValue={8}
                  maxValue={50}
                  isStepped={true}
                  stepSize={0.5}
                  className="w-full"
                  onChange={handleThresholdChange}
                />
              </div>

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
                      placeholder="http://192.168.1.36"
                      className="w-full px-4 py-3 bg-black/50 border border-cyan-400/40 rounded-xl text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none text-sm backdrop-blur-sm transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Folders */}
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
          
          {/* Other Settings Folders */}
          {currentFolder && currentFolder !== 'selection' && currentFolder !== 'attempts' && (
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