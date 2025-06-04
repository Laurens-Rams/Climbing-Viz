// CSV loading utilities for React components
export interface CSVData {
  time: number[]
  absoluteAcceleration: number[]
  filename: string
  duration: number
  maxAcceleration: number
  avgAcceleration: number
  sampleCount: number
}

// Import BoulderConfig to get saved thresholds
let getBoulderThreshold: ((id: number) => number) | null = null

// Function to set the threshold getter (called from App.tsx)
export function setBoulderThresholdGetter(getter: (id: number) => number) {
  getBoulderThreshold = getter
}

export interface BoulderData {
  id: number
  name: string
  grade?: string
  type: 'csv' | 'generated'
  description: string
  csvFile: string
  moves: Array<{
    move_number: number
    dynamics: number
    isCrux: boolean
    thresholdDetected?: boolean
    time?: number
    acceleration?: number
  }>
  csvData: CSVData
  stats: {
    duration: string
    maxAcceleration: string
    avgAcceleration: string
    moveCount: number
    sampleCount: number
    threshold?: number
  }
  appliedThreshold?: number
  lastUpdated?: number
  source?: 'csv' | 'csv-upload' | 'phyphox' | 'live' | 'generated'
}

// Parse Phyphox CSV format
export function parsePhyphoxCSV(csvText: string, filename: string): CSVData {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file is too short')
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  console.log('CSV Headers:', headers)

  // Find required columns - improved detection
  let timeCol = -1, absAccelCol = -1
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase()
    // Look for time column
    if (header.includes('time') && header.includes('s')) {
      timeCol = i
    }
    // Look for absolute acceleration column - handle both m/s² and m/s^2 formats
    if (header.includes('absolute acceleration') || 
        (header.includes('absolute') && header.includes('acceleration')) ||
        (header.includes('absolute') && (header.includes('m/s²') || header.includes('m/s^2')))) {
      absAccelCol = i
    }
  }

  if (timeCol === -1) {
    throw new Error('Could not find time column in CSV. Expected column with "time" and "s".')
  }
  if (absAccelCol === -1) {
    throw new Error('Could not find absolute acceleration column in CSV. Expected column with "absolute acceleration".')
  }

  console.log(`Found columns - Time: ${timeCol} (${headers[timeCol]}), Absolute Acceleration: ${absAccelCol} (${headers[absAccelCol]})`)

  // Parse data
  const time: number[] = []
  const absoluteAcceleration: number[] = []
  let validRows = 0

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => {
      const trimmed = v.trim().replace(/"/g, '')
      // Handle scientific notation properly and regular numbers
      const num = parseFloat(trimmed)
      return isNaN(num) ? 0 : num
    })

    if (values.length <= Math.max(timeCol, absAccelCol)) continue

    const timeVal = values[timeCol]
    const accelVal = values[absAccelCol]

    // More lenient validation - allow zero acceleration values and handle scientific notation
    if (!isNaN(timeVal) && !isNaN(accelVal) && isFinite(timeVal) && isFinite(accelVal) && accelVal >= 0) {
      time.push(timeVal)
      absoluteAcceleration.push(accelVal)
      validRows++
    }
  }

  if (validRows === 0) {
    throw new Error('No valid data rows found in CSV')
  }

  const duration = Math.max(...time) - Math.min(...time)
  const maxAcceleration = Math.max(...absoluteAcceleration)
  const avgAcceleration = absoluteAcceleration.reduce((a, b) => a + b, 0) / absoluteAcceleration.length

  console.log(`Parsed ${validRows} valid data points. Duration: ${duration.toFixed(2)}s, Max Accel: ${maxAcceleration.toFixed(2)} m/s²`)

  return {
    time,
    absoluteAcceleration,
    filename,
    duration,
    maxAcceleration,
    avgAcceleration,
    sampleCount: validRows
  }
}

