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

// Discover available CSV files
export async function discoverCSVFiles(): Promise<string[]> {
  const csvFiles: string[] = []
  
  // Define organized folder structure
  const folders = [
    'routes',      // Main climbing routes
    'samples',     // Sample/demo data  
    'live-recordings' // Live Phyphox recordings
  ]
  
  // Common CSV file patterns to try in each folder
  const commonPatterns = [
    'Sample1.csv',     // Add the specific file ART has
    'Raw Data.csv',
    'Raw Data2.csv', 
    'Raw Data3.csv',
    'rawdata.csv',
    'rawdata2.csv', 
    'rawdata3.csv',
    'data.csv',
    'climbing.csv',
    'acceleration.csv'
  ]
  
  // Search in organized folders
  for (const folder of folders) {
    console.log(`🔍 Searching for CSV files in /data/${folder}/`)
    
    // Try common patterns in this folder
    for (const filename of commonPatterns) {
      const filepath = `/data/${folder}/${filename}`
      console.log(`🔍 Trying to fetch: ${filepath}`)
      try {
        const response = await fetch(filepath)
        console.log(`📡 Response for ${filepath}: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`)
        if (response.ok) {
          const text = await response.text()
          console.log(`📄 File content preview for ${filepath}:`, text.substring(0, 200))
          
          // Validate that it's actually CSV content with Phyphox format
          if (!text.trim().startsWith('<!DOCTYPE html>') && 
              !text.trim().startsWith('<html') &&
              text.includes(',') &&
              (text.toLowerCase().includes('time') && text.toLowerCase().includes('acceleration'))) {
            csvFiles.push(filepath)
            console.log(`✅ Found CSV file: ${filepath}`)
          } else {
            console.log(`❌ File ${filepath} failed validation:`, {
              isHTML: text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html'),
              hasCommas: text.includes(','),
              hasTime: text.toLowerCase().includes('time'),
              hasAcceleration: text.toLowerCase().includes('acceleration')
            })
          }
        }
      } catch (error) {
        console.log(`❌ Error fetching ${filepath}:`, error)
        // File doesn't exist, continue
      }
    }
    
    // Also try to discover any CSV files by attempting common climbing route names
    const routePatterns = [
      'V0_Route.csv', 'V1_Route.csv', 'V2_Route.csv', 'V3_Route.csv', 'V4_Route.csv',
      'V5_Route.csv', 'V6_Route.csv', 'V7_Route.csv', 'V8_Route.csv', 'V9_Route.csv',
      'Sample_Route.csv', 'Demo_Route.csv', 'Test_Route.csv',
      'Overhang_Problem.csv', 'Crimpy_Route.csv', 'Dynamic_Problem.csv',
      'Slab_Route.csv', 'Roof_Problem.csv', 'Arete_Route.csv'
    ]
    
    for (const filename of routePatterns) {
      const filepath = `/data/${folder}/${filename}`
      try {
        const response = await fetch(filepath)
        if (response.ok) {
          const text = await response.text()
          
          if (!text.trim().startsWith('<!DOCTYPE html>') && 
              !text.trim().startsWith('<html') &&
              text.includes(',') &&
              (text.toLowerCase().includes('time') && text.toLowerCase().includes('acceleration'))) {
            csvFiles.push(filepath)
            console.log(`✅ Found route CSV file: ${filepath}`)
          }
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }
  }
  
  // Also check root data directory for backwards compatibility
  for (const filename of commonPatterns) {
    const filepath = `/data/${filename}`
    try {
      const response = await fetch(filepath)
      if (response.ok) {
        const text = await response.text()
        
        if (!text.trim().startsWith('<!DOCTYPE html>') && 
            !text.trim().startsWith('<html') &&
            text.includes(',') &&
            (text.toLowerCase().includes('time') && text.toLowerCase().includes('acceleration'))) {
          csvFiles.push(filepath)
          console.log(`✅ Found legacy CSV file: ${filepath}`)
        }
      }
    } catch (error) {
      // File doesn't exist, continue
    }
  }
  
  console.log(`🧗‍♂️ Discovered ${csvFiles.length} total CSV files:`, csvFiles)
  return csvFiles
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