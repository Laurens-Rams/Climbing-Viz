// Data cleanup utilities for removing old cached data and organizing storage

export function clearAllCachedData() {
  console.log('🧹 Clearing all cached climbing data...')
  
  // Clear localStorage items related to climbing data
  const keysToRemove = [
    'climbing-boulders',
    'climbing-viz-settings', 
    'climbing-viz-presets',
    'boulder-configs',
    'visualization-cache',
    'csv-file-cache',
    'phyphox-recordings'
  ]
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key)
      console.log(`✅ Removed localStorage key: ${key}`)
    }
  })
  
  // Clear any keys that start with climbing-related prefixes
  const allKeys = Object.keys(localStorage)
  const prefixesToClear = ['climbing-', 'boulder-', 'phyphox-', 'live-recording-']
  
  allKeys.forEach(key => {
    if (prefixesToClear.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key)
      console.log(`✅ Removed prefixed localStorage key: ${key}`)
    }
  })
  
  console.log('🧗‍♂️ All cached data cleared! Ready for fresh start.')
}

// Manual clear function that also reloads the page
export function manualClearAllData() {
  console.log('🔥 MANUAL CLEAR: Nuking all cached data...')
  
  // Clear all climbing-related localStorage
  const allKeys = Object.keys(localStorage)
  const clearedKeys: string[] = []
  
  allKeys.forEach(key => {
    if (key.includes('climbing') || 
        key.includes('boulder') || 
        key.includes('phyphox') || 
        key.includes('live-recording') ||
        key.includes('visualization') ||
        key.includes('csv')) {
      localStorage.removeItem(key)
      clearedKeys.push(key)
    }
  })
  
  console.log(`🧹 Cleared ${clearedKeys.length} cached keys:`, clearedKeys)
  
  // Force page reload to start completely fresh
  setTimeout(() => {
    console.log('🔄 Reloading page for fresh start...')
    window.location.reload()
  }, 500)
  
  return clearedKeys.length
}

export function clearLiveRecordings() {
  console.log('🧹 Clearing live recording data...')
  
  // Get existing boulders and filter out live recordings
  const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
  const filteredBoulders = existingBoulders.filter((boulder: any) => 
    boulder.source !== 'phyphox' && !boulder.isLiveRecording
  )
  
  localStorage.setItem('climbing-boulders', JSON.stringify(filteredBoulders))
  console.log(`✅ Removed ${existingBoulders.length - filteredBoulders.length} live recordings`)
}

export function clearOldCacheEntries() {
  console.log('🧹 Clearing old cache entries...')
  
  // Clear any old visualization cache
  if (localStorage.getItem('visualization-cache')) {
    localStorage.removeItem('visualization-cache')
    console.log('✅ Cleared visualization cache')
  }
  
  // Clear any old CSV cache
  if (localStorage.getItem('csv-file-cache')) {
    localStorage.removeItem('csv-file-cache')
    console.log('✅ Cleared CSV file cache')
  }
}

export function getStorageInfo() {
  const info = {
    totalKeys: Object.keys(localStorage).length,
    climbingKeys: Object.keys(localStorage).filter(key => 
      key.startsWith('climbing-') || 
      key.startsWith('boulder-') || 
      key.startsWith('phyphox-') ||
      key.startsWith('live-recording-')
    ),
    totalSize: 0
  }
  
  // Calculate approximate storage size
  for (let key in localStorage) {
    info.totalSize += localStorage[key].length
  }
  
  return {
    ...info,
    totalSizeKB: Math.round(info.totalSize / 1024),
    climbingKeyCount: info.climbingKeys.length
  }
}

// Auto-cleanup function to run on app start
export function performStartupCleanup() {
  console.log('🚀 Performing startup cleanup...')
  
  const storageInfo = getStorageInfo()
  console.log('📊 Storage info before cleanup:', storageInfo)
  
  // Clear old cache entries
  clearOldCacheEntries()
  
  // Optionally clear live recordings older than 24 hours
  const existingBoulders = JSON.parse(localStorage.getItem('climbing-boulders') || '[]')
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
  
  const filteredBoulders = existingBoulders.filter((boulder: any) => {
    if (boulder.isLiveRecording && boulder.recordedAt) {
      const recordedTime = new Date(boulder.recordedAt).getTime()
      return recordedTime > oneDayAgo
    }
    return true
  })
  
  if (filteredBoulders.length !== existingBoulders.length) {
    localStorage.setItem('climbing-boulders', JSON.stringify(filteredBoulders))
    console.log(`✅ Cleaned up ${existingBoulders.length - filteredBoulders.length} old live recordings`)
  }
  
  const finalStorageInfo = getStorageInfo()
  console.log('📊 Storage info after cleanup:', finalStorageInfo)
  console.log('🧗‍♂️ Startup cleanup complete!')
} 