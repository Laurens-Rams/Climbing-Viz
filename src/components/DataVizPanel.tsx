import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as Select from '@radix-ui/react-select'
import * as Slider from '@radix-ui/react-slider'
import { ChevronDownIcon, BarChart } from 'lucide-react'
import { useCSVData } from '../hooks/useCSVData'
import type { BoulderData } from '../utils/csvLoader'

interface DataVizPanelProps {
  isVisible: boolean
  onBoulderDataUpdate: (boulder: BoulderData) => void
  currentBoulderId?: number
}

interface StatData {
  maxAccel: number
  avgAccel: number
  moveCount: number
  duration: number
  sampleCount: number
}

export function DataVizPanel({ isVisible, onBoulderDataUpdate, currentBoulderId }: DataVizPanelProps) {
  const { boulders, selectedBoulder, isLoading, selectBoulder } = useCSVData()
  const [threshold, setThreshold] = useState(12.0)
  const [visualizationMode, setVisualizationMode] = useState('standard')
  const [timeRange, setTimeRange] = useState(100)
  const [stats, setStats] = useState<StatData>({
    maxAccel: 0,
    avgAccel: 0,
    moveCount: 0,
    duration: 0,
    sampleCount: 0
  })
  
  const plotRef = useRef<HTMLDivElement>(null)
  const isUserSelectingRef = useRef(false)

  // Canvas plot rendering
  const updatePlot = useCallback(() => {
    if (!selectedBoulder?.csvData || !plotRef.current) return

    const canvas = plotRef.current.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      const { time, absoluteAcceleration } = selectedBoulder.csvData
      
      // Apply time range filter
      let filteredTime = time
      let filteredAccel = absoluteAcceleration
      
      if (timeRange < 100) {
        const maxTime = Math.max(...time)
        const cutoffTime = maxTime * timeRange / 100
        const indices = time.map((t, i) => t <= cutoffTime ? i : -1).filter(i => i !== -1)
        filteredTime = indices.map(i => time[i])
        filteredAccel = indices.map(i => absoluteAcceleration[i])
      }

      if (filteredTime.length === 0) return

      // High resolution canvas setup
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr * 2  // 2x higher resolution
      canvas.height = rect.height * dpr * 2
      ctx.scale(dpr * 2, dpr * 2)
      
      // Canvas setup with high resolution
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const padding = { top: 30, right: 30, bottom: 50, left: 60 }
      const plotWidth = rect.width - padding.left - padding.right
      const plotHeight = rect.height - padding.top - padding.bottom

      // Scales
      const minTime = Math.min(...filteredTime)
      const maxTime = Math.max(...filteredTime)
      const minAccel = 0
      const maxAccel = Math.max(...filteredAccel, threshold + 5)

      const xScale = (t: number) => padding.left + ((t - minTime) / (maxTime - minTime)) * plotWidth
      const yScale = (a: number) => padding.top + plotHeight - ((a - minAccel) / (maxAccel - minAccel)) * plotHeight

      // Grid
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 0.5
      ctx.setLineDash([1, 2])
      
      for (let i = 0; i <= 5; i++) {
        const t = minTime + i * (maxTime - minTime) / 5
        const x = xScale(t)
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, padding.top + plotHeight)
        ctx.stroke()
      }
      
      for (let i = 0; i <= 5; i++) {
        const a = minAccel + i * (maxAccel - minAccel) / 5
        const y = yScale(a)
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + plotWidth, y)
        ctx.stroke()
      }
      
      ctx.setLineDash([])

      // Threshold line
      if (visualizationMode === 'moves' || visualizationMode === 'standard') {
        ctx.strokeStyle = '#ff4444'
        ctx.lineWidth = 1.5
        const thresholdY = yScale(threshold)
        ctx.beginPath()
        ctx.moveTo(padding.left, thresholdY)
        ctx.lineTo(padding.left + plotWidth, thresholdY)
        ctx.stroke()
        
        ctx.fillStyle = '#ff4444'
        ctx.font = '10px Arial'
        ctx.fillText(`Threshold: ${threshold}m/s²`, padding.left + 5, thresholdY - 3)
      }

      // Data line with higher quality
      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      
      for (let i = 0; i < filteredTime.length; i++) {
        const x = xScale(filteredTime[i])
        const y = yScale(filteredAccel[i])
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Move markers
      if ((visualizationMode === 'moves' || visualizationMode === 'standard') && selectedBoulder.moves) {
        selectedBoulder.moves.forEach((move, index) => {
          const moveTime = minTime + (index / (selectedBoulder.moves.length - 1)) * (maxTime - minTime)
          const closestIndex = filteredTime.reduce((prev, curr, i) => 
            Math.abs(curr - moveTime) < Math.abs(filteredTime[prev] - moveTime) ? i : prev, 0)
          
          if (closestIndex < filteredAccel.length && filteredAccel[closestIndex] > threshold) {
            const x = xScale(filteredTime[closestIndex])
            const y = yScale(filteredAccel[closestIndex])
            
            ctx.fillStyle = move.isCrux ? '#DE501B' : '#00ffcc'
            ctx.beginPath()
            ctx.arc(x, y, move.isCrux ? 4 : 3, 0, 2 * Math.PI)
            ctx.fill()
          }
        })
      }

      // Axes
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(padding.left, padding.top)
      ctx.lineTo(padding.left, padding.top + plotHeight)
      ctx.moveTo(padding.left, padding.top + plotHeight)
      ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight)
      ctx.stroke()

      // Labels
      ctx.fillStyle = '#00ffcc'
      ctx.font = '11px Arial'
      
      // Y-axis label
      ctx.save()
      ctx.translate(15, padding.top + plotHeight / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillText('Acceleration (m/s²)', 0, 0)
      ctx.restore()
      
      // X-axis label
      ctx.textAlign = 'center'
      ctx.fillText('Time (seconds)', padding.left + plotWidth / 2, rect.height - 15)
      
      // Title
      ctx.font = 'bold 14px Arial'
      const title = visualizationMode === 'moves' ? 'Move Detection Analysis' : 
                    visualizationMode === 'histogram' ? 'Acceleration Distribution' :
                    'Time Series Plot'
      ctx.fillText(title, rect.width / 2, 20)

    } catch (error) {
      console.error('Error updating plot:', error)
    }
  }, [selectedBoulder, threshold, timeRange, visualizationMode])

  // Detect moves based on current threshold
  const detectMoves = useCallback((time: number[], acceleration: number[], threshold: number) => {
    const detectedMoves = []
    const minMoveDuration = 0.5 // minimum seconds between moves
    
    let lastMoveTime = -minMoveDuration
    
    // Always add starting position
    detectedMoves.push({
      time: 0,
      acceleration: acceleration[0] || 9.8
    })
    
    // Detect moves above threshold
    for (let i = 1; i < acceleration.length - 1; i++) {
      const currentAccel = acceleration[i]
      const currentTime = time[i]
      
      // Look for peaks above threshold
      if (currentAccel > threshold && 
          currentAccel > acceleration[i-1] && 
          currentAccel > acceleration[i+1] &&
          (currentTime - lastMoveTime) > minMoveDuration) {
        
        detectedMoves.push({
          time: currentTime,
          acceleration: currentAccel
        })
        
        lastMoveTime = currentTime
      }
    }
    
    return detectedMoves
  }, [])

  // Update stats when boulder changes OR threshold changes
  useEffect(() => {
    if (selectedBoulder?.csvData) {
      // Recalculate moves based on current threshold
      const detectedMoves = detectMoves(selectedBoulder.csvData.time, selectedBoulder.csvData.absoluteAcceleration, threshold)
      
      const newStats = {
        maxAccel: selectedBoulder.csvData.maxAcceleration,
        avgAccel: selectedBoulder.csvData.avgAcceleration,
        moveCount: detectedMoves.length, // Use dynamically calculated move count
        duration: selectedBoulder.csvData.duration,
        sampleCount: selectedBoulder.csvData.sampleCount
      }
      setStats(newStats)
      updatePlot()
    }
  }, [selectedBoulder?.id, threshold, detectMoves, updatePlot]) // Added threshold dependency

  // Update plot when controls change
  useEffect(() => {
    if (selectedBoulder?.csvData) {
      updatePlot()
    }
  }, [threshold, timeRange, visualizationMode, updatePlot])

  // File selection handler
  const handleFileSelect = useCallback((boulderId: string) => {
    if (boulderId) {
      isUserSelectingRef.current = true
      setTimeout(() => { isUserSelectingRef.current = false }, 100)
      selectBoulder(parseInt(boulderId))
    }
  }, [selectBoulder])

  // Sync notifications
  useEffect(() => {
    if (selectedBoulder && selectedBoulder.id !== currentBoulderId) {
      isUserSelectingRef.current = true
      setTimeout(() => { isUserSelectingRef.current = false }, 100)
      onBoulderDataUpdate(selectedBoulder)
    }
  }, [selectedBoulder, onBoulderDataUpdate, currentBoulderId])

  // Sync FROM parent
  useEffect(() => {
    if (currentBoulderId && boulders.length > 0 && (!selectedBoulder || selectedBoulder.id !== currentBoulderId)) {
      if (isUserSelectingRef.current) return
      
      const targetBoulder = boulders.find(b => b.id === currentBoulderId)
      if (targetBoulder) {
        selectBoulder(currentBoulderId)
      }
    }
  }, [currentBoulderId, boulders, selectedBoulder, selectBoulder])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-cyan-400 overflow-hidden z-10 pt-16">
      <div className="h-full p-3 flex flex-col max-h-[calc(100vh-4rem)]">
        
        {/* Top Controls - Ultra Compact Fixed Height */}
        <div className="grid grid-cols-2 gap-3 h-20 mb-2 flex-shrink-0">
          
          {/* Left: Data Selection & Key Statistics */}
          <div className="bg-black/70 border border-cyan-400 rounded-lg p-2">
            <h3 className="text-xs font-bold text-cyan-400 mb-1">📊 Data Controls</h3>
            
            {/* Boulder Selection */}
            <div className="mb-1">
              <label className="block text-[9px] font-medium text-cyan-400 mb-0.5">Boulder Data:</label>
              <Select.Root 
                value={selectedBoulder?.id.toString() || ''} 
                onValueChange={handleFileSelect}
                disabled={isLoading}
              >
                <Select.Trigger className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none text-[10px]">
                  <Select.Value placeholder={isLoading ? "Loading..." : "Select boulder..."} />
                  <Select.Icon>
                    <ChevronDownIcon className="w-3 h-3" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-gray-800 border border-gray-600 rounded shadow-lg z-[99999]">
                    <Select.Viewport className="p-1">
                      {boulders.map((boulder) => (
                        <Select.Item
                          key={boulder.id}
                          value={boulder.id.toString()}
                          className="px-2 py-1 text-gray-200 hover:bg-cyan-400 hover:text-black rounded cursor-pointer text-[10px]"
                        >
                          <Select.ItemText>
                            {boulder.name} ({boulder.stats.sampleCount} pts)
                          </Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Key Statistics - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-1">
              <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
                <div className="text-xs font-bold text-red-400">{stats.maxAccel.toFixed(1)}</div>
                <div className="text-[8px] text-gray-400">Max Accel</div>
              </div>
              <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
                <div className="text-xs font-bold text-blue-400">{stats.moveCount}</div>
                <div className="text-[8px] text-gray-400">Moves</div>
              </div>
              <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
                <div className="text-xs font-bold text-green-400">{stats.avgAccel.toFixed(1)}</div>
                <div className="text-[8px] text-gray-400">Avg Accel</div>
              </div>
              <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
                <div className="text-xs font-bold text-yellow-400">{stats.duration.toFixed(1)}s</div>
                <div className="text-[8px] text-gray-400">Duration</div>
              </div>
            </div>
          </div>

          {/* Right: Analysis Controls */}
          <div className="bg-black/70 border border-cyan-400 rounded-lg p-2">
            <h3 className="text-xs font-bold text-cyan-400 mb-2">🎯 Analysis Settings</h3>
            
            {/* Visualization Mode */}
            <div className="mb-2">
              <label className="block text-[10px] font-medium text-cyan-400 mb-1">Visualization:</label>
              <Select.Root value={visualizationMode} onValueChange={setVisualizationMode}>
                <Select.Trigger className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-200 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none text-[10px]">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDownIcon className="w-3 h-3" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-gray-800 border border-gray-600 rounded shadow-lg z-[99999]">
                    <Select.Viewport className="p-1">
                      <Select.Item value="standard" className="px-2 py-1 text-gray-200 hover:bg-cyan-400 hover:text-black rounded cursor-pointer text-[10px]">
                        <Select.ItemText>Time Series</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="moves" className="px-2 py-1 text-gray-200 hover:bg-cyan-400 hover:text-black rounded cursor-pointer text-[10px]">
                        <Select.ItemText>Move Detection</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="histogram" className="px-2 py-1 text-gray-200 hover:bg-cyan-400 hover:text-black rounded cursor-pointer text-[10px]">
                        <Select.ItemText>Distribution</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            
            {/* Threshold */}
            <div className="mb-1">
              <label className="block text-[10px] font-medium text-cyan-400 mb-1">
                Threshold: {threshold.toFixed(1)} m/s²
              </label>
              <Slider.Root
                value={[threshold]}
                onValueChange={([value]) => setThreshold(value)}
                min={8}
                max={50}
                step={0.5}
                className="relative flex items-center select-none touch-none h-3"
              >
                <Slider.Track className="bg-gray-700 relative grow rounded-full h-1">
                  <Slider.Range className="absolute bg-cyan-400 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-3 h-3 bg-cyan-400 shadow-lg rounded-full hover:bg-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400" />
              </Slider.Root>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-[10px] font-medium text-cyan-400 mb-1">
                Range: {timeRange === 100 ? 'All' : `${timeRange}%`}
              </label>
              <Slider.Root
                value={[timeRange]}
                onValueChange={([value]) => setTimeRange(value)}
                min={10}
                max={100}
                step={5}
                className="relative flex items-center select-none touch-none h-3"
              >
                <Slider.Track className="bg-gray-700 relative grow rounded-full h-1">
                  <Slider.Range className="absolute bg-cyan-400 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-3 h-3 bg-cyan-400 shadow-lg rounded-full hover:bg-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400" />
              </Slider.Root>
            </div>
          </div>
        </div>

        {/* Main Plot - Flexible Height */}
        <div className="bg-black/70 border border-cyan-400 rounded-lg p-3 flex-1 mb-3 min-h-0">
          <div className="flex items-center gap-2 mb-2">
            <BarChart className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-cyan-400">
              {visualizationMode === 'standard' && 'Acceleration Time Series'}
              {visualizationMode === 'moves' && 'Move Detection Analysis'}
              {visualizationMode === 'histogram' && 'Acceleration Distribution'}
            </h3>
          </div>
          <div 
            ref={plotRef}
            className="w-full h-full bg-gray-900 border border-gray-700 rounded flex items-center justify-center min-h-0"
          >
            {selectedBoulder?.csvData ? (
              <canvas
                width={1200}
                height={600}
                className="w-full h-full bg-gray-900"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div className="text-gray-500 text-center">
                <BarChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a boulder to begin analysis</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Extended Statistics at Bottom */}
        <div className="bg-black/70 border border-cyan-400 rounded-lg p-2 h-12 flex-shrink-0">
          <h3 className="text-xs font-bold text-cyan-400 mb-1">📈 Extended Analysis</h3>
          <div className="grid grid-cols-3 gap-2">
            
            <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
              <div className="text-xs font-bold text-purple-400">{stats.sampleCount.toLocaleString()}</div>
              <div className="text-[8px] text-gray-400">Data Points</div>
            </div>
            
            <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
              <div className="text-sm font-bold text-orange-400">
                {selectedBoulder?.csvData ? (stats.sampleCount / stats.duration).toFixed(1) : '0.0'}
              </div>
              <div className="text-[8px] text-gray-400">Sample Rate (Hz)</div>
            </div>
            
            <div className="text-center p-1 bg-gray-800/50 rounded border border-gray-700">
              <div className="text-sm font-bold text-teal-400">
                {selectedBoulder?.grade || 'N/A'}
              </div>
              <div className="text-[8px] text-gray-400">Boulder Grade</div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
} 