import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import type { BoulderData } from '../utils/csvLoader'
import { useBoulderConfig } from '../context/BoulderConfigContext'

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

// Move detection function
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

export function StatisticsView({ selectedBoulder, onBoulderDataUpdate, isControlPanelVisible }: StatisticsViewProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const { getThreshold } = useBoulderConfig()
  
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

      // Threshold line
      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 2
      const thresholdY = yScale(currentThreshold)
      ctx.beginPath()
      ctx.moveTo(padding.left, thresholdY)
      ctx.lineTo(padding.left + plotWidth, thresholdY)
      ctx.stroke()
      
      ctx.fillStyle = '#ff4444'
      ctx.font = 'bold 12px Arial'
      ctx.fillText(`Threshold: ${currentThreshold}m/s²`, padding.left + 10, thresholdY - 8)

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

      // Move markers
      const detectedMoves = detectMoves(time, absoluteAcceleration, currentThreshold);
      
      detectedMoves.forEach((move, index) => {
        const x = xScale(move.time)
        const y = yScale(move.acceleration)
        
        ctx.fillStyle = index === 0 ? '#00ffcc' : (move.acceleration > currentThreshold * 1.5 ? '#DE501B' : '#00ffcc')
        ctx.beginPath()
        ctx.arc(x, y, index === 0 ? 6 : 4, 0, 2 * Math.PI)
        ctx.fill()
        
        // Move number
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px Arial'
        ctx.textAlign = 'center'
        ctx.fillText((index + 1).toString(), x, y - 10)
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
  }, [selectedBoulder, currentThreshold])

  // Update plot when data changes
  useEffect(() => {
    if (selectedBoulder?.csvData) {
      updatePlot()
    }
  }, [selectedBoulder, currentThreshold, updatePlot])

  // Update boulder data when threshold changes
  useEffect(() => {
    if (selectedBoulder?.csvData) {
      const needsUpdate = !selectedBoulder.appliedThreshold || selectedBoulder.appliedThreshold !== currentThreshold;
      
      if (needsUpdate) {
        const newMoves = detectMoves(
          selectedBoulder.csvData.time,
          selectedBoulder.csvData.absoluteAcceleration,
          currentThreshold
        ).map((move, index) => ({
          move_number: index + 1,
          dynamics: Math.min(move.acceleration / 20, 1),
          isCrux: move.acceleration > currentThreshold * 1.5,
          thresholdDetected: true
        }));

        const updatedBoulder: BoulderData = {
          ...selectedBoulder,
          moves: newMoves,
          stats: {
            ...selectedBoulder.stats,
            moveCount: newMoves.length,
            threshold: currentThreshold
          },
          appliedThreshold: currentThreshold
        };
        
        onBoulderDataUpdate(updatedBoulder);
      }
    }
  }, [selectedBoulder, currentThreshold, onBoulderDataUpdate]);

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
        <div 
          ref={plotRef}
          className="w-full h-full flex items-center justify-center"
        >
          <canvas
            className="w-full h-full rounded-lg"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  )
} 