// Convert CSV data to boulder format - NO MOVE DETECTION, only raw data
export function convertCSVToBoulder(csvData: CSVData, id: number): BoulderData {
  console.log(`🗂️ [csvLoader] Converting boulder ${id} - RAW DATA ONLY (no move detection)`)
  
  // Estimate grade based on acceleration characteristics
  const maxAccel = csvData.maxAcceleration
  let grade = 'V0'
  if (maxAccel > 25) grade = 'V10+'
  else if (maxAccel > 20) grade = 'V7-V9'
  else if (maxAccel > 18) grade = 'V5-V6'
  else if (maxAccel > 15) grade = 'V3-V4'
  else if (maxAccel > 12) grade = 'V1-V2'
  
  // Use original filename only, remove path and extension
  const cleanName = csvData.filename.replace(/^.*\//, '').replace('.csv', '')
  
  return {
    id,
    name: cleanName,
    grade,
    type: 'csv',
    description: `${csvData.duration.toFixed(1)}s duration, moves will be calculated by global store`,
    csvFile: csvData.filename.replace(/^.*\//, ''),
    moves: [], // Empty moves array - global store will calculate these
    csvData,
    stats: {
      duration: csvData.duration.toFixed(1),
      maxAcceleration: csvData.maxAcceleration.toFixed(2),
      avgAcceleration: csvData.avgAcceleration.toFixed(2),
      moveCount: 0, // Will be calculated by global store
      sampleCount: csvData.sampleCount
    }
  }
}

// Cache for CSV discovery to prevent repeated requests
let csvDiscoveryCache: { files: string[], timestamp: number } | null = null
const CACHE_DURATION = 30000 // 30 seconds

// Discover available CSV files
export async function discoverCSVFiles(): Promise<string[]> {
  // Check cache first
  if (csvDiscoveryCache && (Date.now() - csvDiscoveryCache.timestamp) < CACHE_DURATION) {
    console.log('🔍 Using cached CSV discovery results')
    return csvDiscoveryCache.files
  }
  
  console.log('🔍 Starting CSV file discovery...')
  
  // No CSV files in project - user prefers local storage
  const csvFiles: string[] = []
  
  console.log('🔍 No CSV files configured - using local storage only')
  
  // Cache the results
  csvDiscoveryCache = {
    files: csvFiles,
    timestamp: Date.now()
  }
  
  console.log(`🧗‍♂️ Discovered ${csvFiles.length} CSV files (using local storage)`)
  return csvFiles
}

// Helper function to validate CSV content
function isValidCSVContent(text: string, filepath: string): boolean {
  // Check if it's HTML (common for 404 pages)
  if (text.trim().startsWith('<!DOCTYPE html>') || 
      text.trim().startsWith('<html') ||
      text.includes('<title>') ||
      text.includes('window.$RefreshReg$')) {
    console.log(`❌ File ${filepath} is HTML, not CSV`)
    return false
  }
  
  // Check if it has CSV characteristics
  const lines = text.trim().split('\n')
  if (lines.length < 2) {
    console.log(`❌ File ${filepath} too short to be valid CSV`)
    return false
  }
  
  const firstLine = lines[0]
  const hasCommas = firstLine.includes(',')
  const hasTime = firstLine.toLowerCase().includes('time')
  const hasAcceleration = firstLine.toLowerCase().includes('acceleration')
  
  const isValid = hasCommas && (hasTime || hasAcceleration)
  
  if (!isValid) {
    console.log(`❌ File ${filepath} failed validation:`, {
      hasCommas,
      hasTime,
      hasAcceleration,
      preview: firstLine.substring(0, 100)
    })
  }
  
  return isValid
}

// Load CSV file from URL
export async function loadCSVFile(filepath: string): Promise<CSVData> {
  try {
    console.log(`Loading CSV file: ${filepath}`)
    const response = await fetch(filepath)
    
    if (!response.ok) {
      throw new Error(`Failed to load ${filepath}: ${response.status}`)
    }
    
    const csvText = await response.text()
    const csvData = parsePhyphoxCSV(csvText, filepath)
    
    console.log(`Successfully loaded CSV: ${filepath}`)
    return csvData
    
  } catch (error) {
    console.error(`Error loading CSV file ${filepath}:`, error)
    throw error
  }
}

// Load all available boulders
export async function loadAvailableBoulders(): Promise<BoulderData[]> {
  const boulders: BoulderData[] = []
  
  try {
    const csvFiles = await discoverCSVFiles()
    
    for (let i = 0; i < csvFiles.length; i++) {
      const filepath = csvFiles[i]
      
      try {
        const csvData = await loadCSVFile(filepath)
        const boulder = convertCSVToBoulder(csvData, i + 1)
        boulders.push(boulder)
      } catch (error) {
        console.error(`Failed to load boulder from ${filepath}:`, error)
        // Continue with other files
      }
    }
    
    console.log(`Loaded ${boulders.length} boulders from CSV files`)
    return boulders
  } catch (error) {
    console.error('Error loading available boulders:', error)
    return []
  }
}

// Handle file upload
export async function handleFileUpload(file: File): Promise<BoulderData> {
  if (!file.name.endsWith('.csv')) {
    throw new Error('Please select a CSV file')
  }
  
  try {
    const text = await file.text()
    const csvData = parsePhyphoxCSV(text, file.name)
    const boulder = convertCSVToBoulder(csvData, Date.now())
    
    // Save to localStorage so it persists
    const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
    
    // Create a boulder data object compatible with localStorage format
    const boulderForStorage = {
      id: boulder.id,
      name: file.name.replace('.csv', ''), // Use filename as name
      grade: 'Unknown', // Default grade
      gradeSystem: 'V-Scale',
      routeSetter: 'Uploaded',
      numberOfMoves: 0, // Will be calculated by move detection
      date: new Date().toISOString().split('T')[0], // Today's date
      recordedAt: new Date().toISOString(),
      moves: [],
      rawData: {
        // Convert CSV data back to Phyphox-like format for compatibility
        acc_time: { buffer: csvData.time },
        accX: { buffer: csvData.time.map(() => 0) }, // Placeholder - we don't have individual axes
        accY: { buffer: csvData.time.map(() => 0) }, // Placeholder
        accZ: { buffer: csvData.absoluteAcceleration } // Store absolute acceleration as Z
      },
      source: 'csv-upload',
      totalDataPoints: csvData.sampleCount,
      uploadedFile: file.name,
      csvData: csvData // Store original CSV data for compatibility
    }
    
    existingBoulders.push(boulderForStorage)
    localStorage.setItem('climbing-boulders', JSON.stringify(existingBoulders))
    
    console.log('Successfully saved uploaded CSV to localStorage:', file.name)
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('boulderSaved', { 
      detail: { boulder: boulderForStorage } 
    }))
    
    return boulder
  } catch (error) {
    console.error('Error processing uploaded file:', error)
    throw error
  }
}