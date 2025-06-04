import { useState, useEffect, useCallback } from 'react'
import { loadAvailableBoulders, handleFileUpload } from '../utils/csvLoader'
import type { BoulderData } from '../utils/csvLoader'

interface UseCSVDataResult {
  boulders: BoulderData[]
  selectedBoulder: BoulderData | null
  isLoading: boolean
  error: string | null
  selectBoulder: (id: number) => void
  refreshBoulders: () => void
  uploadFile: (file: File) => Promise<void>
}

export function useCSVData(): UseCSVDataResult {
  const [boulders, setBoulders] = useState<BoulderData[]>([])
  const [selectedBoulder, setSelectedBoulder] = useState<BoulderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load saved boulders from localStorage (both Phyphox recordings and uploaded CSV files)
  const loadSavedBoulders = useCallback((): BoulderData[] => {
    try {
      const saved = localStorage.getItem('climbing-boulders')
      if (saved) {
        const savedBoulders = JSON.parse(saved)
        console.log('[useCSVData] Loaded saved boulders:', savedBoulders.length)
        
        // Convert saved data to BoulderData format
        return savedBoulders.map((saved: any, index: number) => {
          // Handle uploaded CSV files
          if (saved.source === 'csv-upload' && saved.csvData) {
            return {
              id: saved.id || (1000 + index),
              name: saved.name || saved.uploadedFile?.replace('.csv', '') || 'Uploaded CSV',
              grade: saved.grade || 'Unknown',
              type: 'csv',
              description: `Uploaded CSV file: ${saved.uploadedFile || 'Unknown'}`,
              csvFile: saved.uploadedFile || 'uploaded.csv',
              routeSetter: saved.routeSetter || 'Uploaded',
              moves: saved.moves || [],
              csvData: saved.csvData,
              stats: {
                duration: saved.csvData?.duration?.toFixed(1) || '0',
                maxAcceleration: saved.csvData?.maxAcceleration?.toFixed(2) || '0',
                avgAcceleration: saved.csvData?.avgAcceleration?.toFixed(2) || '0',
                moveCount: saved.numberOfMoves || 0,
                sampleCount: saved.csvData?.sampleCount || 0
              },
              uploadedFile: saved.uploadedFile,
              recordedAt: saved.recordedAt,
              source: 'csv-upload'
            }
          }
          
          // Handle Phyphox recordings (existing logic)
          return {
            id: saved.id || (1000 + index),
          name: saved.name,
          grade: saved.grade,
          type: 'phyphox',
          description: `Recorded with Phyphox on ${new Date(saved.recordedAt).toLocaleDateString()}`,
            csvFile: 'phyphox-recording.csv',
          routeSetter: saved.routeSetter,
          numberOfMoves: saved.numberOfMoves,
          moves: saved.moves || [],
          csvData: saved.rawData ? convertPhyphoxToCSV(saved.rawData) : null,
          stats: {
            duration: saved.rawData ? calculateDuration(saved.rawData) : '0',
            maxAcceleration: saved.rawData ? calculateMaxAcceleration(saved.rawData) : 0,
            avgAcceleration: saved.rawData ? calculateAvgAcceleration(saved.rawData) : 0,
              moveCount: saved.numberOfMoves || 0,
            sampleCount: saved.totalDataPoints || 0
          },
          phyphoxData: saved.rawData,
          recordedAt: saved.recordedAt,
          source: 'phyphox'
          }
        })
      }
    } catch (error) {
      console.error('[useCSVData] Error loading saved boulders:', error)
    }
    return []
  }, [])

  // Convert Phyphox raw data to CSV format for compatibility
  const convertPhyphoxToCSV = useCallback((rawData: any) => {
    if (!rawData || !rawData.acc_time || !rawData.accX || !rawData.accY || !rawData.accZ) {
      return null
    }
    
    const timeArray = rawData.acc_time.buffer || []
    const accXArray = rawData.accX.buffer || []
    const accYArray = rawData.accY.buffer || []
    const accZArray = rawData.accZ.buffer || []
    
    const time = timeArray.map((t: number) => t - timeArray[0]) // Normalize to start at 0
    const absoluteAcceleration = timeArray.map((_: number, i: number) => {
      const x = accXArray[i] || 0
      const y = accYArray[i] || 0  
      const z = accZArray[i] || 0
      return Math.sqrt(x * x + y * y + z * z)
    })
    
    return {
      time,
      absoluteAcceleration,
      filename: 'phyphox-recording.csv',
      duration: time.length > 0 ? time[time.length - 1] - time[0] : 0,
      maxAcceleration: Math.max(...absoluteAcceleration),
      avgAcceleration: absoluteAcceleration.reduce((a: number, b: number) => a + b, 0) / absoluteAcceleration.length,
      sampleCount: time.length
    }
  }, [])

  // Helper functions for statistics
  const calculateDuration = useCallback((rawData: any) => {
    if (rawData?.acc_time?.buffer) {
      const timeArray = rawData.acc_time.buffer
      return timeArray.length > 0 ? (timeArray[timeArray.length - 1] - timeArray[0]).toFixed(1) : '0'
    }
    return '0'
  }, [])

  const calculateMaxAcceleration = useCallback((rawData: any) => {
    if (rawData?.accX?.buffer && rawData?.accY?.buffer && rawData?.accZ?.buffer) {
      const magnitudes = rawData.accX.buffer.map((x: number, i: number) => {
        const y = rawData.accY.buffer[i] || 0
        const z = rawData.accZ.buffer[i] || 0
        return Math.sqrt(x * x + y * y + z * z)
      })
      return Math.max(...magnitudes)
    }
    return 0
  }, [])

  const calculateAvgAcceleration = useCallback((rawData: any) => {
    if (rawData?.accX?.buffer && rawData?.accY?.buffer && rawData?.accZ?.buffer) {
      const magnitudes = rawData.accX.buffer.map((x: number, i: number) => {
        const y = rawData.accY.buffer[i] || 0
        const z = rawData.accZ.buffer[i] || 0
        return Math.sqrt(x * x + y * y + z * z)
      })
      return magnitudes.reduce((a: number, b: number) => a + b, 0) / magnitudes.length
    }
    return 0
  }, [])

  const loadBoulders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Load CSV boulders and saved boulders (Phyphox + uploaded CSV)
      const [csvBoulders, savedBoulders] = await Promise.all([
        loadAvailableBoulders(),
        Promise.resolve(loadSavedBoulders())
      ])
      
      // Merge both types of boulders
      const allBoulders = [...csvBoulders, ...savedBoulders]
      console.log(`[useCSVData] Loaded ${allBoulders.length} total boulders (${csvBoulders.length} CSV + ${savedBoulders.length} saved)`)
      
      setBoulders(allBoulders)
      
      // Set first boulder as selected if none selected
      if (!selectedBoulder && allBoulders.length > 0) {
        setSelectedBoulder(allBoulders[0])
      }
    } catch (err) {
      console.error('[useCSVData] Error loading boulders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load boulder data')
    } finally {
      setIsLoading(false)
    }
  }, [loadSavedBoulders, selectedBoulder])

  const selectBoulder = useCallback((id: number) => {
    const boulder = boulders.find(b => b.id === id)
    if (boulder) {
      setSelectedBoulder(boulder)
      console.log('[useCSVData] Selected boulder:', boulder.name)
    }
  }, [boulders])

  const refreshBoulders = useCallback(() => {
    console.log('[useCSVData] Refreshing boulder list')
    loadBoulders()
  }, [loadBoulders])

  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsLoading(true)
      setError(null)
      
      await handleFileUpload(file)
      
      // Refresh boulders after upload
      await loadBoulders()
    } catch (err) {
      console.error('[useCSVData] Error uploading file:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadBoulders])

  // Load boulders on mount
  useEffect(() => {
    loadBoulders()
  }, [loadBoulders])

  // Listen for new boulder saves
  useEffect(() => {
    const handleBoulderSaved = () => {
      console.log('[useCSVData] New boulder saved, refreshing list')
      refreshBoulders()
    }
    
    window.addEventListener('boulderSaved', handleBoulderSaved)
    return () => window.removeEventListener('boulderSaved', handleBoulderSaved)
  }, [refreshBoulders])

  return {
    boulders,
    selectedBoulder,
    isLoading,
    error,
    selectBoulder,
    refreshBoulders,
    uploadFile
  }
} 