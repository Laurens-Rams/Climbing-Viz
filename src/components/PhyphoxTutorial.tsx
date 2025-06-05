import React, { useState, useEffect, useRef } from 'react'
import { Stepper, Step } from './Stepper'
import { ChevronRight, ChevronLeft, Play, Square, Trash2, Upload, ArrowLeft, Smartphone, Globe, Link, Film, Clipboard, CheckCircle, X, BarChart3, Save, Check } from 'lucide-react'
import ElasticSlider from './ui/ElasticSlider'

interface PhyphoxTutorialProps {
  onBack: () => void
  onServerToggle?: (connected: boolean) => void
  onServerCommand?: (command: string) => void
  isServerConnected?: boolean
  uploadFile?: (file: File) => Promise<void>
  isControlPanelVisible?: boolean
}

// Live data interface
interface LiveDataPoint {
  time: number
  magnitude: number
}

export function PhyphoxTutorial({ 
  onBack, 
  onServerToggle, 
  onServerCommand, 
  isServerConnected = false,
  uploadFile,
  isControlPanelVisible = true
}: PhyphoxTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [serverIP, setServerIP] = useState('10.237.1.101')
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSuccess, setRecordingSuccess] = useState(false)
  
  // Live data tracking
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([])
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Boulder form data
  const [boulderName, setBoulderName] = useState('')
  const [routeSetter, setRouteSetter] = useState('')
  const [grade, setGrade] = useState('')
  const [gradeSystem, setGradeSystem] = useState<'V' | 'Font' | 'YDS'>('V') // V-scale, Font (French), YDS (Yosemite)
  const [numberOfMoves, setNumberOfMoves] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Save confirmation state
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [savedBoulderData, setSavedBoulderData] = useState<any>(null)

  // Grade systems data with conversion mappings
  const gradeSystems = {
    V: { name: 'V-Scale', grades: ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'] },
    Font: { name: 'French', grades: ['3', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+', '9A'] },
    YDS: { name: 'YDS', grades: ['5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a'] }
  }

  // Grade conversion mapping (approximate conversions)
  const gradeConversions: Record<string, Record<string, string>> = {
    // V-Scale to others
    'VB': { Font: '4', YDS: '5.6' },
    'V0': { Font: '4+', YDS: '5.7' },
    'V1': { Font: '5+', YDS: '5.8' },
    'V2': { Font: '6A', YDS: '5.9' },
    'V3': { Font: '6A+', YDS: '5.10a' },
    'V4': { Font: '6B+', YDS: '5.10d' },
    'V5': { Font: '6C+', YDS: '5.11b' },
    'V6': { Font: '7A', YDS: '5.11d' },
    'V7': { Font: '7A+', YDS: '5.12a' },
    'V8': { Font: '7B+', YDS: '5.12c' },
    'V9': { Font: '7C', YDS: '5.13a' },
    'V10': { Font: '7C+', YDS: '5.13c' },
    'V11': { Font: '8A', YDS: '5.14a' },
    'V12': { Font: '8A+', YDS: '5.14b' },
    'V13': { Font: '8B', YDS: '5.14c' },
    'V14': { Font: '8B+', YDS: '5.14d' },
    'V15': { Font: '8C', YDS: '5.15a' },
    
    // French to others
    '4': { V: 'VB', YDS: '5.6' },
    '4+': { V: 'V0', YDS: '5.7' },
    '5+': { V: 'V1', YDS: '5.8' },
    '6A': { V: 'V2', YDS: '5.9' },
    '6A+': { V: 'V3', YDS: '5.10a' },
    '6B+': { V: 'V4', YDS: '5.10d' },
    '6C+': { V: 'V5', YDS: '5.11b' },
    '7A': { V: 'V6', YDS: '5.11d' },
    '7A+': { V: 'V7', YDS: '5.12a' },
    '7B+': { V: 'V8', YDS: '5.12c' },
    '7C': { V: 'V9', YDS: '5.13a' },
    '7C+': { V: 'V10', YDS: '5.13c' },
    '8A': { V: 'V11', YDS: '5.14a' },
    '8A+': { V: 'V12', YDS: '5.14b' },
    '8B': { V: 'V13', YDS: '5.14c' },
    '8B+': { V: 'V14', YDS: '5.14d' },
    '8C': { V: 'V15', YDS: '5.15a' },
    
    // YDS to others
    '5.6': { V: 'VB', Font: '4' },
    '5.7': { V: 'V0', Font: '4+' },
    '5.8': { V: 'V1', Font: '5+' },
    '5.9': { V: 'V2', Font: '6A' },
    '5.10a': { V: 'V3', Font: '6A+' },
    '5.10d': { V: 'V4', Font: '6B+' },
    '5.11b': { V: 'V5', Font: '6C+' },
    '5.11d': { V: 'V6', Font: '7A' },
    '5.12a': { V: 'V7', Font: '7A+' },
    '5.12c': { V: 'V8', Font: '7B+' },
    '5.13a': { V: 'V9', Font: '7C' },
    '5.13c': { V: 'V10', Font: '7C+' },
    '5.14a': { V: 'V11', Font: '8A' },
    '5.14b': { V: 'V12', Font: '8A+' },
    '5.14c': { V: 'V13', Font: '8B' },
    '5.14d': { V: 'V14', Font: '8B+' },
    '5.15a': { V: 'V15', Font: '8C' }
  }

  const convertGrade = (currentGrade: string, fromSystem: string, toSystem: string): string => {
    if (!currentGrade || fromSystem === toSystem) return ''
    
    const conversion = gradeConversions[currentGrade]
    if (conversion && conversion[toSystem]) {
      return conversion[toSystem]
    }
    
    return '' // Reset if no conversion found
  }

  const handleConnectToServer = async () => {
    setConnectionAttempted(true)
    
    try {
      // Real server connection logic - using correct endpoint
      const response = await fetch(`http://${serverIP}/get?acc_time`, {
        method: 'GET',
        mode: 'cors',
      })
      
      if (response.ok) {
        if (onServerToggle) {
          onServerToggle(true)
        }
      } else {
        throw new Error('Server not responding')
      }
    } catch (error) {
      console.error('Connection failed:', error)
      if (onServerToggle) {
        onServerToggle(false)
      }
    }
  }

  const handleStartRecording = async () => {
    try {
      const response = await fetch(`http://${serverIP}/control?cmd=start`, {
        method: 'GET',
        mode: 'cors',
      })
      
      if (response.ok) {
        setIsRecording(true)
        setLiveData([]) // Clear previous data
        setRecordingStartTime(null) // Will be set when first data arrives
        
        console.log('[PhyphoxTutorial] Recording started, waiting for first data...')
        
        // Start polling for live data immediately
        startLiveDataPolling()
        
        if (onServerCommand) {
          onServerCommand('start')
        }
      }
    } catch (error) {
      console.error('Start recording failed:', error)
    }
  }

  const handleStopRecording = async () => {
    try {
      const response = await fetch(`http://${serverIP}/control?cmd=stop`, {
        method: 'GET',
        mode: 'cors',
      })
      
      if (response.ok) {
        setIsRecording(false)
        setRecordingSuccess(true)
        
        // Stop polling
        stopLiveDataPolling()
        
        if (onServerCommand) {
          onServerCommand('stop')
        }
      }
    } catch (error) {
      console.error('Stop recording failed:', error)
    }
  }

  const handleClearData = async () => {
    try {
      const response = await fetch(`http://${serverIP}/control?cmd=clear`, {
        method: 'GET',
        mode: 'cors',
      })
      
      if (response.ok) {
        setIsRecording(false)
        setRecordingSuccess(false)
        setLiveData([])
        
        // Stop polling
        stopLiveDataPolling()
        
        if (onServerCommand) {
          onServerCommand('clear')
        }
      }
    } catch (error) {
      console.error('Clear data failed:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && uploadFile) {
      try {
        await uploadFile(file)
        console.log('File uploaded successfully')
        // Navigate back to visualizer after successful upload
        onBack()
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }
  }

  const handleSaveBoulder = async () => {
    try {
      // Fetch the final recorded data from Phyphox
      const response = await fetch(`http://${serverIP}/get?acc_time=full&accX=full&accY=full&accZ=full`, {
        method: 'GET',
        mode: 'cors',
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Create boulder data object with the form information and recorded data
        const boulderData = {
          id: Date.now(), // Simple ID generation
          name: boulderName || 'Unnamed Boulder',
          routeSetter: routeSetter || 'Unknown',
          grade: grade || 'Ungraded',
          gradeSystem: gradeSystem,
          numberOfMoves: numberOfMoves ? parseInt(numberOfMoves) : 0,
          date: date,
          recordedAt: new Date().toISOString(),
          moves: [], // Will be processed from the raw data
          rawData: data.buffer, // Store the raw Phyphox data
          source: 'phyphox',
          totalDataPoints: data.buffer?.acc_time?.buffer?.length || 0
        }
        
        // Save to localStorage
        const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
        existingBoulders.push(boulderData)
        localStorage.setItem('climbing-boulders', JSON.stringify(existingBoulders))
        
        console.log('Boulder saved successfully:', boulderData)
        
        // Store boulder data for confirmation popup
        setSavedBoulderData(boulderData)
        setShowSaveConfirmation(true)
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('boulderSaved', { 
          detail: { boulder: boulderData } 
        }))
        
      } else {
        throw new Error('Failed to fetch final recording data')
      }
    } catch (error) {
      console.error('Error saving boulder:', error)
      
      // Save without raw data as fallback
      const boulderData = {
        id: Date.now(),
        name: boulderName || 'Unnamed Boulder',
        routeSetter: routeSetter || 'Unknown',
        grade: grade || 'Ungraded',
        gradeSystem: gradeSystem,
        numberOfMoves: numberOfMoves ? parseInt(numberOfMoves) : 0,
        date: date,
        recordedAt: new Date().toISOString(),
        moves: [],
        source: 'phyphox',
        error: 'Could not fetch recording data'
      }
      
      const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
      existingBoulders.push(boulderData)
      localStorage.setItem('climbing-boulders', JSON.stringify(existingBoulders))
      
      console.log('Boulder saved without raw data:', boulderData)
      
      // Store boulder data for confirmation popup
      setSavedBoulderData(boulderData)
      setShowSaveConfirmation(true)
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('boulderSaved', { 
        detail: { boulder: boulderData } 
      }))
    }
  }

  // Progress graph component
  const ProgressGraph = () => {
    if (!isRecording && liveData.length === 0) return null
    
    const graphHeight = 150
    const padding = 20
    
    // Calculate graph bounds
    const dataHeight = graphHeight - 2 * padding
    
    if (liveData.length < 2) {
      return (
        <div className="bg-black/50 border border-cyan-400/40 rounded-lg p-4">
          <h4 className="text-cyan-400 font-medium mb-2 flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            Live Progress
          </h4>
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {isRecording ? 'Waiting for data...' : 'No data recorded'}
          </div>
        </div>
      )
    }
    
    // Use full recording timeline - from start to current
    const recordingStartTimeSeconds = recordingStartTime ? recordingStartTime / 1000 : 0
    const actualStartTime = liveData.length > 0 ? Math.min(...liveData.map(d => d.time)) : recordingStartTimeSeconds
    const currentTime = Math.max(...liveData.map(d => d.time))
    const minMagnitude = Math.min(...liveData.map(d => d.magnitude))
    const maxMagnitude = Math.max(...liveData.map(d => d.magnitude))
    
    const timeRange = Math.max(currentTime - actualStartTime, 1) // Ensure minimum range
    const magnitudeRange = Math.max(maxMagnitude - minMagnitude, 0.1) // Ensure minimum range
    
    return (
      <div className="bg-black/50 border border-cyan-400/40 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-cyan-400 font-medium mb-2 flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            Live Progress
          </h4>
          <div className="text-xs text-gray-400">
            {liveData.length} points • {timeRange.toFixed(1)}s
          </div>
        </div>
        
        {/* Full-width responsive SVG container */}
        <div className="w-full bg-gray-900/50 rounded border border-gray-600/30">
          <svg 
            width="100%" 
            height={graphHeight} 
            viewBox={`0 0 400 ${graphHeight}`}
            preserveAspectRatio="none"
            className="w-full"
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Generate SVG path using full timeline */}
            {(() => {
              const dataWidth = 400 - 2 * padding
              
              const pathData = liveData.map((point, index) => {
                const x = padding + ((point.time - actualStartTime) / timeRange) * dataWidth
                const y = padding + dataHeight - ((point.magnitude - minMagnitude) / magnitudeRange) * dataHeight
                
                return index === 0 ? `M${x},${y}` : `L${x},${y}`
              }).join(' ')
              
              return (
                <>
                  {/* Data line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#00ffcc"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-sm"
                  />
                  
                  {/* Current point if recording */}
                  {isRecording && liveData.length > 0 && (
                    <circle
                      cx={padding + ((liveData[liveData.length - 1].time - actualStartTime) / timeRange) * dataWidth}
                      cy={padding + dataHeight - ((liveData[liveData.length - 1].magnitude - minMagnitude) / magnitudeRange) * dataHeight}
                      r="3"
                      fill="#00ffcc"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Recording start indicator */}
                  {recordingStartTime && (
                    <line
                      x1={padding}
                      y1={padding}
                      x2={padding}
                      y2={padding + dataHeight}
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.7"
                    />
                  )}
                </>
              )
            })()}
          </svg>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Min: {minMagnitude.toFixed(1)}</span>
          <span>Range: {timeRange.toFixed(1)}s</span>
          <span>Max: {maxMagnitude.toFixed(1)}</span>
        </div>
      </div>
    )
  }

  // Define tutorial steps
  const tutorialSteps: Step[] = [
    {
      id: 'connect',
      title: 'Connect',
      description: '',
      icon: '1'
    },
    {
      id: 'record',
      title: 'Record',
      description: 'Start recording and climb your boulder',
      icon: '2'
    },
    {
      id: 'add-info',
      title: 'Save',
      description: 'Add boulder information and save to library',
      icon: '3'
    }
  ]

  const handleStepNext = (step: number) => {
    // Allow next button for testing - remove server connection requirement
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      return true
    }
    return false
  }

  const handleStepPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepComplete = () => {
    handleSaveBoulder()
  }

  // Live data polling functions
  const startLiveDataPolling = () => {
    if (pollIntervalRef.current) return // Already polling
    
    console.log('[PhyphoxTutorial] Starting live data polling')
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`http://${serverIP}/get?acc_time=full&accX=full&accY=full&accZ=full`, {
          method: 'GET',
          mode: 'cors',
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.buffer && data.buffer.acc_time && data.buffer.accX && data.buffer.accY && data.buffer.accZ) {
            const timeArray = data.buffer.acc_time.buffer || []
            const accXArray = data.buffer.accX.buffer || []
            const accYArray = data.buffer.accY.buffer || []
            const accZArray = data.buffer.accZ.buffer || []
            
            // Set recording start time from first data point if not set
            if (recordingStartTime === null && timeArray.length > 0) {
              const firstTime = timeArray[0]
              setRecordingStartTime(firstTime * 1000) // Convert to milliseconds
              console.log('[PhyphoxTutorial] Recording start time set from first data point:', firstTime)
            }
            
            // Process all data points from recording start
            const newDataPoints: LiveDataPoint[] = timeArray.map((time: number, index: number) => {
              const x = accXArray[index] || 0
              const y = accYArray[index] || 0
              const z = accZArray[index] || 0
              const magnitude = Math.sqrt(x * x + y * y + z * z)
              
              return { time, magnitude }
            })
            
            // Keep all data points to show full recording timeline
            setLiveData(newDataPoints)
            
            // Log progress every 100 points to avoid console spam
            if (newDataPoints.length > 0 && newDataPoints.length % 100 === 0) {
              console.log(`[PhyphoxTutorial] Live data updated: ${newDataPoints.length} points, duration: ${(newDataPoints[newDataPoints.length - 1].time - newDataPoints[0].time).toFixed(1)}s`)
            }
          }
        }
      } catch (error) {
        console.warn('[PhyphoxTutorial] Live data polling error:', error)
      }
    }, 200) // Poll every 200ms for smoother updates
  }

  const stopLiveDataPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveDataPolling()
    }
  }, [])

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Connect
        return (
          <div className="space-y-8">
            {/* Step Indicator moved here - above Phyphox app setup */}
            <div className="mb-8">
              <Stepper
                steps={tutorialSteps}
                currentStep={currentStep}
                onNext={handleStepNext}
                onPrevious={handleStepPrevious}
                onComplete={handleStepComplete}
                className="mb-8"
              />
            </div>

            {/* 3-Step Setup Guide - Horizontal Layout */}
            <div>
              <h3 className="text-xl font-semibold text-cyan-400 mb-6 text-center">Phyphox App Setup</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                {/* Step 1: Download & Open */}
                <div className="bg-black/30 rounded-xl p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <Smartphone size={48} className="text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">1. Download App</h4>
                  <p className="text-cyan-400/80 text-sm mb-4">
                    Download Phyphox from your app store and open the "Acceleration (without g)" experiment.
                  </p>
                </div>

                {/* Step 2: Enable Remote Access */}
                <div className="bg-black/30 rounded-xl p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <Globe size={48} className="text-green-400" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">2. Enable Remote Access</h4>
                  <p className="text-cyan-400/80 text-sm mb-4">
                    In the app, tap the three dots menu → "Allow remote access" to enable network control.
                  </p>
                </div>

                {/* Step 3: Note IP Address */}
                <div className="bg-black/30 rounded-xl p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <Link size={48} className="text-purple-400" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">3. Get IP Address</h4>
                  <p className="text-cyan-400/80 text-sm mb-4">
                    The app will show an IP address (e.g., 10.237.1.101). Enter this below to connect.
                  </p>
                </div>
              </div>
            </div>

            {/* Connection and CSV Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Server Connection Section (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <Link size={24} className="text-cyan-400" />
                    <h4 className="text-xl font-semibold text-cyan-400">Connect to Server</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                        Server IP Address:
                      </label>
                      <input
                        type="text"
                        value={serverIP}
                        onChange={(e) => setServerIP(e.target.value)}
                        placeholder="10.237.1.101"
                        className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    
                    <button
                      onClick={handleConnectToServer}
                      className="w-full px-4 py-3 bg-cyan-400/20 border border-cyan-400/60 text-cyan-400 rounded-lg font-medium transition-all hover:bg-cyan-400/30 hover:border-cyan-400"
                    >
                      Connect to Server
                    </button>
                    
                    {connectionAttempted && (
                      <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${
                        isServerConnected 
                          ? 'text-green-400 bg-green-400/10' 
                          : 'text-red-400 bg-red-400/10'
                      }`}>
                        {isServerConnected ? (
                          <>
                            <CheckCircle size={16} className="text-green-400" />
                            Connected successfully!
                          </>
                        ) : (
                          <>
                            <X size={16} className="text-red-400" />
                            Connection failed
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CSV Upload Alternative (1/3 width) - Reduced height, aligned to bottom */}
              <div className="lg:col-span-1 flex items-end">
                <div className="border border-cyan-400/40 rounded-lg bg-black/30 backdrop-blur-sm w-full">
                  <div className="p-3 space-y-3">
                    <p className="text-purple-400/80 text-xs text-center">
                      Already have climbing data? Upload a CSV file instead.
                    </p>
                    
                    <div>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-400/20 text-purple-400 rounded-lg border border-purple-400/40 hover:bg-purple-400/30 transition-all cursor-pointer text-xs font-medium"
                      >
                        <Upload size={14} />
                        Choose CSV File
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 1: // Record
        return (
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="mb-8">
              <Stepper
                steps={tutorialSteps}
                currentStep={currentStep}
                onNext={handleStepNext}
                onPrevious={handleStepPrevious}
                onComplete={handleStepComplete}
                className="mb-8"
              />
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Film size={24} className="text-cyan-400" />
              <h3 className="text-xl font-semibold text-cyan-400">Recording Controls</h3>
            </div>
            
            <div className="space-y-4">
              {/* Full-width improved playback buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all ${
                    isRecording 
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-600/40' 
                      : 'bg-green-400/20 text-green-400 hover:bg-green-400/30 border border-green-400/40'
                  }`}
                >
                  <Play size={20} fill={isRecording ? 'currentColor' : 'none'} />
                  Start Recording
                </button>
                
                <button
                  onClick={handleStopRecording}
                  disabled={!isRecording}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all ${
                    !isRecording 
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-600/40' 
                      : 'bg-red-400/20 text-red-400 hover:bg-red-400/30 border border-red-400/40'
                  }`}
                >
                  <Square size={20} fill={!isRecording ? 'none' : 'currentColor'} />
                  Stop Recording
                </button>
                
                <button
                  onClick={handleClearData}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-yellow-400/20 text-yellow-400 rounded-lg font-medium transition-all hover:bg-yellow-400/30 border border-yellow-400/40"
                >
                  <Trash2 size={20} />
                  Clear Data
                </button>
              </div>

              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isRecording 
                    ? 'bg-red-400/20 text-red-400' 
                    : 'bg-gray-600/20 text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  {isRecording ? 'Recording...' : 'Ready to record'}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-cyan-400/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clipboard size={20} className="text-cyan-400" />
                  <h4 className="font-semibold text-cyan-400">Recording Instructions:</h4>
                </div>
                <ul className="text-sm space-y-1 text-cyan-400/80">
                  <li>• Attach your phone securely to your body or climbing harness</li>
                  <li>• Start recording before beginning your climb</li>
                  <li>• You can control recording from either your phone or this computer</li>
                  <li>• Stop recording when you complete the boulder problem</li>
                </ul>
              </div>

              {recordingSuccess && (
                <div className="bg-green-400/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-400" />
                    <p className="text-green-400 font-semibold">Recording completed successfully!</p>
                  </div>
                  <p className="text-green-400/80 text-sm mt-1">Your climbing data has been captured. Click Next to save boulder details.</p>
                </div>
              )}

              {/* Live Progress Graph */}
              {(isRecording || liveData.length > 0) && (
                <ProgressGraph />
              )}
            </div>
          </div>
        )

      case 2: // Save Boulder Data
        return (
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="mb-8">
              <Stepper
                steps={tutorialSteps}
                currentStep={currentStep}
                onNext={handleStepNext}
                onPrevious={handleStepPrevious}
                onComplete={handleStepComplete}
                className="mb-8"
              />
            </div>

            <h3 className="text-xl font-semibold text-cyan-400 mb-6 flex items-center gap-2">
              <Save size={20} className="text-cyan-400" />
              Boulder Information
            </h3>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                    Type the name *
                  </label>
                  <input
                    type="text"
                    value={boulderName}
                    onChange={(e) => setBoulderName(e.target.value)}
                    placeholder="Enter boulder name"
                    className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none overflow-hidden text-ellipsis whitespace-nowrap"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                    Route Setter
                  </label>
                  <input
                    type="text"
                    value={routeSetter}
                    onChange={(e) => setRouteSetter(e.target.value)}
                    placeholder="Who set this route?"
                    className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                    Grade
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="" className="bg-black text-cyan-400">Select grade...</option>
                      {gradeSystems[gradeSystem].grades.map((gradeOption) => (
                        <option key={gradeOption} value={gradeOption} className="bg-black text-cyan-400">
                          {gradeOption}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const systems: ('V' | 'Font' | 'YDS')[] = ['V', 'Font', 'YDS']
                        const currentIndex = systems.indexOf(gradeSystem)
                        const nextIndex = (currentIndex + 1) % systems.length
                        const newSystem = systems[nextIndex]
                        
                        // Convert current grade to new system if possible
                        const convertedGrade = convertGrade(grade, gradeSystem, newSystem)
                        
                        setGradeSystem(newSystem)
                        setGrade(convertedGrade) // Use converted grade or empty string
                      }}
                      className="px-3 py-2 bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all text-sm font-medium whitespace-nowrap"
                      title="Switch grade system"
                    >
                      {gradeSystems[gradeSystem].name}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                    Number of Moves
                  </label>
                  <input
                    type="number"
                    value={numberOfMoves}
                    onChange={(e) => setNumberOfMoves(e.target.value)}
                    placeholder="Estimated move count"
                    min="1"
                    className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen relative">
      {/* Save Confirmation Popup */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-black/90 border border-green-400/40 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">Boulder Saved!</h3>
                <p className="text-gray-300">
                  "{savedBoulderData?.name}" has been successfully saved to your library.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSaveConfirmation(false)
                    // Navigate to visualizer -> statistics view for analysis
                    window.dispatchEvent(new CustomEvent('navigateToStatistics', {
                      detail: { boulderId: savedBoulderData?.id }
                    }))
                    onBack()
                  }}
                  className="w-full px-6 py-3 bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 rounded-xl font-medium transition-all hover:bg-cyan-400/30 hover:border-cyan-400/60 flex items-center justify-center gap-2"
                >
                  <BarChart3 size={20} />
                  Analyze & Crop Data
                </button>
                
                <button
                  onClick={() => {
                    setShowSaveConfirmation(false)
                    onBack()
                  }}
                  className="w-full px-6 py-3 bg-gray-500/20 border border-gray-500/40 text-gray-300 rounded-xl font-medium transition-all hover:bg-gray-500/30"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`h-full flex items-center justify-center transition-all duration-300 ${
        isControlPanelVisible ? 'pr-[25rem]' : 'pr-0'
      }`}>
        <div className="w-full max-w-5xl mx-auto p-8 h-full flex flex-col">
          {/* Header with back button */}
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-black/50 hover:bg-black/70 text-cyan-400 rounded-lg transition-all text-sm font-medium border border-cyan-400/40 mr-6"
            >
              ← Back
            </button>
            <div className="flex-1">
              <h1 className="text-white tracking-light text-3xl font-bold leading-tight">
                Record with Phyphox App
              </h1>
              <p className="text-gray-400 text-base mt-1">
                Use your phone's sensors to capture climbing data in real-time
              </p>
            </div>
          </div>

          {/* Main Content Container */}
          <div className="flex-1 bg-black/70 border border-cyan-400/40 rounded-2xl backdrop-blur-sm overflow-hidden">
            <div className="h-full p-6 flex flex-col">
              {/* Step Content */}
              <div className="flex-1">
                {renderStepContent()}
              </div>

              {/* Navigation Buttons - Moved to bottom */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-cyan-400/20">
                <button
                  onClick={handleStepPrevious}
                  disabled={currentStep === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    currentStep === 0
                      ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                      : 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30 border border-cyan-400/40'
                  }`}
                >
                  ← Previous
                </button>
                
                <span className="text-cyan-400/60 text-sm">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </span>
                
                <button
                  onClick={() => {
                    if (currentStep === tutorialSteps.length - 1) {
                      handleStepComplete()
                    } else {
                      handleStepNext(currentStep)
                    }
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    currentStep === tutorialSteps.length - 1
                      ? 'bg-green-400/20 text-green-400 hover:bg-green-400/30 border border-green-400/40'
                      : 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30 border border-cyan-400/40'
                  }`}
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Complete' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 