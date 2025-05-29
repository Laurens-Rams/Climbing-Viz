import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

export interface BoulderConfig {
  id: number
  name: string
  threshold: number
  grade?: string
  difficulty?: string
  notes?: string
  lastModified: Date
}

interface BoulderConfigContextType {
  configs: Map<number, BoulderConfig>
  getBoulderConfig: (boulderId: number, boulderName?: string) => BoulderConfig
  updateBoulderConfig: (boulderId: number, updates: Partial<BoulderConfig>) => void
  setThreshold: (boulderId: number, threshold: number) => void
  getThreshold: (boulderId: number) => number
  saveToDisk: () => void
  loadFromDisk: () => void
}

const BoulderConfigContext = createContext<BoulderConfigContextType | null>(null)

const DEFAULT_THRESHOLD = 12.0
const STORAGE_KEY = 'climbing-viz-boulder-configs'

export function BoulderConfigProvider({ children }: { children: React.ReactNode }) {
  const [configs, setConfigs] = useState<Map<number, BoulderConfig>>(new Map())

  // Load configs from localStorage on mount
  useEffect(() => {
    loadFromDisk()
  }, [])

  // Auto-save configs when they change
  useEffect(() => {
    if (configs.size > 0) {
      saveToDisk()
    }
  }, [configs])

  const getBoulderConfig = useCallback((boulderId: number, boulderName?: string): BoulderConfig => {
    const existing = configs.get(boulderId)
    if (existing) {
      return existing
    }

    // Create default config for new boulder
    const defaultConfig: BoulderConfig = {
      id: boulderId,
      name: boulderName || `Boulder ${boulderId}`,
      threshold: DEFAULT_THRESHOLD,
      lastModified: new Date()
    }

    setConfigs(prev => new Map(prev).set(boulderId, defaultConfig))
    return defaultConfig
  }, [configs])

  const updateBoulderConfig = useCallback((boulderId: number, updates: Partial<BoulderConfig>) => {
    setConfigs(prev => {
      const newConfigs = new Map(prev)
      const existing = newConfigs.get(boulderId) || {
        id: boulderId,
        name: `Boulder ${boulderId}`,
        threshold: DEFAULT_THRESHOLD,
        lastModified: new Date()
      }

      const updated = {
        ...existing,
        ...updates,
        lastModified: new Date()
      }

      newConfigs.set(boulderId, updated)
      return newConfigs
    })
  }, [])

  const setThreshold = useCallback((boulderId: number, threshold: number) => {
    console.log(`[BoulderConfig] Setting threshold for boulder ${boulderId} to ${threshold}m/s²`)
    updateBoulderConfig(boulderId, { threshold })
  }, [updateBoulderConfig])

  const getThreshold = useCallback((boulderId: number): number => {
    const config = configs.get(boulderId)
    return config?.threshold || DEFAULT_THRESHOLD
  }, [configs])

  const saveToDisk = useCallback(() => {
    try {
      const serialized = JSON.stringify(
        Array.from(configs.entries()).map(([id, config]) => [
          id,
          {
            ...config,
            lastModified: config.lastModified.toISOString()
          }
        ])
      )
      localStorage.setItem(STORAGE_KEY, serialized)
      console.log(`[BoulderConfig] Saved ${configs.size} boulder configurations`)
    } catch (error) {
      console.error('[BoulderConfig] Failed to save to localStorage:', error)
    }
  }, [configs])

  const loadFromDisk = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const configMap = new Map<number, BoulderConfig>()
        
        parsed.forEach(([id, config]: [number, any]) => {
          configMap.set(id, {
            ...config,
            lastModified: new Date(config.lastModified)
          })
        })
        
        setConfigs(configMap)
        console.log(`[BoulderConfig] Loaded ${configMap.size} boulder configurations`)
      }
    } catch (error) {
      console.error('[BoulderConfig] Failed to load from localStorage:', error)
    }
  }, [])

  const value: BoulderConfigContextType = {
    configs,
    getBoulderConfig,
    updateBoulderConfig,
    setThreshold,
    getThreshold,
    saveToDisk,
    loadFromDisk
  }

  return (
    <BoulderConfigContext.Provider value={value}>
      {children}
    </BoulderConfigContext.Provider>
  )
}

export function useBoulderConfig() {
  const context = useContext(BoulderConfigContext)
  if (!context) {
    throw new Error('useBoulderConfig must be used within a BoulderConfigProvider')
  }
  return context
} 