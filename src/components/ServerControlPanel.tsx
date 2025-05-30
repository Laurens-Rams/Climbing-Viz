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
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40">
      {/* Error/Status Display */}
      {errorMessage && (
        <div className="mb-6 glass-card border-red-500/30 bg-red-900/20 text-center">
          <p className="text-red-200 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Main Control Module */}
      <div className="glass-panel glass-panel--compact">
        <div className="flex items-center gap-xl">
          
          {/* Mode Switch */}
          <div className="flex items-center gap-lg">
            <span className="text-accent text-sm font-bold">Mode:</span>
            <button
              onClick={handleModeSwitch}
              className={`glass-toggle ${
                currentMode === 'frontend'
                  ? 'glass-toggle--danger'
                  : 'glass-toggle--success'
              }`}
            >
              {currentMode === 'frontend' ? 'Frontend' : 'Backend'}
            </button>
          </div>

          {/* Live Mode Toggle */}
          <div className="flex items-center gap-lg">
            <span className="text-accent text-sm font-bold">Live Mode:</span>
            <button
              onClick={handleLiveModeToggle}
              className={`glass-toggle ${
                isLiveModeActive
                  ? 'glass-toggle--success'
                  : 'glass-toggle--danger'
              }`}
            >
              {isLiveModeActive ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Server Selection */}
          <div className="flex items-center gap-lg">
            <Server className="w-4 h-4 text-accent" />
            <select
              value={selectedServer}
              onChange={(e) => handleServerChange(parseInt(e.target.value))}
              className="glass-select text-xs min-w-[200px]"
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
          <div className="flex items-center gap-sm">
            <button
              onClick={() => handleServerCommand('start')}
              className="glass-btn glass-btn--success glass-btn--small"
              title="Start Recording"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleServerCommand('stop')}
              className="glass-btn glass-btn--danger glass-btn--small"
              title="Stop Recording"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleServerCommand('clear')}
              className="glass-btn glass-btn--secondary glass-btn--small"
              title="Clear Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          )}

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-sm">
            <Circle 
              className={`w-3 h-3 ${
                connectionStatus === 'connected' 
                  ? 'text-green-400 fill-current' 
                  : connectionStatus === 'checking'
                  ? 'text-yellow-400 fill-current animate-pulse'
                  : 'text-red-400 fill-current'
              }`} 
            />
            <span className="text-xs text-muted">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'checking' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 