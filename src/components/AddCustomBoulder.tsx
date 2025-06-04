import React, { useState } from 'react'
import { ManualBoulderCreator } from './ManualBoulderCreator'
import { PhyphoxTutorial } from './PhyphoxTutorial'
import SpotlightCard from './ui/SpotlightCard'
import { Edit3, Smartphone, Check, Eye } from 'lucide-react'

type BoulderCreationMode = 'selection' | 'manual' | 'phyphox'

interface AddCustomBoulderProps {
  uploadFile?: (file: File) => Promise<void>
  onServerToggle?: (connected: boolean) => void
  onServerCommand?: (command: string) => void
  isServerConnected?: boolean
  currentView?: string
  isControlPanelVisible?: boolean
  onViewChange?: (view: 'visualizer' | 'add-boulder') => void
}

export function AddCustomBoulder({ 
  uploadFile, 
  onServerToggle, 
  onServerCommand, 
  isServerConnected = false,
  currentView,
  isControlPanelVisible = true,
  onViewChange
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
    <div className={`h-full flex items-center justify-center p-8 transition-all duration-300 ${!isControlPanelEffectivelyVisible ? 'py-4' : ''}`} style={{ paddingTop: !isControlPanelEffectivelyVisible ? '2%' : '6%' }}>
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-white tracking-light text-4xl font-bold leading-tight mb-4 custom-headline-font">
            Add Boulder Data
          </h1>
          <p className="text-gray-400 text-center max-w-2xl mx-auto">
            Design custom boulder problems with move sequences, grades, and power levels.
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Manual Creation Option */}
          <SpotlightCard 
            className="cursor-pointer"
            spotlightColor="rgba(34, 211, 238, 0.2)"
          >
            <div 
              onClick={() => setMode('manual')}
              className="bg-black/70 border border-cyan-400/40 rounded-2xl p-6 hover:border-cyan-400/60 hover:bg-black/80 transition-all duration-300 backdrop-blur-sm group"
              style={{ minHeight: !isControlPanelEffectivelyVisible ? '380px' : '330px' }}
            >
              <div className="text-center h-full flex flex-col justify-between">
                <div>
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">
                    <Edit3 size={48} className="text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-cyan-400 text-xl font-bold mb-3">Create Manually</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Design custom boulder problems with move sequences, grades, and power levels.
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-cyan-400" />
                      <span>Custom move sequences</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-cyan-400" />
                      <span>Difficulty grade selection</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-cyan-400" />
                      <span>Power level adjustments</span>
                    </div>
                  </div>
                </div>
                <button className="mt-6 px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 rounded-xl font-medium transition-all border border-cyan-400/40 group-hover:border-cyan-400/60 text-sm">
                  Start Creating
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Phyphox Recording Option */}
          <SpotlightCard 
            className="cursor-pointer"
            spotlightColor="rgba(34, 197, 94, 0.2)"
          >
            <div 
              onClick={() => setMode('phyphox')}
              className="bg-black/70 border border-cyan-400/40 rounded-2xl p-6 hover:border-cyan-400/60 hover:bg-black/80 transition-all duration-300 backdrop-blur-sm group"
              style={{ minHeight: !isControlPanelEffectivelyVisible ? '380px' : '330px' }}
            >
              <div className="text-center h-full flex flex-col justify-between">
                <div>
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">
                    <Smartphone size={48} className="text-green-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-cyan-400 text-xl font-bold mb-3">Record with Phyphox</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Connect to live server and record real climbing data with the Phyphox mobile app.
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-green-400" />
                      <span>Live server connection</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-green-400" />
                      <span>Real-time data recording</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-green-400" />
                      <span>Step-by-step tutorial</span>
                    </div>
                  </div>
                </div>
                <button className="mt-6 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-medium transition-all border border-green-400/40 group-hover:border-green-400/60 text-sm">
                  Connect & Record
                </button>
              </div>
            </div>
          </SpotlightCard>

          {/* Jump to Visualization Option */}
          <SpotlightCard 
            className="cursor-pointer"
            spotlightColor="rgba(168, 85, 247, 0.2)"
          >
            <div 
              onClick={() => onViewChange && onViewChange('visualizer')}
              className="bg-black/70 border border-cyan-400/40 rounded-2xl p-6 hover:border-cyan-400/60 hover:bg-black/80 transition-all duration-300 backdrop-blur-sm group"
              style={{ minHeight: !isControlPanelEffectivelyVisible ? '380px' : '330px' }}
            >
              <div className="text-center h-full flex flex-col justify-between">
                <div>
                  <div className="mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">
                    <Eye size={48} className="text-purple-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-cyan-400 text-xl font-bold mb-3">Jump to Visualization</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">
                    Skip setup and explore the visualization with sample data. Perfect for demos and testing.
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-purple-400" />
                      <span>Sample boulder data</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-purple-400" />
                      <span>Interactive controls</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Check size={12} className="text-purple-400" />
                      <span>Instant preview</span>
                    </div>
                  </div>
                </div>
                <button className="mt-6 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-medium transition-all border border-purple-400/40 group-hover:border-purple-400/60 text-sm">
                  Explore Now
                </button>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  )
} 