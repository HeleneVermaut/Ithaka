/**
 * Debug utilities for US03 text editing
 * Enable with ?debug=true query parameter
 *
 * @example
 * // Enable debug mode by adding ?debug=true to URL
 * // http://localhost:3001/editor?debug=true
 *
 * // Use in code:
 * debugLog(DebugCategory.CANVAS, 'Canvas initialized', { width: 800, height: 600 });
 * const timer = new DebugTimer('saveElement');
 * // ... do work
 * timer.end(100); // Warn if > 100ms
 */

// Check if debug mode is enabled via query parameter
export const DEBUG = new URLSearchParams(window.location.search).get('debug') === 'true';

/**
 * Debug categories for organizing log messages
 */
export enum DebugCategory {
  CANVAS = 'CANVAS',
  STATE = 'STATE',
  API = 'API',
  AUTOSAVE = 'AUTOSAVE',
  LIBRARY = 'LIBRARY',
  PERFORMANCE = 'PERFORMANCE'
}

/**
 * Color codes for different debug categories
 * Makes console logs easier to scan visually
 */
const CATEGORY_COLORS: Record<DebugCategory, string> = {
  [DebugCategory.CANVAS]: '#4CAF50',
  [DebugCategory.STATE]: '#2196F3',
  [DebugCategory.API]: '#FF9800',
  [DebugCategory.AUTOSAVE]: '#9C27B0',
  [DebugCategory.LIBRARY]: '#F44336',
  [DebugCategory.PERFORMANCE]: '#00BCD4'
};

/**
 * Log debug message with category and styling
 * Only logs when DEBUG mode is enabled
 *
 * @param category - The debug category
 * @param message - The log message
 * @param data - Optional data to log
 *
 * @example
 * debugLog(DebugCategory.CANVAS, 'Element added', { id: '123', type: 'text' });
 */
export function debugLog(
  category: DebugCategory,
  message: string,
  data?: any
): void {
  if (!DEBUG) return;

  const color = CATEGORY_COLORS[category];
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

  console.log(
    `%c[${timestamp}] %c[${category}] %c${message}`,
    'color: #999',
    `color: ${color}; font-weight: bold`,
    'color: inherit',
    data !== undefined ? data : ''
  );
}

/**
 * Log performance metric with color coding
 * Red if duration exceeds threshold, green otherwise
 *
 * @param operation - Name of the operation being measured
 * @param duration - Duration in milliseconds
 * @param threshold - Optional threshold in ms for warning (red color)
 *
 * @example
 * debugPerformance('saveElement', 150, 100); // Shows in red (exceeded threshold)
 * debugPerformance('loadCanvas', 50); // Shows in green
 */
export function debugPerformance(
  operation: string,
  duration: number,
  threshold?: number
): void {
  if (!DEBUG) return;

  const color = threshold && duration > threshold ? '#F44336' : '#4CAF50';

  console.log(
    `%c[PERF] %c${operation} %c${duration.toFixed(2)}ms`,
    'color: #00BCD4; font-weight: bold',
    'color: inherit',
    `color: ${color}; font-weight: bold`
  );
}

/**
 * Log error with stack trace and category
 * Always logs in red for visibility
 *
 * @param category - The debug category
 * @param message - Error description
 * @param error - The error object
 *
 * @example
 * debugError(DebugCategory.API, 'Failed to save element', error);
 */
export function debugError(
  category: DebugCategory,
  message: string,
  error: any
): void {
  if (!DEBUG) return;

  console.error(
    `%c[${category}] ERROR: ${message}`,
    `color: ${CATEGORY_COLORS[category]}; font-weight: bold`,
    error
  );
}

/**
 * Performance timer for measuring operation duration
 * Automatically logs when .end() is called
 *
 * @example
 * const timer = new DebugTimer('fetchPages');
 * await fetchPages();
 * timer.end(500); // Warns if > 500ms
 */
export class DebugTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  /**
   * End the timer and log the duration
   *
   * @param threshold - Optional warning threshold in ms
   * @returns The measured duration in milliseconds
   */
  end(threshold?: number): number {
    const duration = performance.now() - this.startTime;
    debugPerformance(this.operation, duration, threshold);
    return duration;
  }
}

/**
 * Log detailed canvas state for debugging
 * Shows all objects, their properties, and canvas settings
 *
 * @param canvas - Fabric.js canvas instance
 *
 * @example
 * debugCanvasState(canvas.value);
 */
export function debugCanvasState(canvas: any): void {
  if (!DEBUG) return;

  const objects = canvas.getObjects();

  debugLog(DebugCategory.CANVAS, 'Canvas State', {
    objectCount: objects.length,
    objects: objects.map((obj: any) => ({
      type: obj.type,
      id: obj.id,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height
    })),
    zoom: canvas.getZoom(),
    viewportTransform: canvas.viewportTransform
  });
}

/**
 * Log Pinia store state changes
 * Useful for tracking state mutations
 *
 * @param storeName - Name of the store
 * @param action - Action being performed
 * @param payload - Optional action payload
 *
 * @example
 * debugStateChange('pages', 'updateElement', { id: '123', updates: {...} });
 */
export function debugStateChange(
  storeName: string,
  action: string,
  payload?: any
): void {
  if (!DEBUG) return;

  debugLog(
    DebugCategory.STATE,
    `${storeName}.${action}`,
    payload
  );
}

/**
 * Show visual debug mode indicator on page
 * Displays a badge in top-left corner
 */
export function showDebugIndicator(): void {
  if (!DEBUG) return;

  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: #FF9800;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  indicator.textContent = '🐛 DEBUG MODE';
  document.body.appendChild(indicator);

  console.log('%c🐛 DEBUG MODE ENABLED', 'color: #FF9800; font-size: 20px; font-weight: bold');
  console.log('%cTo disable, remove ?debug=true from URL', 'color: #999');
  console.log('%cAvailable debug commands:', 'color: #999');
  console.log('%c  window.debugCanvas() - Log canvas state', 'color: #999');
}
