// Debounce utility function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null
  
  const debounced = function(this: any, ...args: Parameters<T>) {
    const context = this
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func.apply(context, args)
      timeout = null
    }, wait)
  } as T
  
  // Add cancel method
  (debounced as any).cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }
  
  return debounced as T & { cancel: () => void }
} 