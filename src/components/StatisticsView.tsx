import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import type { BoulderData } from '../utils/csvLoader'
import { useBoulderConfig } from '../context/BoulderConfigContext'
import { getVisualizationState, updateVisualizerSettings } from '../store/visualizationStore'
import { BarChart3, Settings, Save } from 'lucide-react'

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

interface CropSelection {
  startTime: number
  endTime: number
  isSelecting: boolean
  startX: number
  endX: number
}

export function StatisticsView({ selectedBoulder, onBoulderDataUpdate, isControlPanelVisible }: StatisticsViewProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { getThreshold } = useBoulderConfig()
  
  // Cropping state
  const [cropSelection, setCropSelection] = useState<CropSelection | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [cropStartTime, setCropStartTime] = useState<string>('')
  const [cropEndTime, setCropEndTime] = useState<string>('')
  const [showCropPreview, setShowCropPreview] = useState(false)
  
  // Smoothing state - always enabled with heavy smoothing
  const smoothingEnabled = true
  const smoothingStrength = 10
  const baselineThreshold = 2.0
  
  // Settings persistence
  const [settingsChanged, setSettingsChanged] = useState(false)
  
  // Get data from global store instead of calculating locally
  const vizState = getVisualizationState()
  const currentThreshold = vizState.visualizerSettings.moveThreshold // Use moveThreshold from settings
  const globalMoves = vizState.processedMoves || []

  // Get all move detection settings from global store
  const moveDetectionSettings = useMemo(() => ({
    moveThreshold: vizState.visualizerSettings.moveThreshold,
    minStillDuration: vizState.visualizerSettings.minStillDuration,
    minMoveDuration: vizState.visualizerSettings.minMoveDuration,
    maxMoveDuration: vizState.visualizerSettings.maxMoveDuration,
    maxMoveSequence: vizState.visualizerSettings.maxMoveSequence
  }), [vizState.visualizerSettings])

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
      moveCount: globalMoves.length, // This includes the start move
      duration: selectedBoulder.csvData.duration,
      sampleCount: selectedBoulder.csvData.sampleCount
    };
  }, [selectedBoulder, globalMoves.length]);

  // Smoothing function
  const smoothData = useCallback((data: number[], strength: number, threshold: number) => {
    if (!smoothingEnabled || strength <= 1) return data
    
    const smoothed = [...data]
    const windowSize = Math.min(strength * 2 + 1, 15) // Max window of 15 points
    
    for (let i = 0; i < data.length; i++) {
      // Apply more aggressive smoothing for low values
      const currentValue = data[i]
      const adaptiveStrength = currentValue < threshold ? strength * 2 : strength
      const adaptiveWindow = Math.min(adaptiveStrength * 2 + 1, windowSize)
      
      const halfWindow = Math.floor(adaptiveWindow / 2)
      const start = Math.max(0, i - halfWindow)
      const end = Math.min(data.length - 1, i + halfWindow)
      
      let sum = 0
      let count = 0
      
      for (let j = start; j <= end; j++) {
        // Weight center points more heavily
        const weight = 1 - Math.abs(j - i) / halfWindow
        sum += data[j] * weight
        count += weight
      }
      
      smoothed[i] = count > 0 ? sum / count : currentValue
    }
    
    return smoothed
  }, [smoothingEnabled])

  // Apply cropping to data
  const getCroppedData = useCallback(() => {
    if (!selectedBoulder?.csvData) return null
    
    const { time, absoluteAcceleration } = selectedBoulder.csvData
    
    // Apply smoothing first
    const smoothedAcceleration = smoothData(absoluteAcceleration, smoothingStrength, baselineThreshold)
    
    // Apply cropping if selection exists
    if (showCropPreview && cropSelection && cropStartTime && cropEndTime) {
      const startTime = parseFloat(cropStartTime)
      const endTime = parseFloat(cropEndTime)
      
      const startIndex = time.findIndex(t => t >= startTime)
      const endIndex = time.findIndex(t => t >= endTime)
      
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        return {
          time: time.slice(startIndex, endIndex + 1).map(t => t - time[startIndex]), // Normalize to start at 0
          absoluteAcceleration: smoothedAcceleration.slice(startIndex, endIndex + 1),
          originalStartIndex: startIndex,
          originalEndIndex: endIndex
        }
      }
    }
    
    return {
      time,
      absoluteAcceleration: smoothedAcceleration,
      originalStartIndex: 0,
      originalEndIndex: time.length - 1
    }
  }, [selectedBoulder, smoothData, smoothingStrength, baselineThreshold, showCropPreview, cropSelection, cropStartTime, cropEndTime])

  // Convert canvas coordinates to time
  const canvasToTime = useCallback((x: number) => {
    if (!selectedBoulder?.csvData || !canvasRef.current) return 0
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const padding = { left: 80, right: 40 }
    const plotWidth = rect.width - padding.left - padding.right
    
    const relativeX = x - rect.left - padding.left
    const timeRatio = relativeX / plotWidth
    
    const { time } = selectedBoulder.csvData
    const minTime = Math.min(...time)
    const maxTime = Math.max(...time)
    
    return minTime + timeRatio * (maxTime - minTime)
  }, [selectedBoulder])

  // Mouse event handlers for cropping
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedBoulder?.csvData) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const time = canvasToTime(event.clientX)
    
    setIsMouseDown(true)
    setCropSelection({
      startTime: time,
      endTime: time,
      isSelecting: true,
      startX: x,
      endX: x
    })
    setCropStartTime(time.toFixed(2))
    setCropEndTime(time.toFixed(2))
  }, [selectedBoulder, canvasToTime])

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown || !cropSelection) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const time = canvasToTime(event.clientX)
    
    setCropSelection(prev => prev ? {
      ...prev,
      endTime: time,
      endX: x
    } : null)
    setCropEndTime(time.toFixed(2))
  }, [isMouseDown, cropSelection, canvasToTime])

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false)
    if (cropSelection) {
      setCropSelection(prev => prev ? { ...prev, isSelecting: false } : null)
      setShowCropPreview(true)
    }
  }, [cropSelection])

  // Apply crop to boulder data
  const applyCrop = useCallback(async () => {
    if (!selectedBoulder?.csvData || !cropStartTime || !cropEndTime) {
      console.error('[StatisticsView] Missing data for crop:', { 
        hasData: !!selectedBoulder?.csvData, 
        startTime: cropStartTime, 
        endTime: cropEndTime 
      })
      return
    }
    
    const startTime = parseFloat(cropStartTime)
    const endTime = parseFloat(cropEndTime)
    
    if (startTime >= endTime) {
      alert('End time must be greater than start time!')
      return
    }
    
    console.log(`[StatisticsView] Starting crop operation: ${startTime}s - ${endTime}s`)
    
    const { time, absoluteAcceleration } = selectedBoulder.csvData
    const startIndex = time.findIndex(t => t >= startTime)
    const endIndex = time.findIndex(t => t >= endTime)
    
    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      alert('Invalid time range selected!')
      console.error('[StatisticsView] Invalid indices:', { startIndex, endIndex, timeRange: [startTime, endTime] })
      return
    }
    
    try {
      // Create cropped data
      const croppedTime = time.slice(startIndex, endIndex + 1)
      const croppedAcceleration = absoluteAcceleration.slice(startIndex, endIndex + 1)
      
      // Apply smoothing to cropped data
      const smoothedAcceleration = smoothData(croppedAcceleration, smoothingStrength, baselineThreshold)
      
      // Normalize time to start at 0
      const normalizedTime = croppedTime.map(t => t - croppedTime[0])
      
      // Create new CSV data
      const newCsvData = {
        ...selectedBoulder.csvData,
        time: normalizedTime,
        absoluteAcceleration: smoothedAcceleration,
        duration: normalizedTime[normalizedTime.length - 1] - normalizedTime[0],
        maxAcceleration: Math.max(...smoothedAcceleration),
        avgAcceleration: smoothedAcceleration.reduce((a, b) => a + b, 0) / smoothedAcceleration.length,
        sampleCount: normalizedTime.length
      }
      
      console.log(`[StatisticsView] Created new CSV data:`, {
        originalLength: time.length,
        croppedLength: normalizedTime.length,
        newDuration: newCsvData.duration,
        newMaxAccel: newCsvData.maxAcceleration
      })
      
      // Update boulder data
      const updatedBoulder = {
        ...selectedBoulder,
        csvData: newCsvData,
        stats: {
          ...selectedBoulder.stats,
          duration: newCsvData.duration.toFixed(1),
          maxAcceleration: newCsvData.maxAcceleration.toFixed(2),
          avgAcceleration: newCsvData.avgAcceleration.toFixed(2),
          sampleCount: newCsvData.sampleCount
        }
      }
      
      // Update localStorage if this is a saved boulder
      if (selectedBoulder.source === 'csv-upload' || selectedBoulder.source === 'phyphox') {
        const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
        const boulderIndex = existingBoulders.findIndex((b: any) => b.id === selectedBoulder.id)
        
        if (boulderIndex !== -1) {
          // Update the stored boulder data
          existingBoulders[boulderIndex] = {
            ...existingBoulders[boulderIndex],
            csvData: newCsvData,
            stats: updatedBoulder.stats,
            rawData: selectedBoulder.source === 'phyphox' ? {
              acc_time: { buffer: normalizedTime },
              accX: { buffer: normalizedTime.map(() => 0) },
              accY: { buffer: normalizedTime.map(() => 0) },
              accZ: { buffer: smoothedAcceleration }
            } : undefined
          }
          
          localStorage.setItem('climbing-boulders', JSON.stringify(existingBoulders))
          console.log(`[StatisticsView] Updated localStorage for boulder ${selectedBoulder.id}`)
          
          // Dispatch event to refresh boulder list
          window.dispatchEvent(new CustomEvent('boulderSaved', { 
            detail: { boulder: existingBoulders[boulderIndex] } 
          }))
        } else {
          console.warn(`[StatisticsView] Boulder ${selectedBoulder.id} not found in localStorage`)
        }
      }
      
      // Update the component - this should trigger a re-render and global store update
      console.log(`[StatisticsView] Calling onBoulderDataUpdate with updated boulder`)
      onBoulderDataUpdate(updatedBoulder)
      
      // Force refresh the boulder list to pick up changes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBoulders'))
      }, 100)
      
      // Reset crop selection
      setCropSelection(null)
      setShowCropPreview(false)
      setCropStartTime('')
      setCropEndTime('')
      
      console.log(`[StatisticsView] ✅ Applied crop: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s with smoothing: ${smoothingEnabled ? smoothingStrength : 'disabled'}`)
      
    } catch (error) {
      console.error('[StatisticsView] Error during crop operation:', error)
      alert('Error applying crop: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [selectedBoulder, cropStartTime, cropEndTime, smoothData, smoothingStrength, baselineThreshold, onBoulderDataUpdate, smoothingEnabled])

  // Canvas plot rendering
  const updatePlot = useCallback(() => {
    if (!selectedBoulder?.csvData || !plotRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      const croppedData = getCroppedData()
      if (!croppedData) return
      
      const { time, absoluteAcceleration } = croppedData
      
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
      const padding = { top: 80, right: 40, bottom: 80, left: 80 }
      const plotWidth = rect.width - padding.left - padding.right
      const plotHeight = rect.height - padding.top - padding.bottom

      // Scales
      const minTime = Math.min(...time)
      const maxTime = Math.max(...time)
      const minAccel = 0
      const dataMaxAccel = Math.max(...absoluteAcceleration, currentThreshold + 5)
      const maxAccel = dataMaxAccel * 1.2 // Add 20% headroom so peaks don't hit the top

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

      // Movement threshold line - this is the key threshold
      ctx.strokeStyle = '#00ff00' // Green for the main threshold
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      const thresholdY = yScale(currentThreshold)
      ctx.beginPath()
      ctx.moveTo(padding.left, thresholdY)
      ctx.lineTo(padding.left + plotWidth, thresholdY)
      ctx.stroke()
      ctx.setLineDash([])
      
      ctx.fillStyle = '#00ff00'
      ctx.font = 'bold 12px Arial'
      ctx.fillText(`Move Detection: ${currentThreshold}m/s²`, padding.left + 10, thresholdY - 8)

      // Draw detected moves as shaded regions (only if not in crop preview mode)
      if (!showCropPreview) {
      globalMoves.forEach((move, index) => {
        if (index === 0) return // Skip start move
        
        const startX = xScale(move.startTime)
        const endX = xScale(move.endTime)
        
        // Shade the move period - green for normal, orange for crux
        ctx.fillStyle = move.isCrux ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'
        ctx.fillRect(startX, padding.top, endX - startX, plotHeight)
        
        // Draw vertical lines at move boundaries
        ctx.strokeStyle = move.isCrux ? '#f59e0b' : '#22c55e'
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
      }

      // Data line
      ctx.strokeStyle = showCropPreview ? '#ff6b35' : '#00ffcc' // Orange for preview, cyan for normal
      ctx.lineWidth = 2.3 // Reduced from 3 to 2.4 (80% of original)
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

      // Draw crop selection overlay
      if (cropSelection && isMouseDown) {
        const startX = Math.min(cropSelection.startX, cropSelection.endX)
        const endX = Math.max(cropSelection.startX, cropSelection.endX)
        
        // Selection rectangle
        ctx.fillStyle = 'rgba(255, 107, 53, 0.2)'
        ctx.fillRect(startX, padding.top, endX - startX, plotHeight)
        
        // Selection borders
        ctx.strokeStyle = '#ff6b35'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(startX, padding.top)
        ctx.lineTo(startX, padding.top + plotHeight)
        ctx.moveTo(endX, padding.top)
        ctx.lineTo(endX, padding.top + plotHeight)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Move markers - use global store moves instead of local detection (only if not in crop preview)
      if (!showCropPreview) {
      globalMoves.forEach((move, index) => {
        if (index === 0) return // Skip start move
        
        // Calculate center time of the move span
        const centerTime = (move.startTime + move.endTime) / 2
        const centerX = xScale(centerTime)
        
        // Use the average acceleration from the move range instead of peak
        const avgAccel = move.accelerationRange?.avg || move.acceleration
        const centerY = yScale(avgAccel)
        
        // Draw dot at center of move span
        ctx.fillStyle = move.isCrux ? '#f59e0b' : '#22c55e'
        ctx.beginPath()
        ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI)
        ctx.fill()
        
        // Add move label at the top of the graph - use correct index for labeling
        const labelY = padding.top - 10 // Moved up from -5 to -10
        ctx.fillStyle = move.isCrux ? '#f59e0b' : '#22c55e'
        ctx.font = 'bold 13px Arial' // Increased from 11px
        ctx.textAlign = 'center'
        ctx.fillText(`Move ${index}`, centerX, labelY) // Use raw index since start move is at index 0
        
        // Add average strength below the move label
        ctx.font = 'bold 11px Arial' // Increased from 9px and made bold
        ctx.fillStyle = '#ddd' // Lighter color from #999
        ctx.fillText(`${avgAccel.toFixed(1)} m/s²`, centerX, labelY + 16) // Moved down from +12 to +16
      })
      }

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
      ctx.fillStyle = showCropPreview ? '#ff6b35' : '#00ffcc'
      ctx.font = 'bold 16px Arial'
      
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
      ctx.font = 'bold 20px Arial'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      const title = showCropPreview ? 'Move Detection Analysis - CROP PREVIEW' : 'Move Detection Analysis'
      ctx.fillText(title, padding.left, 25)

      // Axis labels
      ctx.font = 'bold 12px Arial'
      ctx.fillStyle = '#ccc'
      
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
  }, [selectedBoulder, currentThreshold, globalMoves, getCroppedData, cropSelection, isMouseDown, showCropPreview])

  // Update plot when data changes
  useEffect(() => {
    if (selectedBoulder?.csvData) {
      updatePlot()
    }
  }, [selectedBoulder, currentThreshold, globalMoves, updatePlot])

  // Apply saved move detection settings to global store
  const applySavedMoveDetectionSettings = useCallback((settings: any) => {
    if (settings.moveThreshold !== undefined ||
        settings.minStillDuration !== undefined ||
        settings.minMoveDuration !== undefined ||
        settings.maxMoveDuration !== undefined ||
        settings.maxMoveSequence !== undefined) {
      
      const moveDetectionUpdates: any = {}
      
      if (settings.moveThreshold !== undefined) moveDetectionUpdates.moveThreshold = settings.moveThreshold
      if (settings.minStillDuration !== undefined) moveDetectionUpdates.minStillDuration = settings.minStillDuration
      if (settings.minMoveDuration !== undefined) moveDetectionUpdates.minMoveDuration = settings.minMoveDuration
      if (settings.maxMoveDuration !== undefined) moveDetectionUpdates.maxMoveDuration = settings.maxMoveDuration
      if (settings.maxMoveSequence !== undefined) moveDetectionUpdates.maxMoveSequence = settings.maxMoveSequence
      
      console.log(`🔧 [StatisticsView] Applying saved move detection settings:`, moveDetectionUpdates)
      updateVisualizerSettings(moveDetectionUpdates)
    }
  }, [])

  // Load saved settings for this boulder
  useEffect(() => {
    if (selectedBoulder?.id) {
      const savedSettings = localStorage.getItem(`boulder-settings-${selectedBoulder.id}`)
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          // Apply saved move detection settings to global store
          applySavedMoveDetectionSettings(settings)
          
          console.log(`🗂️ Loaded saved settings for boulder ${selectedBoulder.id}:`, settings)
        } catch (error) {
          console.error('Error loading boulder settings:', error)
        }
      }
      setSettingsChanged(false)
    }
  }, [selectedBoulder?.id, applySavedMoveDetectionSettings])

  // Track when settings change
  useEffect(() => {
    setSettingsChanged(true)
  }, [moveDetectionSettings])

  // Save settings for this boulder
  const saveSettings = useCallback(() => {
    if (!selectedBoulder?.id) return
    
    const settings = {
      // Move detection algorithm settings
      moveThreshold: moveDetectionSettings.moveThreshold,
      minStillDuration: moveDetectionSettings.minStillDuration,
      minMoveDuration: moveDetectionSettings.minMoveDuration,
      maxMoveDuration: moveDetectionSettings.maxMoveDuration,
      maxMoveSequence: moveDetectionSettings.maxMoveSequence,
      
      // Metadata
      savedAt: new Date().toISOString()
    }
    
    localStorage.setItem(`boulder-settings-${selectedBoulder.id}`, JSON.stringify(settings))
    setSettingsChanged(false)
    
    console.log(`💾 Saved settings for boulder ${selectedBoulder.id}:`, settings)
    
    // Show a brief success message
    const button = document.querySelector('#save-settings-btn') as HTMLButtonElement
    if (button) {
      const originalText = button.textContent
      button.textContent = '✅ Saved!'
      button.style.backgroundColor = 'rgba(34, 197, 94, 0.3)'
      setTimeout(() => {
        button.textContent = originalText
        button.style.backgroundColor = ''
      }, 2000)
    }
  }, [selectedBoulder?.id, moveDetectionSettings])

  // Check if settings exist for this boulder
  const hasExistingSettings = useMemo(() => {
    if (!selectedBoulder?.id) return false
    return localStorage.getItem(`boulder-settings-${selectedBoulder.id}`) !== null
  }, [selectedBoulder?.id])

  // Listen for crop events from ControlPanel
  useEffect(() => {
    const handleCropPreview = (event: CustomEvent) => {
      const { startTime, endTime } = event.detail
      console.log(`[StatisticsView] 🔍 Crop preview event received: ${startTime}s - ${endTime}s`)
      setCropStartTime(startTime.toString())
      setCropEndTime(endTime.toString())
      setShowCropPreview(true)
      
      // Create crop selection for visual feedback
      setCropSelection({
        startTime,
        endTime,
        isSelecting: false,
        startX: 0,
        endX: 0
      })
      
      console.log(`[StatisticsView] 🔍 Crop preview state updated, triggering plot refresh`)
    }
    
    const handleCropApply = (event: CustomEvent) => {
      const { startTime, endTime } = event.detail
      console.log(`[StatisticsView] ✂️ Crop apply event received: ${startTime}s - ${endTime}s`)
      setCropStartTime(startTime.toString())
      setCropEndTime(endTime.toString())
      
      // Call applyCrop directly
      console.log(`[StatisticsView] ✂️ Calling applyCrop function`)
      applyCrop()
    }
    
    console.log(`[StatisticsView] 📡 Setting up crop event listeners`)
    window.addEventListener('cropPreview', handleCropPreview as EventListener)
    window.addEventListener('cropApply', handleCropApply as EventListener)
    
    return () => {
      console.log(`[StatisticsView] 📡 Removing crop event listeners`)
      window.removeEventListener('cropPreview', handleCropPreview as EventListener)
      window.removeEventListener('cropApply', handleCropApply as EventListener)
    }
  }, [applyCrop])

  if (!selectedBoulder?.csvData) {
    return (
      <div className={`h-full flex items-center justify-center transition-all duration-300 ${isControlPanelVisible ? 'mr-[25rem]' : 'mr-0'}`}>
        <div className="text-center text-gray-400">
          <div className="mb-4 flex justify-center">
            <BarChart3 size={64} className="text-cyan-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Data Selected</h2>
          <p>Select a boulder from the control panel to view statistics</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${isControlPanelVisible ? 'mr-[25rem]' : 'mr-0'} p-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-cyan-400">
              {selectedBoulder.name}
            </h1>
            {hasExistingSettings && (
              <span className="text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20 flex items-center gap-1">
                <Settings size={14} />
                Custom Settings
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-bold text-blue-400">{stats.moveCount}</div>
          <div className="text-xs text-gray-400">Moves Detected</div>
        </div>
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-bold text-yellow-400">{stats.duration.toFixed(1)}s</div>
          <div className="text-xs text-gray-400">Duration</div>
        </div>
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-bold text-red-400">{stats.maxAccel.toFixed(1)}</div>
          <div className="text-xs text-gray-400">Max Acceleration</div>
        </div>
        <div className="bg-black/70 border border-cyan-400/40 rounded-xl p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-bold text-green-400">{stats.avgAccel.toFixed(1)}</div>
          <div className="text-xs text-gray-400">Avg Acceleration</div>
        </div>
      </div>

      {/* Plot Area */}
      <div className="flex-1 bg-black/70 border border-cyan-400/40 rounded-xl p-8 backdrop-blur-sm">
        <div ref={plotRef} className="w-full h-full">
          <canvas 
            ref={canvasRef}
            className="w-full h-full cursor-crosshair" 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
    </div>
  )
} 