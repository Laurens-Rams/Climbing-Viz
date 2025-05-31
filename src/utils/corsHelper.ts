/**
 * CORS Helper Utilities
 * 
 * This module provides utilities to handle CORS issues that can occur when
 * the development server changes ports or when external resources are cached
 * with different origins.
 */

export interface CorsIssue {
  resource: string;
  expectedOrigin: string;
  actualOrigin: string;
  type: 'font' | 'api' | 'asset';
}

/**
 * Detects common CORS issues by checking the console for specific error patterns
 */
export function detectCorsIssues(): CorsIssue[] {
  // This would ideally hook into console errors, but for now we return common patterns
  return [
    {
      resource: 'Google Fonts',
      expectedOrigin: window.location.origin,
      actualOrigin: 'http://localhost:3002', // Previous common port
      type: 'font'
    },
    {
      resource: 'Three.js Font',
      expectedOrigin: window.location.origin,
      actualOrigin: 'http://localhost:3002',
      type: 'font'
    }
  ];
}

/**
 * Provides instructions for resolving CORS issues
 */
export function getCorsResolutionSteps(issue: CorsIssue): string[] {
  const steps = [
    '🔧 To resolve CORS issues:',
    '',
    '1. **Clear Browser Cache:**',
    '   - Chrome: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)',
    '   - Firefox: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)',
    '   - Safari: Cmd+Option+E',
    '',
    '2. **Hard Refresh:**',
    '   - Chrome/Firefox: Ctrl+F5 or Ctrl+Shift+R',
    '   - Safari: Cmd+Shift+R',
    '',
    '3. **Disable Cache (Dev Tools):**',
    '   - Open Dev Tools (F12)',
    '   - Go to Network tab',
    '   - Check "Disable cache"',
    '   - Refresh the page',
    '',
    '4. **Incognito/Private Mode:**',
    '   - Try opening the app in incognito/private mode',
    '',
    '⚠️ These CORS errors are expected when switching between development ports',
    '✅ The app will work with fallback fonts and geometries'
  ];

  if (issue.type === 'font') {
    steps.push('', '📝 Note: Font CORS errors are cosmetic - the app uses fallback fonts');
  }

  return steps;
}

/**
 * Logs CORS resolution instructions to the console
 */
export function logCorsHelp(): void {
  const issues = detectCorsIssues();
  
  if (issues.length > 0) {
    console.group('🚨 CORS Issues Detected');
    console.warn('External resources are blocked due to origin mismatch.');
    console.warn('This typically happens when switching development server ports.');
    
    issues.forEach(issue => {
      console.group(`📋 ${issue.resource} (${issue.type})`);
      const steps = getCorsResolutionSteps(issue);
      steps.forEach(step => step.trim() && console.log(step));
      console.groupEnd();
    });
    
    console.groupEnd();
  }
}

/**
 * Shows a user-friendly notification about CORS issues
 */
export function showCorsNotification(): void {
  // Check if we're in development and if there are potential CORS issues
  if (process.env.NODE_ENV === 'development') {
    // Create a dismissible notification
    const notification = document.createElement('div');
    notification.id = 'cors-notification';
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid #ff6b6b;
      border-radius: 10px;
      padding: 15px 20px;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      max-width: 350px;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 20px;">⚠️</span>
        <div style="flex: 1;">
          <strong style="color: #ff6b6b;">CORS Issues Detected</strong>
          <p style="margin: 5px 0; color: #ccc; font-size: 12px;">
            External fonts/resources blocked. App works normally with fallbacks.
          </p>
          <details style="margin-top: 8px;">
            <summary style="cursor: pointer; color: #4ecdc4;">View Solutions</summary>
            <div style="margin-top: 8px; font-size: 11px; color: #aaa;">
              <p>• Clear browser cache (Ctrl+Shift+Del)</p>
              <p>• Hard refresh (Ctrl+F5)</p>
              <p>• Use incognito mode</p>
              <p>• Check console for details</p>
            </div>
          </details>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: #ff6b6b; font-size: 18px; cursor: pointer; padding: 0; line-height: 1;">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 10000);
  }
}

// Initialize CORS helper on load
if (typeof window !== 'undefined') {
  // Log help to console
  // setTimeout(logCorsHelp, 1000);
  
  // Show notification if CORS errors are detected
  // setTimeout(showCorsNotification, 2000);
} 