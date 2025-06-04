import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import type { BoulderData } from '../utils/csvLoader'
import { useBoulderConfig } from '../context/BoulderConfigContext'
import { getVisualizationState } from '../store/visualizationStore'

interface StatisticsViewProps {
  selectedBoulder: BoulderData | null
  onBoulderDataUpdate: (boulder: BoulderData) => void
  isControlPanelVisible: boolean
}

interface StatData {
  maxAccel: number
  avgAccel: number
  moveCount: number
  duration: number
  sampleCount: number
}

export function StatisticsView({ selectedBoulder, onBoulderDataUpdate, isControlPanelVisible }: StatisticsViewProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const { getThreshold } = useBoulderConfig()
  
  // Get data from global store instead of calculating locally
  const vizState = getVisualizationState()
  const currentThreshold = vizState.threshold
  const globalMoves = vizState.processedMoves || []

  // Calculate statistics using global store data
  const stats = useMemo((): StatData => {
    if (!selectedBoulder?.csvData) return {
      maxAccel: 0,
      avgAccel: 0,
      moveCount: 0,
      duration: 0,
      sampleCount: 0
    };
    
    // Use moves from global store instead of calculating locally
    return {
      maxAccel: selectedBoulder.csvData.maxAcceleration,
      avgAccel: selectedBoulder.csvData.avgAcceleration,
      moveCount: globalMoves.length,
      duration: selectedBoulder.csvData.duration,
      sampleCount: selectedBoulder.csvData.sampleCount
    };
  }, [selectedBoulder, globalMoves.length]);

  // Canvas plot rendering
  const updatePlot = useCallback(() => {
    if (!selectedBoulder?.csvData || !plotRef.current) return

    const canvas = plotRef.current.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      const { time, absoluteAcceleration } = selectedBoulder.csvData
      
      if (time.length === 0) return

      // High DPI canvas setup
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'

      // Canvas setup
      ctx.clearRect(0, 0, rect.width, rect.height)
      const padding = { top: 40, right: 40, bottom: 60, left: 80 }
      const plotWidth = rect.width - padding.left - padding.right
      const plotHeight = rect.height - padding.top - padding.bottom

      // Scales
      const minTime = Math.min(...time)
      const maxTime = Math.max(...time)
      const minAccel = 0
      const maxAccel = Math.max(...absoluteAcceleration, currentThreshold + 5)

      const xScale = (t: number) => padding.left + ((t - minTime) / (maxTime - minTime)) * plotWidth
      const yScale = (a: number) => padding.top + plotHeight - ((a - minAccel) / (maxAccel - minAccel)) * plotHeight

      // Draw stillness zones (NEW)
      const STILL_THRESHOLD = vizState.visualizerSettings.stillThreshold // Use configurable value
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)' // Green with low opacity
      ctx.fillRect(padding.left, yScale(STILL_THRESHOLD), plotWidth, yScale(0) - yScale(STILL_THRESHOLD))
      
      // Draw movement zone (NEW)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)' // Red with low opacity
      ctx.fillRect(padding.left, padding.top, plotWidth, yScale(currentThreshold) - padding.top)
      
      // Grid
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      
      for (let i = 0; i <= 6; i++) {
        const t = minTime + i * (maxTime - minTime) / 6
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

      // Stillness threshold line (NEW)
      ctx.strokeStyle = '#22c55e' // Green
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      const stillThresholdY = yScale(STILL_THRESHOLD)
      ctx.beginPath()
      ctx.moveTo(padding.left, stillThresholdY)
      ctx.lineTo(padding.left + plotWidth, stillThresholdY)
      ctx.stroke()
      ctx.setLineDash([])
      
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 12px Arial'
      ctx.fillText(`Still Zone: <${STILL_THRESHOLD}m/s²`, padding.left + 10, stillThresholdY + 15)

      // Movement threshold line
      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 2
      const thresholdY = yScale(currentThreshold)
      ctx.beginPath()
      ctx.moveTo(padding.left, thresholdY)
      ctx.lineTo(padding.left + plotWidth, thresholdY)
      ctx.stroke()
      
      ctx.fillStyle = '#ff4444'
      ctx.font = 'bold 12px Arial'
      ctx.fillText(`Move Threshold: ${currentThreshold}m/s²`, padding.left + 10, thresholdY - 8)

      // Draw move periods as shaded regions (NEW)
      globalMoves.forEach((move, index) => {
        if (index === 0) return // Skip start move
        
        const startX = xScale(move.startTime)
        const endX = xScale(move.endTime)
        
        // Shade the move period
        ctx.fillStyle = move.isCrux ? 'rgba(222, 80, 27, 0.2)' : 'rgba(0, 255, 204, 0.2)'
        ctx.fillRect(startX, padding.top, endX - startX, plotHeight)
        
        // Draw vertical lines at move boundaries
        ctx.strokeStyle = move.isCrux ? '#DE501B' : '#00ffcc'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        
        // Start line
        ctx.beginPath()
        ctx.moveTo(startX, padding.top)
        ctx.lineTo(startX, padding.top + plotHeight)
        ctx.stroke()
        
        // End line
        ctx.beginPath()
        ctx.moveTo(endX, padding.top)
        ctx.lineTo(endX, padding.top + plotHeight)
        ctx.stroke()
        
        ctx.setLineDash([])
      })

      // Data line
      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 3
      ctx.beginPath()
      
      for (let i = 0; i < time.length; i++) {
        const x = xScale(time[i])
        const y = yScale(absoluteAcceleration[i])
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Move markers - use global store moves instead of local detection
      globalMoves.forEach((move, index) => {
        // Find the peak acceleration point in this move
        const moveStartIdx = time.findIndex(t => t >= move.startTime)
        const moveEndIdx = time.findIndex(t => t >= move.endTime)
        
        if (moveStartIdx >= 0 && moveEndIdx >= 0) {
          // Find peak within move period
          let peakIdx = moveStartIdx
          let peakAccel = absoluteAcceleration[moveStartIdx]
          
          for (let i = moveStartIdx; i <= moveEndIdx && i < absoluteAcceleration.length; i++) {
            if (absoluteAcceleration[i] > peakAccel) {
              peakAccel = absoluteAcceleration[i]
              peakIdx = i
            }
          }
          
          const x = xScale(time[peakIdx])
          const y = yScale(peakAccel)
          
          ctx.fillStyle = index === 0 ? '#00ff00' : (move.isCrux ? '#DE501B' : '#00ffcc')
          ctx.beginPath()
          ctx.arc(x, y, index === 0 ? 6 : 4, 0, 2 * Math.PI)
          ctx.fill()
          
          // Move number
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 10px Arial'
          ctx.textAlign = 'center'
          ctx.fillText((index + 1).toString(), x, y - 10)
        }
      })

      // Axes
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(padding.left, padding.top)
      ctx.lineTo(padding.left, padding.top + plotHeight)
      ctx.moveTo(padding.left, padding.top + plotHeight)
      ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight)
      ctx.stroke()

      // Labels
      ctx.fillStyle = '#00ffcc'
      ctx.font = 'bold 14px Arial'
      
      // Y-axis label
      ctx.save()
      ctx.translate(25, padding.top + plotHeight / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillText('Acceleration (m/s²)', 0, 0)
      ctx.restore()
      
      // X-axis label
      ctx.textAlign = 'center'
      ctx.fillText('Time (seconds)', padding.left + plotWidth / 2, rect.height - 15)
      
      // Title
      ctx.font = 'bold 16px Arial'
      ctx.fillText('Move Detection Analysis', rect.width / 2, 25)

      // Axis labels
      ctx.font = '10px Arial'
      ctx.fillStyle = '#999'
      
      // X-axis ticks
      for (let i = 0; i <= 6; i++) {
        const t = minTime + i * (maxTime - minTime) / 6
        const x = xScale(t)
        ctx.textAlign = 'center'
        ctx.fillText(t.toFixed(1), x, padding.top + plotHeight + 20)
      }
      
      // Y-axis ticks
      for (let i = 0; i <= 5; i++) {
        const a = minAccel + i * (maxAccel - minAccel) / 5
        const y = yScale(a)
        ctx.textAlign = 'right'
        ctx.fillText(a.toFixed(1), padding.left - 10, y + 3)
      }

    } catch (error) {
      console.error('Error updating plot:', error)
    }
  }, [selectedBoulder, currentThreshold, globalMoves])

  // Update plot when data changes
  useEffect(() => {
    if (selectedBoulder?.csvData) {
      updatePlot()
    }
  }, [selectedBoulder, currentThreshold, globalMoves, updatePlot])

  if (!selectedBoulder?.csvData) {
    return (
      <div className={`h-full flex items-center justify-center transition-all duration-300 ${isControlPanelVisible ? 'mr-[25rem]' : 'mr-0'}`}>
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">No Data Selected</h2>
          <p>Select a boulder from the control panel to view statistics</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col p-8 transition-all duration-300 ${isControlPanelVisible ? 'mr-[25rem]' : 'mr-0'}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-6 text-center backdrop-blur-sm">
          <div className="text-3xl font-bold text-blue-400">{stats.moveCount}</div>
          <div className="text-sm text-gray-400">Moves Detected</div>
        </div>
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-6 text-center backdrop-blur-sm">
          <div className="text-3xl font-bold text-yellow-400">{stats.duration.toFixed(1)}s</div>
          <div className="text-sm text-gray-400">Duration</div>
        </div>
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-6 text-center backdrop-blur-sm">
          <div className="text-3xl font-bold text-red-400">{stats.maxAccel.toFixed(1)}</div>
          <div className="text-sm text-gray-400">Max Acceleration</div>
        </div>
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-6 text-center backdrop-blur-sm">
          <div className="text-3xl font-bold text-green-400">{stats.avgAccel.toFixed(1)}</div>
          <div className="text-sm text-gray-400">Avg Acceleration</div>
        </div>
      </div>

      {/* Plot Area */}
      <div className="flex-1 bg-black/70 border border-cyan-400/40 rounded-xl p-6 backdrop-blur-sm">
        <div ref={plotRef} className="w-full h-full">
          <canvas className="w-full h-full" />
        </div>
      </div>
    </div>
  )
} 