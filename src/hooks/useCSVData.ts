import { useState, useEffect, useCallback, useRef } from 'react'
import { BoulderData, loadAvailableBoulders, handleFileUpload } from '../utils/csvLoader'

interface UseCSVDataResult {
  boulders: BoulderData[]
  selectedBoulder: BoulderData | null
  isLoading: boolean
  error: string | null
  selectBoulder: (boulderId: number) => void
  uploadFile: (file: File) => Promise<void>
  refreshBoulders: () => Promise<void>
}

export function useCSVData(): UseCSVDataResult {
  const [boulders, setBoulders] = useState<BoulderData[]>([])
  const [selectedBoulder, setSelectedBoulder] = useState<BoulderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false) // Use ref to prevent dependency cycles

  const loadBoulders = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('Boulder loading already in progress, skipping...')
      return
    }
    
    try {
      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)
      console.log('Starting to load boulders...')
      
      const loadedBoulders = await loadAvailableBoulders()
      console.log('Loaded boulders:', loadedBoulders.length, loadedBoulders.map(b => b.name))
      
      setBoulders(loadedBoulders)
      
      // Auto-select first boulder if none selected and we have boulders
      if (loadedBoulders.length > 0) {
        setSelectedBoulder(prev => {
          const selected = prev || loadedBoulders[0]
          console.log('Selected boulder:', selected.name)
          
          // Show success message
          if (loadedBoulders.length > 1) {
            console.log(`✅ Successfully loaded ${loadedBoulders.length} CSV files! Switch to "📊 Data Analysis" to select and analyze different files.`)
          }
          
          return selected
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boulders')
      console.error('Error loading boulders:', err)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, []) // Remove isLoadingRef from dependencies since it's now a ref

  const selectBoulder = useCallback((boulderId: number) => {
    const boulder = boulders.find(b => b.id === boulderId)
    if (boulder) {
      console.log('Selecting boulder:', boulder.name, 'ID:', boulderId)
      setSelectedBoulder(boulder)
    } else {
      console.warn('Boulder not found with ID:', boulderId)
    }
  }, [boulders])

  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const newBoulder = await handleFileUpload(file)
      
      // Add to the boulder list
      setBoulders(prev => [...prev, newBoulder])
      setSelectedBoulder(newBoulder)
      
      console.log('File uploaded successfully:', newBoulder.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      console.error('Error uploading file:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshBoulders = useCallback(async () => {
    await loadBoulders()
  }, [loadBoulders])

  // Load boulders on mount
  useEffect(() => {
    loadBoulders()
  }, [loadBoulders])

  return {
    boulders,
    selectedBoulder,
    isLoading,
    error,
    selectBoulder,
    uploadFile,
    refreshBoulders
  }
} 