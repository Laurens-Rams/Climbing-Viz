import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCwIcon, SettingsIcon, WifiIcon, WifiOffIcon } from 'lucide-react'
import type { BoulderData } from '../utils/csvLoader'
import { useBoulderConfig } from '../context/BoulderConfigContext'
import ElasticSlider from "./ui/ElasticSlider"

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
  onVisibilityChange
}: ControlPanelProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [currentFolder, setCurrentFolder] = useState<string | null>('selection')
  const [isLiveModeActive, setIsLiveModeActive] = useState(false)
  const [selectedServer, setSelectedServer] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected')
  const [manuallyClosed, setManuallyClosed] = useState(false)
  
  const { getThreshold, setThreshold } = useBoulderConfig()
  
  // Only auto-hide when switching to add-boulder, but respect manual state for visualizer
  useEffect(() => {
    if (currentView === 'add-boulder') {
      setIsVisible(false)
      onVisibilityChange(false)
    } else if (currentView === 'visualizer' && !manuallyClosed) {
      setIsVisible(true)
      onVisibilityChange(true)
    }
  }, [currentView, manuallyClosed, onVisibilityChange])
  
  // Notify parent of initial visibility state
  useEffect(() => {
    onVisibilityChange(isVisible)
  }, []) // Only run on mount
  
  // Settings state
  const [settings, setSettings] = useState({
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
    liquidEffect: true,
    
    // Move Detection
    centerTextSize: 1.0
  })

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

  const updateSetting = useCallback((key: string, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange(newSettings)
  }, [settings, onSettingsChange])

  const handleBoulderSelect = useCallback((boulderId: string) => {
    if (boulderId) {
      const id = parseInt(boulderId)
      selectBoulder(id)
      onBoulderChange(id)
    }
  }, [selectBoulder, onBoulderChange])

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
        const serverUrl = servers[selectedServer].url
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
  }, [isLiveModeActive, selectedServer, servers, testConnection, onServerToggle])

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
        { key: 'centerFade', name: 'Center Fade', min: 0.0, max: 1.0, step: 0.05 },
        { key: 'depthEffect', name: '3D Depth Effect', min: 0.0, max: 2.0, step: 0.1 },
        { key: 'organicNoise', name: 'Organic Noise', min: 0.0, max: 0.1, step: 0.005 }
      ]
    },
    {
      id: 'effects',
      name: '🌊 Dynamic Effects',
      icon: '🌊',
      controls: [
        { key: 'cruxEmphasis', name: 'Crux Emphasis', min: 0.5, max: 3.0, step: 0.1 },
        { key: 'moveEmphasis', name: 'Move Emphasis', min: 0.0, max: 2.0, step: 0.1 },
        { key: 'waveComplexity', name: 'Wave Complexity', min: 0.5, max: 2.0, step: 0.1 }
      ]
    },
    {
      id: 'animation',
      name: '🔄 Animation',
      icon: '🔄',
      controls: [
        { key: 'rotationSpeed', name: 'Rotation Speed', min: 0.0, max: 2.0, step: 0.1 },
        { key: 'liquidSpeed', name: 'Liquid Speed', min: 0.0, max: 1.0, step: 0.05 }
      ]
    }
  ]

  const ControlSlider = ({ control }: { control: any }) => {
    const [localSliderValue, setLocalSliderValue] = useState<number>(Number(settings[control.key as keyof typeof settings]));

    useEffect(() => {
      setLocalSliderValue(Number(settings[control.key as keyof typeof settings]));
    }, [settings[control.key as keyof typeof settings], control.key]);

    const handleValueChange = (value: number) => {
      setLocalSliderValue(value);
      updateSetting(control.key, value);
    };

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-cyan-400">{control.name}</label>
          <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg border border-cyan-400/40">
            {localSliderValue.toFixed(control.step < 0.01 ? 3 : control.step < 0.1 ? 2 : 1)}
          </span>
        </div>
        <ElasticSlider
          defaultValue={localSliderValue}
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

  return (
    <div className={`fixed top-20 right-6 bottom-6 z-50 transition-all duration-300 ${!isVisible ? 'translate-x-full' : ''}`}>
      {/* Toggle button */}
      <button
        onClick={() => {
          const newVisibility = !isVisible
          setIsVisible(newVisibility)
          onVisibilityChange(newVisibility)
          
          // Track manual state: if closing in visualizer mode, mark as manually closed
          // If opening, reset the manually closed state
          if (currentView === 'visualizer') {
            if (newVisibility) {
              setManuallyClosed(false) // User opened it, reset manual state
            } else {
              setManuallyClosed(true) // User closed it manually
            }
          }
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
        <div className="flex-1 overflow-y-auto p-6">
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
                  onChange={(value) => setThreshold(selectedBoulder?.id || 0, value)}
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
                    <select
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-black/50 border border-cyan-400/40 rounded-xl text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none text-sm backdrop-blur-sm transition-all"
                    >
                      {servers.map((server, index) => (
                        <option key={index} value={index} className="bg-gray-800">
                          {server.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Folders */}
          {folders.find(f => f.id === currentFolder)?.controls.map((control) => (
            <ControlSlider key={control.key} control={control} />
          ))}
        </div>
      </div>
    </div>
  )
} 