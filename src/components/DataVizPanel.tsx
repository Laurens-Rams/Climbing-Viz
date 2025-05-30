import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon, BarChart } from 'lucide-react'
import { useCSVData } from '../hooks/useCSVData'
import { useBoulderConfig } from '../context/BoulderConfigContext'
import type { BoulderData } from '../utils/csvLoader'
import ElasticSlider from './ui/ElasticSlider'

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

// Move detection function to ensure consistent move counting
const detectMoves = (time: number[], acceleration: number[], threshold: number) => {
  const detectedMoves = [];
  const minMoveDuration = 0.5; // minimum seconds between moves
  
  let lastMoveTime = -minMoveDuration;
  
  // Add starting position at time 0
  detectedMoves.push({
    time: 0,
    acceleration: acceleration[0] || 9.8
  });
  
  // Detect actual moves
  for (let i = 1; i < acceleration.length - 1; i++) {
    const currentAccel = acceleration[i];
    const currentTime = time[i];
    
    // Look for peaks above threshold
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

export function DataVizPanel({ isVisible, onBoulderDataUpdate, currentBoulderId: currentBoulderIdFromProps }: DataVizPanelProps) {
  const { boulders, isLoading, selectedBoulder: globalSelectedBoulder } = useCSVData()
  const { getThreshold, setThreshold } = useBoulderConfig()

  // Internal state for the boulder ID this panel is actively displaying/processing
  const [activeBoulderId, setActiveBoulderId] = useState<number | undefined>(undefined)

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

  // Effect 1: Synchronize activeBoulderId with currentBoulderIdFromProps when panel becomes visible or prop changes externally
  useEffect(() => {
    if (isVisible && currentBoulderIdFromProps && currentBoulderIdFromProps !== activeBoulderId) {
      console.log(`[DataVizPanel] Syncing activeBoulderId from prop: ${currentBoulderIdFromProps}`);
      setActiveBoulderId(currentBoulderIdFromProps);
    }
  }, [isVisible, currentBoulderIdFromProps, activeBoulderId]);

  // Find the actual boulder data based on activeBoulderId
  const currentDisplayBoulder = useMemo(() => {
    if (!activeBoulderId) return null;
    return boulders.find(b => b.id === activeBoulderId) || null;
  }, [activeBoulderId, boulders]);

  const currentThreshold = currentDisplayBoulder ? getThreshold(currentDisplayBoulder.id) : 12.0

  // Calculate dynamic stats including threshold-based move count
  const calculateStats = useCallback((csvData: any, threshold: number) => {
    if (!csvData) return {
      maxAccel: 0,
      avgAccel: 0,
      moveCount: 0,
      duration: 0,
      sampleCount: 0
    };
    
    const moves = detectMoves(csvData.time, csvData.absoluteAcceleration, threshold);
    
    return {
      maxAccel: csvData.maxAcceleration,
      avgAccel: csvData.avgAcceleration,
      moveCount: moves.length,
      duration: csvData.duration,
      sampleCount: csvData.sampleCount
    };
  }, []);

  // Canvas plot rendering with improved resolution
  const updatePlot = useCallback(() => {
    if (!currentDisplayBoulder?.csvData || !plotRef.current) return

    const canvas = plotRef.current.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      const { time, absoluteAcceleration } = currentDisplayBoulder.csvData
      
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

      // High DPI canvas setup
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'

      // Canvas setup with proper dimensions
      ctx.clearRect(0, 0, rect.width, rect.height)
      const padding = { top: 50, right: 50, bottom: 80, left: 100 }
      const plotWidth = rect.width - padding.left - padding.right
      const plotHeight = rect.height - padding.top - padding.bottom

      // Scales
      const minTime = Math.min(...filteredTime)
      const maxTime = Math.max(...filteredTime)
      const minAccel = 0
      const maxAccel = Math.max(...filteredAccel, currentThreshold + 5)

      const xScale = (t: number) => padding.left + ((t - minTime) / (maxTime - minTime)) * plotWidth
      const yScale = (a: number) => padding.top + plotHeight - ((a - minAccel) / (maxAccel - minAccel)) * plotHeight

      // Grid
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      
      for (let i = 0; i <= 8; i++) {
        const t = minTime + i * (maxTime - minTime) / 8
        const x = xScale(t)
        ctx.beginPath()
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, padding.top + plotHeight)
        ctx.stroke()
      }
      
      for (let i = 0; i <= 6; i++) {
        const a = minAccel + i * (maxAccel - minAccel) / 6
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
        ctx.lineWidth = 3
        const thresholdY = yScale(currentThreshold)
        ctx.beginPath()
        ctx.moveTo(padding.left, thresholdY)
        ctx.lineTo(padding.left + plotWidth, thresholdY)
        ctx.stroke()
        
        ctx.fillStyle = '#ff4444'
        ctx.font = 'bold 14px Arial'
        ctx.fillText(`Threshold: ${currentThreshold}m/s²`, padding.left + 10, thresholdY - 8)
      }

      // Data line
      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 4
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

      // Move markers using our move detection function
      if ((visualizationMode === 'moves' || visualizationMode === 'standard')) {
        const detectedMoves = detectMoves(filteredTime, filteredAccel, currentThreshold);
        
        detectedMoves.forEach((move, index) => {
          const x = xScale(move.time)
          const y = yScale(move.acceleration)
          
          ctx.fillStyle = index === 0 ? '#00ffcc' : (move.acceleration > currentThreshold * 1.5 ? '#DE501B' : '#00ffcc')
          ctx.beginPath()
          ctx.arc(x, y, index === 0 ? 8 : 6, 0, 2 * Math.PI)
          ctx.fill()
          
          // Move number
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'center'
          ctx.fillText((index + 1).toString(), x, y - 12)
        })
      }

      // Axes
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(padding.left, padding.top)
      ctx.lineTo(padding.left, padding.top + plotHeight)
      ctx.moveTo(padding.left, padding.top + plotHeight)
      ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight)
      ctx.stroke()

      // Labels
      ctx.fillStyle = '#00ffcc'
      ctx.font = 'bold 16px Arial'
      
      // Y-axis label
      ctx.save()
      ctx.translate(30, padding.top + plotHeight / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillText('Acceleration (m/s²)', 0, 0)
      ctx.restore()
      
      // X-axis label
      ctx.textAlign = 'center'
      ctx.fillText('Time (seconds)', padding.left + plotWidth / 2, rect.height - 20)
      
      // Title
      ctx.font = 'bold 20px Arial'
      const title = visualizationMode === 'moves' ? 'Move Detection Analysis' : 
                    visualizationMode === 'histogram' ? 'Acceleration Distribution' :
                    'Time Series Plot'
      ctx.fillText(title, rect.width / 2, 30)

      // Axis labels
      ctx.font = '12px Arial'
      ctx.fillStyle = '#999'
      
      // X-axis ticks
      for (let i = 0; i <= 8; i++) {
        const t = minTime + i * (maxTime - minTime) / 8
        const x = xScale(t)
        ctx.textAlign = 'center'
        ctx.fillText(t.toFixed(1), x, padding.top + plotHeight + 25)
      }
      
      // Y-axis ticks
      for (let i = 0; i <= 6; i++) {
        const a = minAccel + i * (maxAccel - minAccel) / 6
        const y = yScale(a)
        ctx.textAlign = 'right'
        ctx.fillText(a.toFixed(1), padding.left - 15, y + 4)
      }

    } catch (error) {
      console.error('Error updating plot:', error)
    }
  }, [currentDisplayBoulder, timeRange, visualizationMode, currentThreshold])

  // Update stats when boulder or threshold changes
  useEffect(() => {
    if (currentDisplayBoulder?.csvData) {
      const newStats = calculateStats(currentDisplayBoulder.csvData, currentThreshold);
      setStats(newStats);
      
      const needsUpdate = !currentDisplayBoulder.appliedThreshold || currentDisplayBoulder.appliedThreshold !== currentThreshold;
      
      if (needsUpdate) {
        console.log(`[DataVizPanel] Updating boulder data for ID ${currentDisplayBoulder.id} with threshold ${currentThreshold} (was ${currentDisplayBoulder.appliedThreshold})`);
        
        const newMoves = detectMoves(
          currentDisplayBoulder.csvData.time,
          currentDisplayBoulder.csvData.absoluteAcceleration,
          currentThreshold
        ).map((move, index) => ({
          move_number: index + 1,
          dynamics: Math.min(move.acceleration / 20, 1),
          isCrux: move.acceleration > currentThreshold * 1.5,
          thresholdDetected: true
        }));

        console.log(`[DataVizPanel] Move count for ID ${currentDisplayBoulder.id} changed from ${currentDisplayBoulder.moves?.length || 0} to ${newMoves.length}`);
        
        const updatedBoulder: BoulderData = {
          ...currentDisplayBoulder,
          moves: newMoves,
          stats: {
            ...currentDisplayBoulder.stats,
            moveCount: newMoves.length,
            threshold: currentThreshold
          },
          appliedThreshold: currentThreshold
        };
        
        onBoulderDataUpdate(updatedBoulder);
      }
      
      updatePlot();
    }
  }, [currentDisplayBoulder, currentThreshold, calculateStats, updatePlot, onBoulderDataUpdate]);

  // Update plot when controls change
  useEffect(() => {
    if (currentDisplayBoulder?.csvData) {
      updatePlot();
    }
  }, [timeRange, visualizationMode, updatePlot, currentDisplayBoulder]);

  // Effect 2: Listen for external boulder selection changes
  useEffect(() => {
    const handleBoulderSelectionChanged = (event: CustomEvent) => {
      const { boulderId: eventBoulderId } = event.detail;
      if (eventBoulderId && eventBoulderId !== activeBoulderId) {
        console.log(`[DataVizPanel] External selection change to Boulder ID: ${eventBoulderId}, current active: ${activeBoulderId}`);
        setActiveBoulderId(eventBoulderId); 
      }
    };
    document.addEventListener('boulderSelectionChanged', handleBoulderSelectionChanged as EventListener);
    return () => {
      document.removeEventListener('boulderSelectionChanged', handleBoulderSelectionChanged as EventListener);
    };
  }, [activeBoulderId]);

  // Effect 3: Initialize activeBoulderId on first load if not set, using global or prop
  useEffect(() => {
    if (isVisible && activeBoulderId === undefined) {
        if (currentBoulderIdFromProps) {
            console.log(`[DataVizPanel] Initializing activeBoulderId from prop: ${currentBoulderIdFromProps}`);
            setActiveBoulderId(currentBoulderIdFromProps);
        } else if (globalSelectedBoulder) {
            console.log(`[DataVizPanel] Initializing activeBoulderId from global: ${globalSelectedBoulder.id}`);
            setActiveBoulderId(globalSelectedBoulder.id);
        } else if (boulders.length > 0) {
            console.log(`[DataVizPanel] Initializing activeBoulderId to first boulder: ${boulders[0].id}`);
            setActiveBoulderId(boulders[0].id);
        }
    }
   }, [isVisible, currentBoulderIdFromProps, globalSelectedBoulder, boulders, activeBoulderId]);

  if (!isVisible) return null

  return (
    <div className={`fixed top-6 left-6 z-40 transition-all duration-300 ${!isVisible ? '-translate-x-full opacity-0' : ''}`}>
      <div className="w-[900px] max-h-[calc(100vh-3rem)] overflow-y-auto">
        {/* Header */}
        <div className="glass-panel mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-lg">
              <BarChart className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-bold text-white">Data Analysis</h2>
            </div>
            <div className="text-sm text-muted">
              Boulder ID: {currentDisplayBoulder?.id || 'None'}
              {currentDisplayBoulder && ` (${currentDisplayBoulder.stats.sampleCount} pts)`}
            </div>
          </div>
        </div>

        {/* Top Controls Row */}
        <div className="grid grid-cols-2 gap-xl mb-8">
          {/* Left: Key Stats */}
          <div className="glass-panel">
            <h3 className="text-xl font-bold text-white mb-6">📊 Key Statistics</h3>
            
            {/* Key Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-lg">
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.moveCount}</div>
                <div className="text-sm text-muted">Moves</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.duration.toFixed(1)}s</div>
                <div className="text-sm text-muted">Duration</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-red-400">{stats.maxAccel.toFixed(1)}</div>
                <div className="text-sm text-muted">Max (m/s²)</div>
              </div>
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-green-400">{stats.avgAccel.toFixed(1)}</div>
                <div className="text-sm text-muted">Avg (m/s²)</div>
              </div>
            </div>
          </div>

          {/* Right: Analysis Controls */}
          <div className="glass-panel">
            <h3 className="text-xl font-bold text-white mb-6">🎯 Analysis Settings</h3>
            
            {/* Visualization Mode */}
            <div className="space-y-lg mb-6">
              <label className="text-sm font-medium text-white">Visualization:</label>
              <Select.Root value={visualizationMode} onValueChange={setVisualizationMode}>
                <Select.Trigger className="glass-select w-full flex items-center justify-between">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDownIcon className="w-4 h-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="glass-panel border-2 border-glass-border-hover z-50">
                    <Select.Viewport className="space-y-1">
                      <Select.Item value="standard" className="glass-btn glass-btn--secondary w-full text-left cursor-pointer hover:glass-btn--primary">
                        <Select.ItemText>Time Series</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="moves" className="glass-btn glass-btn--secondary w-full text-left cursor-pointer hover:glass-btn--primary">
                        <Select.ItemText>Move Detection</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="histogram" className="glass-btn glass-btn--secondary w-full text-left cursor-pointer hover:glass-btn--primary">
                        <Select.ItemText>Distribution</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            
            {/* Threshold */}
            <div className="space-y-lg mb-6">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Move Threshold</label>
                <span className="text-accent text-sm font-medium glass-card px-3 py-1 rounded-lg">
                  {currentThreshold.toFixed(1)} m/s²
                </span>
              </div>
              <ElasticSlider
                defaultValue={currentThreshold}
                startingValue={8}
                maxValue={50}
                isStepped={true}
                stepSize={0.5}
                className="w-full"
                onChange={(value) => setThreshold(currentDisplayBoulder?.id || 0, value)}
              />
            </div>

            {/* Time Range */}
            <div className="space-y-lg">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Time Range</label>
                <span className="text-accent text-sm font-medium glass-card px-3 py-1 rounded-lg">
                  {timeRange === 100 ? 'All' : `${timeRange}%`}
                </span>
              </div>
              <ElasticSlider
                defaultValue={timeRange}
                startingValue={10}
                maxValue={100}
                isStepped={true}
                stepSize={5}
                className="w-full"
                onChange={setTimeRange}
              />
            </div>
          </div>
        </div>

        {/* Statistics View Module */}
        <div className="space-y-xl">
          {/* Main Plot Area */}
          <div className="glass-panel">
            <div className="flex items-center gap-lg mb-6">
              <BarChart className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-bold text-white">
                {visualizationMode === 'standard' && 'Acceleration Time Series'}
                {visualizationMode === 'moves' && 'Move Detection Analysis'}
                {visualizationMode === 'histogram' && 'Acceleration Distribution'}
              </h3>
            </div>
            <div 
              ref={plotRef}
              className="w-full h-[500px] glass-card flex items-center justify-center"
            >
              {currentDisplayBoulder?.csvData ? (
                <canvas
                  className="w-full h-full rounded-xl"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <div className="text-muted text-center">
                  <BarChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a boulder to begin analysis</p>
                </div>
              )}
            </div>
          </div>

          {/* Full Width Statistics at Bottom */}
          <div className="glass-panel">
            <h3 className="text-lg font-bold text-white mb-6">📈 Complete Data Overview</h3>
            <div className="grid grid-cols-5 gap-lg">
              
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-red-400">{stats.maxAccel.toFixed(1)}</div>
                <div className="text-sm text-muted">Max (m/s²)</div>
              </div>
              
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-green-400">{stats.avgAccel.toFixed(1)}</div>
                <div className="text-sm text-muted">Avg (m/s²)</div>
              </div>
              
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.moveCount}</div>
                <div className="text-sm text-muted">Moves</div>
              </div>
              
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.duration.toFixed(1)}s</div>
                <div className="text-sm text-muted">Duration</div>
              </div>
              
              <div className="glass-card text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.sampleCount.toLocaleString()}</div>
                <div className="text-sm text-muted">Data Points</div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 