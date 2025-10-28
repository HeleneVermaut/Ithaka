import { describe, it, expect } from 'vitest';
import {
  convertMmToPx,
  convertPxToMm,
  convertPageDimensions,
  getCanvasDimensions,
  isSupportedFormat,
  isValidOrientation,
  DPI,
  SCREEN_DPI,
  PRINT_DPI,
  PAGE_FORMATS
} from '../unitConversion';

describe('Unit Conversion Utility', () => {
  describe('Constants', () => {
    it('should export SCREEN_DPI constant with value 96', () => {
      expect(SCREEN_DPI).toBe(96);
    });

    it('should export PRINT_DPI constant with value 300', () => {
      expect(PRINT_DPI).toBe(300);
    });

    it('should export default DPI as SCREEN_DPI (96)', () => {
      expect(DPI).toBe(96);
    });

    it('should export PAGE_FORMATS with A4 and A5', () => {
      expect(PAGE_FORMATS.A4).toEqual({ width: 210, height: 297 });
      expect(PAGE_FORMATS.A5).toEqual({ width: 148, height: 210 });
    });
  });

  describe('convertMmToPx', () => {
    it('should convert A4 width (210mm) to approximately 793.7 pixels at default 96 DPI', () => {
      const result = convertMmToPx(210);
      expect(result).toBeCloseTo(793.7008, 3);
    });

    it('should convert A4 height (297mm) to approximately 1122.5 pixels at default 96 DPI', () => {
      const result = convertMmToPx(297);
      expect(result).toBeCloseTo(1122.5197, 3);
    });

    it('should convert A5 width (148mm) to approximately 559.0 pixels at default 96 DPI', () => {
      const result = convertMmToPx(148);
      expect(result).toBeCloseTo(559.3701, 3);
    });

    it('should convert A5 height (210mm) to approximately 793.7 pixels at default 96 DPI', () => {
      const result = convertMmToPx(210);
      expect(result).toBeCloseTo(793.7008, 3);
    });

    it('should handle zero value', () => {
      expect(convertMmToPx(0)).toBe(0);
    });

    it('should handle decimal values', () => {
      const result = convertMmToPx(10.5);
      expect(result).toBeCloseTo(39.6850, 4);
    });

    it('should accept custom DPI for high-resolution export', () => {
      // At 300 DPI (print quality), 210mm should be approximately 2480.3 pixels
      const result = convertMmToPx(210, 300);
      expect(result).toBeCloseTo(2480.3150, 1);
    });

    it('should round to 4 decimal places', () => {
      const result = convertMmToPx(210);
      const decimals = (result.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(4);
    });
  });

  describe('convertPxToMm', () => {
    it('should convert 793.7008 pixels back to approximately 210mm at default 96 DPI', () => {
      const result = convertPxToMm(793.7008);
      expect(result).toBeCloseTo(210, 2);
    });

    it('should convert 1122.5118 pixels back to approximately 297mm at default 96 DPI', () => {
      const result = convertPxToMm(1122.5118);
      expect(result).toBeCloseTo(297, 2);
    });

    it('should convert 559.3701 pixels back to approximately 148mm at default 96 DPI', () => {
      const result = convertPxToMm(559.3701);
      expect(result).toBeCloseTo(148, 2);
    });

    it('should handle zero value', () => {
      expect(convertPxToMm(0)).toBe(0);
    });

    it('should handle decimal values', () => {
      const result = convertPxToMm(100.5);
      expect(result).toBeCloseTo(26.5906, 4);
    });

    it('should accept custom DPI for print resolution', () => {
      // At 300 DPI, 2480.3 pixels should be approximately 210mm
      const result = convertPxToMm(2480.3150, 300);
      expect(result).toBeCloseTo(210, 2);
    });

    it('should round to 4 decimal places', () => {
      const result = convertPxToMm(793.7008);
      const decimals = (result.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(4);
    });
  });

  describe('Roundtrip Conversion Accuracy', () => {
    it('should maintain accuracy when converting mm -> px -> mm', () => {
      const original = 210;
      const px = convertMmToPx(original);
      const back = convertPxToMm(px);
      expect(Math.abs(back - original)).toBeLessThan(0.01);
    });

    it('should maintain accuracy for A4 dimensions roundtrip', () => {
      const a4Width = 210;
      const a4Height = 297;

      const widthBack = convertPxToMm(convertMmToPx(a4Width));
      const heightBack = convertPxToMm(convertMmToPx(a4Height));

      expect(Math.abs(widthBack - a4Width)).toBeLessThan(0.01);
      expect(Math.abs(heightBack - a4Height)).toBeLessThan(0.01);
    });

    it('should maintain accuracy for A5 dimensions roundtrip', () => {
      const a5Width = 148;
      const a5Height = 210;

      const widthBack = convertPxToMm(convertMmToPx(a5Width));
      const heightBack = convertPxToMm(convertMmToPx(a5Height));

      expect(Math.abs(widthBack - a5Width)).toBeLessThan(0.01);
      expect(Math.abs(heightBack - a5Height)).toBeLessThan(0.01);
    });

    it('should maintain accuracy through multiple conversions', () => {
      let value = 100;
      for (let i = 0; i < 5; i++) {
        value = convertPxToMm(convertMmToPx(value));
      }
      expect(Math.abs(value - 100)).toBeLessThan(0.1);
    });
  });

  describe('convertPageDimensions', () => {
    it('should return A4 dimensions in millimeters', () => {
      const result = convertPageDimensions('A4');
      expect(result).toEqual({ width: 210, height: 297 });
    });

    it('should return A5 dimensions in millimeters', () => {
      const result = convertPageDimensions('A5');
      expect(result).toEqual({ width: 148, height: 210 });
    });

    it('should return dimensions without converting to pixels', () => {
      const result = convertPageDimensions('A4');
      expect(result.width).toBe(210); // Not 793.7008
      expect(result.height).toBe(297); // Not 1122.5118
    });
  });

  describe('getCanvasDimensions', () => {
    it('should return A4 portrait dimensions in pixels at screen DPI (96)', () => {
      const result = getCanvasDimensions('A4', 'portrait');
      expect(result.widthPx).toBeCloseTo(793.7008, 3);
      expect(result.heightPx).toBeCloseTo(1122.5197, 3);
    });

    it('should return A4 landscape dimensions with swapped values', () => {
      const result = getCanvasDimensions('A4', 'landscape');
      expect(result.widthPx).toBeCloseTo(1122.5197, 3);
      expect(result.heightPx).toBeCloseTo(793.7008, 3);
    });

    it('should return A5 portrait dimensions in pixels at screen DPI (96)', () => {
      const result = getCanvasDimensions('A5', 'portrait');
      expect(result.widthPx).toBeCloseTo(559.3701, 3);
      expect(result.heightPx).toBeCloseTo(793.7008, 3);
    });

    it('should return A5 landscape dimensions with swapped values', () => {
      const result = getCanvasDimensions('A5', 'landscape');
      expect(result.widthPx).toBeCloseTo(793.7008, 3);
      expect(result.heightPx).toBeCloseTo(559.3701, 3);
    });

    it('should default to portrait orientation', () => {
      const portraitExplicit = getCanvasDimensions('A4', 'portrait');
      const portraitDefault = getCanvasDimensions('A4');
      expect(portraitDefault.widthPx).toBe(portraitExplicit.widthPx);
      expect(portraitDefault.heightPx).toBe(portraitExplicit.heightPx);
    });

    it('should accept custom DPI for high-resolution rendering', () => {
      const result96 = getCanvasDimensions('A4', 'portrait', 96);
      const result300 = getCanvasDimensions('A4', 'portrait', 300);
      expect(result96.widthPx).toBeLessThan(result300.widthPx);
      expect(result96.heightPx).toBeLessThan(result300.heightPx);
      expect(result300.widthPx).toBeCloseTo(2480.3150, 1);
      expect(result300.heightPx).toBeCloseTo(3507.8740, 1);
    });

    it('should have widthPx and heightPx properties', () => {
      const result = getCanvasDimensions('A4', 'portrait');
      expect(result).toHaveProperty('widthPx');
      expect(result).toHaveProperty('heightPx');
      expect(typeof result.widthPx).toBe('number');
      expect(typeof result.heightPx).toBe('number');
    });
  });

  describe('isSupportedFormat', () => {
    it('should return true for A4', () => {
      expect(isSupportedFormat('A4')).toBe(true);
    });

    it('should return true for A5', () => {
      expect(isSupportedFormat('A5')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(isSupportedFormat('A3')).toBe(false);
      expect(isSupportedFormat('A6')).toBe(false);
      expect(isSupportedFormat('Letter')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isSupportedFormat(4)).toBe(false);
      expect(isSupportedFormat(null)).toBe(false);
      expect(isSupportedFormat(undefined)).toBe(false);
      expect(isSupportedFormat({})).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isSupportedFormat('a4')).toBe(false);
      expect(isSupportedFormat('a5')).toBe(false);
    });
  });

  describe('isValidOrientation', () => {
    it('should return true for portrait', () => {
      expect(isValidOrientation('portrait')).toBe(true);
    });

    it('should return true for landscape', () => {
      expect(isValidOrientation('landscape')).toBe(true);
    });

    it('should return false for invalid orientations', () => {
      expect(isValidOrientation('Portrait')).toBe(false);
      expect(isValidOrientation('Landscape')).toBe(false);
      expect(isValidOrientation('square')).toBe(false);
      expect(isValidOrientation('horizontal')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidOrientation(0)).toBe(false);
      expect(isValidOrientation(null)).toBe(false);
      expect(isValidOrientation(undefined)).toBe(false);
      expect(isValidOrientation({})).toBe(false);
    });
  });

  describe('Edge Cases and Special Values', () => {
    it('should handle very small values', () => {
      const result = convertMmToPx(0.001);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.05); // At 96 DPI, 0.001mm is ~0.0038px
    });

    it('should handle large values', () => {
      const result = convertMmToPx(1000);
      expect(result).toBeGreaterThan(3700); // 1000mm * 96/25.4 ≈ 3779
    });

    it('should handle negative values consistently (store as absolute)', () => {
      // Negative values represent invalid dimensions, but function should handle gracefully
      const result = convertMmToPx(-210);
      expect(result).toBeLessThan(0);
    });

    it('should maintain precision for typical page margins at 96 DPI', () => {
      // Typical margins are 10-20mm, at 96 DPI
      const margin10 = convertMmToPx(10);
      const margin20 = convertMmToPx(20);
      expect(margin10).toBeCloseTo(37.7953, 3); // 10 * 96/25.4
      expect(margin20).toBeCloseTo(75.5906, 3); // 20 * 96/25.4
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete A4 page setup workflow (screen rendering at 96 DPI)', () => {
      const format = 'A4';
      const orientation = 'portrait';

      // Get dimensions for canvas initialization (at screen DPI 96)
      const canvasDims = getCanvasDimensions(format, orientation);
      expect(canvasDims.widthPx).toBeCloseTo(793.7008, 3);
      expect(canvasDims.heightPx).toBeCloseTo(1122.5197, 3);

      // Get original dimensions for database storage
      const pageDims = convertPageDimensions(format);
      expect(pageDims.width).toBe(210);
      expect(pageDims.height).toBe(297);

      // Convert margins to pixels (at 96 DPI)
      const marginMm = 20;
      const marginPx = convertMmToPx(marginMm);
      expect(marginPx).toBeCloseTo(75.5906, 3);
    });

    it('should handle complete A5 landscape page setup (screen rendering at 96 DPI)', () => {
      const format = 'A5';
      const orientation = 'landscape';

      const canvasDims = getCanvasDimensions(format, orientation);
      expect(canvasDims.widthPx).toBeCloseTo(793.7008, 3);
      expect(canvasDims.heightPx).toBeCloseTo(559.3701, 3);

      const pageDims = convertPageDimensions(format);
      expect(pageDims.width).toBe(148);
      expect(pageDims.height).toBe(210);
    });

    it('should handle print-quality export at 300 DPI', () => {
      const format = 'A4';
      const orientation = 'portrait';

      // Export at high resolution (300 DPI)
      const exportDims = getCanvasDimensions(format, orientation, PRINT_DPI);
      expect(exportDims.widthPx).toBeCloseTo(2480.3150, 1);
      expect(exportDims.heightPx).toBeCloseTo(3507.8740, 1);

      // Store mm values in database (DPI-independent)
      const pageDims = convertPageDimensions(format);
      expect(pageDims.width).toBe(210);
      expect(pageDims.height).toBe(297);
    });
  });
});
