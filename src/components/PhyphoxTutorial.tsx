import React, { useState } from 'react'
import { Stepper, Step } from './Stepper'
import { Play, Square, Trash2, Upload } from 'lucide-react'

interface PhyphoxTutorialProps {
  onBack: () => void
  onServerToggle?: (connected: boolean) => void
  onServerCommand?: (command: string) => void
  isServerConnected?: boolean
  uploadFile?: (file: File) => Promise<void>
  isControlPanelVisible?: boolean
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
  const [serverIP, setServerIP] = useState('192.168.1.36')
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSuccess, setRecordingSuccess] = useState(false)
  
  // Boulder form data
  const [boulderName, setBoulderName] = useState('')
  const [routeSetter, setRouteSetter] = useState('')
  const [grade, setGrade] = useState('')
  const [gradeSystem, setGradeSystem] = useState<'V' | 'Font' | 'YDS'>('V') // V-scale, Font (French), YDS (Yosemite)
  const [numberOfMoves, setNumberOfMoves] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Grade systems data
  const gradeSystems = {
    V: { name: 'V-Scale', grades: ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'] },
    Font: { name: 'French', grades: ['3', '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+', '8C', '8C+', '9A'] },
    YDS: { name: 'YDS', grades: ['5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a'] }
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

  const handleSaveBoulder = () => {
    // Create boulder data object with the form information
    const boulderData = {
      name: boulderName || 'Unnamed Boulder',
      routeSetter: routeSetter || 'Unknown',
      grade: grade || 'Ungraded',
      numberOfMoves: numberOfMoves ? parseInt(numberOfMoves) : 0,
      date: date,
      recordedAt: new Date().toISOString()
    }
    
    console.log('Saving boulder to library:', boulderData)
    
    // Navigate back to visualizer
    onBack()
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
                  <div className="text-4xl mb-4">📱</div>
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">1. Download App</h4>
                  <p className="text-cyan-400/80 text-sm mb-4">
                    Download Phyphox from your app store and open the "Acceleration (without g)" experiment.
                  </p>
                </div>

                {/* Step 2: Enable Remote Access */}
                <div className="bg-black/30 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-4">🌐</div>
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">2. Enable Remote Access</h4>
                  <p className="text-cyan-400/80 text-sm mb-4">
                    In the app, tap the three dots menu → "Allow remote access" to enable network control.
                  </p>
                </div>

                {/* Step 3: Note IP Address */}
                <div className="bg-black/30 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-4">🔗</div>
                  <h4 className="text-lg font-semibold text-cyan-400 mb-3">3. Get IP Address</h4>
                  <p className="text-cyan-400/80 text-sm mb-4">
                    The app will show an IP address (e.g., 192.168.1.36). Enter this below to connect.
                  </p>
                </div>
              </div>
            </div>

            {/* Connection and CSV Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Server Connection Section (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-full">
                  <h4 className="text-xl font-semibold text-cyan-400 mb-6">🔗 Connect to Server</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cyan-400/80 mb-2">
                        Server IP Address:
                      </label>
                      <input
                        type="text"
                        value={serverIP}
                        onChange={(e) => setServerIP(e.target.value)}
                        placeholder="192.168.1.36"
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
                      <div className={`text-sm p-3 rounded-lg ${
                        isServerConnected 
                          ? 'text-green-400 bg-green-400/10' 
                          : 'text-red-400 bg-red-400/10'
                      }`}>
                        {isServerConnected ? '✅ Connected successfully!' : '❌ Connection failed'}
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

            <h3 className="text-xl font-semibold text-cyan-400 mb-6">🎬 Recording Controls</h3>
            
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
                <h4 className="font-semibold text-cyan-400 mb-2">📋 Recording Instructions:</h4>
                <ul className="text-sm space-y-1 text-cyan-400/80">
                  <li>• Attach your phone securely to your body or climbing harness</li>
                  <li>• Start recording before beginning your climb</li>
                  <li>• You can control recording from either your phone or this computer</li>
                  <li>• Stop recording when you complete the boulder problem</li>
                </ul>
              </div>

              {recordingSuccess && (
                <div className="bg-green-400/10 rounded-lg p-4">
                  <p className="text-green-400 font-semibold">🎉 Recording completed successfully!</p>
                  <p className="text-green-400/80 text-sm mt-1">Your climbing data has been captured. Click Next to save boulder details.</p>
                </div>
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

            <h3 className="text-xl font-semibold text-cyan-400 mb-6">💾 Boulder Information</h3>
            
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
                    className="w-4/5 px-3 py-2 bg-black/50 border border-cyan-400/40 rounded-lg text-cyan-400 placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none overflow-hidden text-ellipsis whitespace-nowrap"
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
                        setGradeSystem(systems[nextIndex])
                        setGrade('') // Reset grade when changing system
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
    <div className="h-full bg-gradient-to-br from-gray-900 to-black">
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