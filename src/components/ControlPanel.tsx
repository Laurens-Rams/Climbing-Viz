import React, { useState, useEffect, useCallback } from 'react'
import * as Slider from '@radix-ui/react-slider'
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon, PlayIcon, Square, RefreshCwIcon, SettingsIcon } from 'lucide-react'
import type { BoulderData } from '../utils/csvLoader'

interface ControlPanelProps {
  onSettingsChange: (settings: any) => void
  onBoulderChange: (boulderId: number) => void
  onBoulderDataUpdate?: (boulder: BoulderData) => void
  currentBoulderId: number
  boulders: BoulderData[]
  selectedBoulder: BoulderData | null
  isLoading: boolean
  error: string | null
  selectBoulder: (id: number) => void
  uploadFile: (file: File) => Promise<void>
  refreshBoulders: () => void
}

export function ControlPanel({ onSettingsChange, onBoulderChange, onBoulderDataUpdate, currentBoulderId, boulders, selectedBoulder, isLoading, error, selectBoulder, uploadFile, refreshBoulders }: ControlPanelProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [currentFolder, setCurrentFolder] = useState<string | null>('basics')
  
  // Settings state
  const [settings, setSettings] = useState({
    // Move Detection
    moveDetectionThreshold: 15.0,
    magnitudeThreshold: 1.5,
    minMoveDuration: 0.2,
    
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
    liquidEffect: true
  })

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
        // Reset file input
        event.target.value = ''
      }
    } else if (file) {
      alert('Please select a CSV file')
      event.target.value = ''
    }
  }, [uploadFile])

  const folders = [
    {
      id: 'selection',
      name: '🧗 Boulder Selection',
      icon: '🧗',
      controls: []
    },
    {
      id: 'detection',
      name: '🎯 Move Detection',
      icon: '🎯',
      controls: [
        { key: 'moveDetectionThreshold', name: 'Move Threshold', min: 8.0, max: 50.0, step: 0.5 },
        { key: 'magnitudeThreshold', name: 'Magnitude Threshold', min: 0.5, max: 5.0, step: 0.1 },
        { key: 'minMoveDuration', name: 'Min Move Duration', min: 0.1, max: 1.0, step: 0.05 }
      ]
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

  const folderNames = folders.map(f => ({ id: f.id, name: f.name, icon: f.icon }))

  // ControlSlider component for individual controls
  const ControlSlider = ({ control }: { control: any }) => {
    const currentValue = settings[control.key as keyof typeof settings] as number || 0
    
    return (
      <div className="mb-3">
        <label className="block text-xs font-medium text-cyan-400 mb-1">
          {control.name}: {currentValue.toFixed(control.step < 1 ? 2 : 0)}
        </label>
        <Slider.Root
          value={[currentValue]}
          onValueChange={([value]) => updateSetting(control.key, value)}
          min={control.min}
          max={control.max}
          step={control.step}
          className="relative flex items-center select-none touch-none h-5"
        >
          <Slider.Track className="bg-gray-700 relative grow rounded-full h-3">
            <Slider.Range className="absolute bg-cyan-400 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb className="block w-5 h-5 bg-cyan-400 shadow-lg rounded-full hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
        </Slider.Root>
      </div>
    )
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${!isVisible ? 'translate-x-full' : ''}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute -left-12 top-4 bg-gray-800 hover:bg-gray-700 text-cyan-400 p-2 rounded-l border border-cyan-400 border-r-0 transition-colors"
      >
        <SettingsIcon size={20} />
      </button>

      {/* Control panel */}
      <div className="w-80 bg-gray-900 border border-cyan-400 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 border-b border-cyan-400 p-3">
          <h2 className="text-cyan-400 font-bold text-lg">Boulder Controls</h2>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border-b border-red-400 p-2">
            <div className="text-red-400 text-xs">⚠️ {error}</div>
          </div>
        )}

        {/* Folder tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setCurrentFolder(currentFolder === folder.id ? null : folder.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition-colors border-r border-gray-700 last:border-r-0 ${
                currentFolder === folder.id
                  ? 'bg-cyan-400 text-black'
                  : 'text-gray-300 hover:text-cyan-400 hover:bg-gray-700'
              }`}
            >
              <div className="text-center">
                <div className="text-sm">{folder.icon}</div>
                <div className="hidden sm:block">{folder.name.replace(/^.+ /, '')}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Control content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {currentFolder === 'selection' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-200 mb-2">Select CSV Data</label>
                <Select.Root 
                  value={selectedBoulder?.id.toString() || ''} 
                  onValueChange={handleBoulderSelect}
                  disabled={isLoading}
                >
                  <Select.Trigger className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none disabled:opacity-50">
                    <Select.Value placeholder={isLoading ? "Loading..." : "Select CSV..."} />
                    <Select.Icon>
                      <ChevronDownIcon className="w-4 h-4" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-gray-800 border border-gray-600 rounded shadow-lg z-[99999]">
                      <Select.Viewport className="p-1">
                        {boulders.map((boulder) => (
                          <Select.Item
                            key={boulder.id}
                            value={boulder.id.toString()}
                            className="px-3 py-2 text-gray-200 hover:bg-cyan-400 hover:text-black rounded cursor-pointer focus:outline-none"
                          >
                            <Select.ItemText>
                              {boulder.name}
                            </Select.ItemText>
                          </Select.Item>
                        ))}
                        {boulders.length === 0 && !isLoading && (
                          <Select.Item value="" disabled className="px-3 py-2 text-gray-400 rounded">
                            <Select.ItemText>No CSV files found</Select.ItemText>
                          </Select.Item>
                        )}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-200 mb-2">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-400 file:text-black file:cursor-pointer text-xs"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={refreshBoulders}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 bg-cyan-400 text-black rounded hover:bg-cyan-300 transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? '🔄' : '🔄'} Reload
                </button>
                <button className="flex-1 px-3 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors text-sm">
                  🔍 Scan Files
                </button>
              </div>

              {selectedBoulder && (
                <div className="mt-4 p-3 bg-cyan-400/10 border border-cyan-400 rounded text-xs">
                  <div className="font-bold text-cyan-400 mb-1">Current: {selectedBoulder.name}</div>
                  <div className="text-gray-300">
                    • {selectedBoulder.stats.moveCount} moves detected<br/>
                    • {selectedBoulder.stats.duration}s duration<br/>
                    • {selectedBoulder.stats.sampleCount} data points
                  </div>
                </div>
              )}
            </div>
          )}

          {folders.find(f => f.id === currentFolder)?.controls.map((control) => (
            <ControlSlider key={control.key} control={control} />
          ))}

          {currentFolder && currentFolder !== 'selection' && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              {currentFolder === 'animation' && (
                <>
                  <button
                    onClick={() => updateSetting('animationEnabled', !settings.animationEnabled)}
                    className={`w-full px-3 py-2 rounded transition-colors text-sm mb-3 ${
                      settings.animationEnabled
                        ? 'bg-cyan-400 text-black'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    {settings.animationEnabled ? '🔄 Animation ON' : '⏸️ Animation OFF'}
                  </button>
                  <button
                    onClick={() => updateSetting('liquidEffect', !settings.liquidEffect)}
                    className={`w-full px-3 py-2 rounded transition-colors text-sm ${
                      settings.liquidEffect
                        ? 'bg-cyan-400 text-black'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    {settings.liquidEffect ? '🌊 Liquid Effect ON' : '⏸️ Liquid Effect OFF'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 