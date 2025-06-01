import React, { useState } from 'react'
import { ManualBoulderCreator } from './ManualBoulderCreator'
import { PhyphoxTutorial } from './PhyphoxTutorial'

type BoulderCreationMode = 'selection' | 'manual' | 'phyphox'

interface AddCustomBoulderProps {
  uploadFile?: (file: File) => Promise<void>
  onServerToggle?: (connected: boolean) => void
  onServerCommand?: (command: string) => void
  isServerConnected?: boolean
  currentView?: string
  isControlPanelVisible?: boolean
}

export function AddCustomBoulder({ 
  uploadFile, 
  onServerToggle, 
  onServerCommand, 
  isServerConnected = false,
  currentView,
  isControlPanelVisible = true
}: AddCustomBoulderProps = {}) {
  const [mode, setMode] = useState<BoulderCreationMode>('selection')

  const handleBackToSelection = () => {
    setMode('selection')
  }

  // Calculate if control panel is effectively visible (not hidden by view or visibility state)
  const isControlPanelEffectivelyVisible = isControlPanelVisible && currentView !== 'add-boulder'

  if (mode === 'manual') {
    return <ManualBoulderCreator onBack={handleBackToSelection} isControlPanelVisible={isControlPanelEffectivelyVisible} />
  }

  if (mode === 'phyphox') {
    return (
      <PhyphoxTutorial 
        onBack={handleBackToSelection}
        onServerToggle={onServerToggle}
        onServerCommand={onServerCommand}
        isServerConnected={isServerConnected}
        uploadFile={uploadFile}
        isControlPanelVisible={isControlPanelEffectivelyVisible}
      />
    )
  }

  // Selection screen
  return (
    <div className="h-full flex items-center justify-center p-8" style={{ paddingTop: '10%' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-white tracking-light text-4xl font-bold leading-tight mb-4">
            Add Boulder Data
          </h1>
          <p className="text-gray-400 text-lg">
            Choose your creation method
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Manual Creation Option */}
          <div 
            onClick={() => setMode('manual')}
            className="bg-black/70 border border-cyan-400/40 rounded-2xl p-8 cursor-pointer hover:border-cyan-400/60 hover:bg-black/80 transition-all duration-300 backdrop-blur-sm group"
            style={{ minHeight: '400px' }}
          >
            <div className="text-center h-full flex flex-col justify-between">
              <div>
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  ✏️
                </div>
                <h3 className="text-cyan-400 text-2xl font-bold mb-4">Create Manually</h3>
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                  Design custom boulder problems with manual move sequences, difficulty grades, and power levels.
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Custom move sequences</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Difficulty grade selection</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Power level adjustments</span>
                  </div>
                </div>
              </div>
              <button className="mt-6 px-6 py-3 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 rounded-xl font-medium transition-all border border-cyan-400/40 group-hover:border-cyan-400/60">
                Start Creating
              </button>
            </div>
          </div>

          {/* Phyphox Recording Option */}
          <div 
            onClick={() => setMode('phyphox')}
            className="bg-black/70 border border-cyan-400/40 rounded-2xl p-8 cursor-pointer hover:border-cyan-400/60 hover:bg-black/80 transition-all duration-300 backdrop-blur-sm group"
            style={{ minHeight: '400px' }}
          >
            <div className="text-center h-full flex flex-col justify-between">
              <div>
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  📱
                </div>
                <h3 className="text-cyan-400 text-2xl font-bold mb-4">Record with Phyphox</h3>
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                  Connect to live server and record real climbing data with the Phyphox mobile app.
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Live server connection</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Real-time data recording</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Step-by-step tutorial</span>
                  </div>
                </div>
              </div>
              <button className="mt-6 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium transition-all border border-green-400/40 group-hover:border-green-400/60">
                Connect & Record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 