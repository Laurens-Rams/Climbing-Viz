import React, { useState, useEffect, useCallback } from 'react'
import { Play, Square, RotateCcw, Server, Circle, Wifi } from 'lucide-react'

interface ServerControlPanelProps {
  onModeChange: (mode: 'frontend' | 'backend') => void
  onServerToggle: (connected: boolean) => void
  onServerCommand: (command: string) => void
}

interface ServerOption {
  name: string
  url: string
}

export function ServerControlPanel({ onModeChange, onServerToggle, onServerCommand }: ServerControlPanelProps) {
  const [currentMode, setCurrentMode] = useState<'frontend' | 'backend'>('frontend')
  const [isLiveModeActive, setIsLiveModeActive] = useState(false)
  const [selectedServer, setSelectedServer] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('disconnected')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false)

  const servers: ServerOption[] = [
    { name: 'Server 1 (192.168.1.36)', url: 'http://192.168.1.36' },
    { name: 'Server 2 (10.237.1.101)', url: 'http://10.237.1.101' },
    { name: 'Server 3 (192.168.1.100)', url: 'http://192.168.1.100' },
    { name: 'Server 4 (172.20.10.1)', url: 'http://172.20.10.1' },
    { name: 'Server 5 (10.224.1.221)', url: 'http://10.224.1.221' }
  ]

  const testConnection = useCallback(async (serverUrl: string) => {
    try {
      console.log('[ServerControlPanel] Testing connection to:', serverUrl)
      const response = await fetch(`${serverUrl}/get?acc_time`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        console.log('[ServerControlPanel] Connection successful')
        return true
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('[ServerControlPanel] Connection failed:', error)
      const err = error as Error
      if (err.name === 'AbortError') {
        throw new Error('Connection timeout - check if Phyphox is running and accessible')
      } else if (err.message.includes('Failed to fetch')) {
        throw new Error('Cannot reach server - check IP address and WiFi connection')
      } else if (err.message.includes('CORS')) {
        throw new Error('CORS error - enable "Allow remote access" in Phyphox app')
      } else {
        throw new Error(err.message)
      }
    }
  }, [])

  const handleModeSwitch = useCallback(() => {
    const newMode = currentMode === 'frontend' ? 'backend' : 'frontend'
    setCurrentMode(newMode)
    onModeChange(newMode)
  }, [currentMode, onModeChange])

  const handleLiveModeToggle = useCallback(async () => {
    const newState = !isLiveModeActive
    setHasAttemptedConnection(true)
    
    if (newState) {
      setConnectionStatus('checking')
      setErrorMessage('Connecting to Phyphox server...')
      
      try {
        const serverUrl = servers[selectedServer].url
        await testConnection(serverUrl)
        
        setIsLiveModeActive(true)
        setConnectionStatus('connected')
        setErrorMessage('✅ Connected to Phyphox server!')
        onServerToggle(true)
        
        setTimeout(() => setErrorMessage(''), 3000)
        
      } catch (error) {
        setIsLiveModeActive(false)
        setConnectionStatus('disconnected')
        const err = error as Error
        setErrorMessage(`❌ ${err.message}`)
        onServerToggle(false)
        
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } else {
      setIsLiveModeActive(false)
      setConnectionStatus('disconnected')
      setErrorMessage('Disconnected from live mode')
      onServerToggle(false)
      
      setTimeout(() => setErrorMessage(''), 2000)
    }
  }, [isLiveModeActive, selectedServer, servers, testConnection, onServerToggle])

  const handleServerCommand = useCallback((command: string) => {
    if (!isLiveModeActive) {
      setErrorMessage('❌ Must be connected to live mode to send commands')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }
    
    onServerCommand(command)
    setErrorMessage(`📤 Sent: ${command.toUpperCase()}`)
    setTimeout(() => setErrorMessage(''), 3000)
  }, [isLiveModeActive, onServerCommand])

  const showError = useCallback((message: string, duration: number = 5000) => {
    setErrorMessage(message)
    setTimeout(() => setErrorMessage(''), duration)
  }, [])

  const handleServerChange = useCallback((newServerIndex: number) => {
    setSelectedServer(newServerIndex)
    if (hasAttemptedConnection) {
      const server = servers[newServerIndex]
      showError(`Selected: ${server.name}`, 3000)
    }
    
    if (isLiveModeActive) {
      showError('⚠️ Disconnect and reconnect to use new server', 5000)
    }
  }, [hasAttemptedConnection, servers, showError, isLiveModeActive])

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40">
      {/* Error/Status Display */}
      {errorMessage && (
        <div className="mb-4 px-4 py-2 bg-red-900/70 border border-red-400 rounded-lg text-red-200 text-sm text-center backdrop-blur-sm">
          {errorMessage}
        </div>
      )}

      {/* Main Control Module */}
      <div className="flex items-center gap-4 px-5 py-3 bg-black/95 border-2 border-cyan-400/40 rounded-2xl backdrop-blur-sm shadow-xl">
        
        {/* Mode Switch */}
        <div className="flex items-center gap-2 pr-4 border-r border-cyan-400/30">
          <span className="text-cyan-400 text-sm font-bold">Mode:</span>
          <button
            onClick={handleModeSwitch}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[70px] ${
              currentMode === 'frontend'
                ? 'bg-red-500/80 text-white hover:bg-red-500'
                : 'bg-green-500/80 text-white hover:bg-green-500'
            }`}
          >
            {currentMode === 'frontend' ? 'Frontend' : 'Backend'}
          </button>
        </div>

        {/* Live Mode Toggle */}
        <div className="flex items-center gap-2 pr-4 border-r border-cyan-400/30">
          <span className="text-cyan-400 text-sm font-bold">Live Mode:</span>
          <button
            onClick={handleLiveModeToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[50px] ${
              isLiveModeActive
                ? 'bg-green-500/80 text-white hover:bg-green-500'
                : 'bg-red-500/80 text-white hover:bg-red-500'
            }`}
          >
            {isLiveModeActive ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Server Selection */}
        <div className="flex items-center gap-2 pr-4 border-r border-cyan-400/30">
          <Server className="w-4 h-4 text-cyan-400" />
          <select
            value={selectedServer}
            onChange={(e) => handleServerChange(parseInt(e.target.value))}
            className="bg-gray-800 text-cyan-400 border border-gray-600 rounded px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none"
          >
            {servers.map((server, index) => (
              <option key={index} value={index} className="bg-gray-800">
                {server.name}
              </option>
            ))}
          </select>
        </div>

        {/* Playback Controls - only show when connected */}
        {isLiveModeActive && connectionStatus === 'connected' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleServerCommand('start')}
              className="p-2 bg-green-600/80 hover:bg-green-600 text-white rounded-lg transition-colors"
              title="Start Recording"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleServerCommand('stop')}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              title="Stop Recording"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleServerCommand('clear')}
              className="p-2 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded-lg transition-colors"
              title="Clear Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 pl-4 border-l border-cyan-400/30">
          <Circle 
            className={`w-3 h-3 fill-current ${
              connectionStatus === 'connected' 
                ? 'text-green-500' 
                : connectionStatus === 'checking'
                ? 'text-yellow-500'
                : 'text-red-500'
            }`}
          />
          <span className="text-xs text-gray-300">
            {connectionStatus === 'connected' && `Server: Online (${servers[selectedServer]?.url.replace('http://', '')})`}
            {connectionStatus === 'checking' && 'Server: Checking...'}
            {connectionStatus === 'disconnected' && `Server: Offline (${servers[selectedServer]?.url.replace('http://', '')})`}
          </span>
        </div>
      </div>

      {/* Live Data Indicator (when backend mode and connected) */}
      {currentMode === 'backend' && isLiveModeActive && connectionStatus === 'connected' && (
        <div className="mt-3 px-4 py-2 bg-red-900/70 border border-red-400 rounded-lg text-center backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-red-200 font-bold text-sm">🔴 LIVE DATA</span>
            <Wifi className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-red-300 text-xs mt-1">Real-time visualization active</div>
        </div>
      )}
    </div>
  )
} 