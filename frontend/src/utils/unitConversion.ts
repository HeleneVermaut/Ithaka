/**
 * Unit Conversion Utility Module
 * Handles conversion between millimeters (storage) and pixels (canvas rendering).
 * Uses 96 DPI for screen rendering (standard web browser DPI).
 * Uses 300 DPI for print/export (stored in database metadata).
 */

/**
 * Standard DPI for screen rendering (web browsers)
 */
export const SCREEN_DPI = 96;

/**
 * Standard DPI for print-quality output used by the application for exports/PDFs
 */
export const PRINT_DPI = 300;

/**
 * Default DPI used for canvas rendering (screen DPI)
 */
export const DPI = SCREEN_DPI;

/**
 * Paper format dimensions in millimeters
 */
export const PAGE_FORMATS = {
  A4: { width: 210, height: 297 }, // mm
  A5: { width: 148, height: 210 }  // mm
} as const;

/**
 * Conversion factor from millimeters to pixels at 300 DPI
 * Formula: 300 DPI / 25.4 mm per inch ≈ 11.8110
 */
const MM_TO_PX_FACTOR = DPI / 25.4;

/**
 * Converts millimeters to pixels at a given DPI.
 * Uses 300 DPI standard for print-quality output by default.
 *
 * @param mm - Distance in millimeters
 * @param dpi - Dots per inch (default: 300)
 * @returns Distance in pixels, rounded to 4 decimal places
 *
 * @example
 * convertMmToPx(210) // => 793.7008 (A4 width at 300 DPI)
 * convertMmToPx(297) // => 1122.5118 (A4 height at 300 DPI)
 */
export function convertMmToPx(mm: number, dpi: number = DPI): number {
  const factor = dpi / 25.4;
  return Math.round(mm * factor * 10000) / 10000;
}

/**
 * Converts pixels to millimeters at a given DPI.
 * Inverse of convertMmToPx.
 *
 * @param px - Distance in pixels
 * @param dpi - Dots per inch (default: 300)
 * @returns Distance in millimeters, rounded to 4 decimal places
 *
 * @example
 * convertPxToMm(793.7008) // => 210 (A4 width at 300 DPI)
 * convertPxToMm(1122.5118) // => 297 (A4 height at 300 DPI)
 */
export function convertPxToMm(px: number, dpi: number = DPI): number {
  const factor = 25.4 / dpi;
  return Math.round(px * factor * 10000) / 10000;
}

/**
 * Returns paper dimensions in millimeters for the given format.
 * This is primarily used for database storage and reference.
 *
 * @param format - Paper format identifier ('A4' or 'A5')
 * @returns Object with width and height in millimeters
 *
 * @example
 * convertPageDimensions('A4') // => { width: 210, height: 297 }
 * convertPageDimensions('A5') // => { width: 148, height: 210 }
 */
export function convertPageDimensions(
  format: 'A4' | 'A5'
): { width: number; height: number } {
  return PAGE_FORMATS[format];
}

/**
 * Calculates canvas dimensions in pixels for Fabric.js initialization.
 * Takes paper format and orientation, returns pixel dimensions.
 *
 * @param format - Paper format identifier ('A4' or 'A5')
 * @param orientation - Page orientation ('portrait' or 'landscape', default: 'portrait')
 * @param dpi - Dots per inch (default: 300)
 * @returns Object with canvas width and height in pixels
 *
 * @example
 * // A4 Portrait (210×297mm at 300 DPI)
 * getCanvasDimensions('A4', 'portrait')
 * // => { widthPx: 793.7008, heightPx: 1122.5118 }
 *
 * // A4 Landscape (297×210mm at 300 DPI)
 * getCanvasDimensions('A4', 'landscape')
 * // => { widthPx: 1122.5118, heightPx: 793.7008 }
 */
export function getCanvasDimensions(
  format: 'A4' | 'A5',
  orientation: 'portrait' | 'landscape' = 'portrait',
  dpi: number = DPI
): { widthPx: number; heightPx: number } {
  const dimensions = PAGE_FORMATS[format];

  // In landscape, swap width and height
  const width = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const height = orientation === 'landscape' ? dimensions.width : dimensions.height;

  return {
    widthPx: convertMmToPx(width, dpi),
    heightPx: convertMmToPx(height, dpi)
  };
}

/**
 * Validates if a paper format is supported
 * @param format - Format string to validate
 * @returns True if format is supported ('A4' or 'A5')
 */
export function isSupportedFormat(format: unknown): format is 'A4' | 'A5' {
  return format === 'A4' || format === 'A5';
}

/**
 * Validates if an orientation is valid
 * @param orientation - Orientation string to validate
 * @returns True if orientation is valid ('portrait' or 'landscape')
 */
export function isValidOrientation(orientation: unknown): orientation is 'portrait' | 'landscape' {
  return orientation === 'portrait' || orientation === 'landscape';
}
