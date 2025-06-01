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
    // Look for absolute acceleration column
    if (header.includes('absolute acceleration') || 
        (header.includes('absolute') && header.includes('acceleration'))) {
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
      // Handle scientific notation properly
      const num = parseFloat(trimmed)
      return isNaN(num) ? 0 : num
    })

    if (values.length <= Math.max(timeCol, absAccelCol)) continue

    const timeVal = values[timeCol]
    const accelVal = values[absAccelCol]

    // More lenient validation - allow zero acceleration values
    if (!isNaN(timeVal) && !isNaN(accelVal) && accelVal >= 0) {
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

// Detect moves from acceleration data
function detectMovesFromAcceleration(time: number[], acceleration: number[], threshold = 12.0) {
  const moves = []
  let moveNumber = 1
  
  // Find the actual max acceleration in the data for better normalization
  const maxAccel = Math.max(...acceleration)
  const minAccel = Math.min(...acceleration)
  const accelRange = maxAccel - minAccel
  
  console.log(`[Move Detection] Max accel: ${maxAccel.toFixed(2)}, Min accel: ${minAccel.toFixed(2)}, Range: ${accelRange.toFixed(2)}`)
  
  for (let i = 1; i < acceleration.length - 1; i++) {
    if (acceleration[i] > threshold) {
      // Check if this is a local peak
      if (acceleration[i] > acceleration[i - 1] && acceleration[i] > acceleration[i + 1]) {
        // Normalize dynamics based on the actual data range, not a fixed value
        // This ensures we get good variation in the visualization
        let dynamics
        if (accelRange > 0) {
          // Normalize to 0-1 based on actual data range, with some minimum threshold
          dynamics = Math.max(0.1, (acceleration[i] - threshold) / (maxAccel - threshold))
          dynamics = Math.min(dynamics, 1.0) // Cap at 1.0
        } else {
          dynamics = 0.5 // Fallback if no range
        }
        
        const isCrux = acceleration[i] > threshold * 1.5
        
        console.log(`[Move Detection] Move ${moveNumber}: accel=${acceleration[i].toFixed(2)}, dynamics=${dynamics.toFixed(3)}, isCrux=${isCrux}`)
        
        moves.push({
          move_number: moveNumber++,
          dynamics,
          isCrux
        })
      }
    }
  }
  
  console.log(`[Move Detection] Detected ${moves.length} moves with dynamics range: ${Math.min(...moves.map(m => m.dynamics)).toFixed(3)} - ${Math.max(...moves.map(m => m.dynamics)).toFixed(3)}`)
  
  return moves
}

// Convert CSV data to boulder format
export function convertCSVToBoulder(csvData: CSVData, id: number): BoulderData {
  const moves = detectMovesFromAcceleration(csvData.time, csvData.absoluteAcceleration)
  
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
    description: `${csvData.duration.toFixed(1)}s duration, ${moves.length} moves detected`,
    csvFile: csvData.filename.replace(/^.*\//, ''),
    moves,
    csvData,
    stats: {
      duration: csvData.duration.toFixed(1),
      maxAcceleration: csvData.maxAcceleration.toFixed(2),
      avgAcceleration: csvData.avgAcceleration.toFixed(2),
      moveCount: moves.length,
      sampleCount: csvData.sampleCount
    }
  }
}

// Discover available CSV files
export async function discoverCSVFiles(): Promise<string[]> {
  const csvFiles: string[] = []
  
  // Try common CSV files in the public/data directory (served by Vite)
  // Only include real Phyphox data files, excluding sample files
  const commonPatterns = [
    'Raw Data.csv',
    'Raw Data1.csv',
    'Raw Data2.csv', 
    'Raw Data3.csv',
    'Raw Data4.csv',
    'Raw Data5.csv',
  ]
  
  for (const filename of commonPatterns) {
    const filepath = `/data/${filename}` // Files in public/data directory
    try {
      const response = await fetch(filepath)
      if (response.ok) {
        const text = await response.text()
        
        // Validate that it's actually CSV content with Phyphox format
        if (!text.trim().startsWith('<!DOCTYPE html>') && 
            !text.trim().startsWith('<html') &&
            text.includes(',') &&
            (text.toLowerCase().includes('time') && text.toLowerCase().includes('acceleration'))) {
          csvFiles.push(filepath)
          console.log(`Found CSV file: ${filepath}`)
        }
      }
    } catch (error) {
      // File doesn't exist, continue
    }
  }
  
  console.log(`Discovered ${csvFiles.length} CSV files:`, csvFiles)
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
    
    console.log('Successfully processed uploaded file:', file.name)
    return boulder
  } catch (error) {
    console.error('Error processing uploaded file:', error)
    throw error
  }
} 