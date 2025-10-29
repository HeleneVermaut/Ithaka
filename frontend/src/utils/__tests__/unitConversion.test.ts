/**
 * Unit Tests for unitConversion.ts
 * Tests all conversion functions for millimeters to pixels and vice versa
 * Coverage target: 80%+
 */

import {
  convertMmToPx,
  convertPxToMm,
  convertPageDimensions,
  getCanvasDimensions,
  isSupportedFormat,
  isValidOrientation,
  SCREEN_DPI,
  PRINT_DPI,
  DPI,
  PAGE_FORMATS,
} from '../unitConversion';

describe('unitConversion utilities', () => {
  describe('DPI Constants', () => {
    it('should have correct DPI values', () => {
      expect(SCREEN_DPI).toBe(96);
      expect(PRINT_DPI).toBe(300);
      expect(DPI).toBe(SCREEN_DPI);
    });

    it('should have correct page format dimensions', () => {
      expect(PAGE_FORMATS.A4).toEqual({ width: 210, height: 297 });
      expect(PAGE_FORMATS.A5).toEqual({ width: 148, height: 210 });
    });
  });

  describe('convertMmToPx', () => {
    it('should convert millimeters to pixels at default DPI (96)', () => {
      const result = convertMmToPx(1);
      expect(result).toBeCloseTo(3.7795, 3);
    });

    it('should convert A4 width (210mm) to pixels at default DPI', () => {
      const result = convertMmToPx(210);
      expect(result).toBeCloseTo(793.7008, 3);
    });

    it('should convert A4 height (297mm) to pixels at default DPI', () => {
      const result = convertMmToPx(297);
      expect(result).toBeCloseTo(1122.5118, 3);
    });

    it('should convert at custom DPI (300)', () => {
      const result = convertMmToPx(210, 300);
      expect(result).toBeCloseTo(2480.3146, 3);
    });

    it('should handle zero millimeters', () => {
      expect(convertMmToPx(0)).toBe(0);
    });

    it('should be consistent across multiple calls', () => {
      const result1 = convertMmToPx(100);
      const result2 = convertMmToPx(100);
      expect(result1).toBe(result2);
    });
  });

  describe('convertPxToMm', () => {
    it('should convert pixels to millimeters at default DPI', () => {
      const px = 3.7795;
      const result = convertPxToMm(px);
      expect(result).toBeCloseTo(1, 2);
    });

    it('should convert A4 width in pixels back to millimeters', () => {
      const px = 793.7008;
      const result = convertPxToMm(px);
      expect(result).toBeCloseTo(210, 2);
    });

    it('should be inverse of convertMmToPx', () => {
      const originalMm = 150;
      const px = convertMmToPx(originalMm);
      const backToMm = convertPxToMm(px);
      expect(backToMm).toBeCloseTo(originalMm, 2);
    });
  });

  describe('convertPageDimensions', () => {
    it('should return A4 dimensions', () => {
      const result = convertPageDimensions('A4');
      expect(result).toEqual({ width: 210, height: 297 });
    });

    it('should return A5 dimensions', () => {
      const result = convertPageDimensions('A5');
      expect(result).toEqual({ width: 148, height: 210 });
    });
  });

  describe('getCanvasDimensions', () => {
    it('should return A4 portrait dimensions', () => {
      const result = getCanvasDimensions('A4', 'portrait');
      expect(result.widthPx).toBeCloseTo(793.7008, 3);
      expect(result.heightPx).toBeCloseTo(1122.5118, 3);
    });

    it('should return A4 landscape dimensions (swapped)', () => {
      const result = getCanvasDimensions('A4', 'landscape');
      expect(result.widthPx).toBeCloseTo(1122.5118, 3);
      expect(result.heightPx).toBeCloseTo(793.7008, 3);
    });

    it('should use default orientation when not specified', () => {
      const result1 = getCanvasDimensions('A4');
      const result2 = getCanvasDimensions('A4', 'portrait');
      expect(result1.widthPx).toBe(result2.widthPx);
      expect(result1.heightPx).toBe(result2.heightPx);
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
      expect(isSupportedFormat('Letter')).toBe(false);
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
      expect(isValidOrientation('horizontal')).toBe(false);
      expect(isValidOrientation('vertical')).toBe(false);
    });
  });
});
