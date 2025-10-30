/**
 * TypeScript Type Definitions for Database Models
 *
 * This module provides comprehensive TypeScript interfaces for all database models
 * used in the application. These interfaces ensure type safety across the codebase
 * and provide IDE autocomplete support for model operations.
 *
 * Organization:
 * - IPageElement interfaces: PageElement model types with input/update variants
 * - IUserSticker interfaces: UserSticker model types with input/update variants
 *
 * @module types/models
 */

/**
 * Complete PageElement interface with all fields from database
 * Used when retrieving full page element records from the database
 *
 * @interface IPageElement
 */
export interface IPageElement {
  /** Unique identifier (UUID) */
  id: string;

  /** Foreign key to parent Page */
  pageId: string;

  /** Element type (text, image, shape, emoji, sticker, moodTracker) */
  type: 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker';

  /** X coordinate in millimeters (mm) from left edge, must be >= 0 */
  x: number;

  /** Y coordinate in millimeters (mm) from top edge, must be >= 0 */
  y: number;

  /** Element width in millimeters (mm), must be > 0 */
  width: number;

  /** Element height in millimeters (mm), must be > 0 */
  height: number;

  /** Rotation angle in degrees (-180 to 180) */
  rotation: number;

  /** Z-index for layer ordering (0 = bottom, higher = on top) */
  zIndex: number;

  /**
   * Element content (type-specific data)
   * For text: { text, fontFamily, fontSize, fill, textAlign, fontWeight, fontStyle, underline, lineHeight }
   * For image: { url, originalWidth, originalHeight }
   * For shape: { shapeType, fillColor, strokeColor, strokeWidth }
   * For emoji/sticker: { code/url }
   * For moodTracker: { mood, scale, notes }
   */
  content: Record<string, any>;

  /**
   * Element styling properties
   * Common properties: opacity, shadow, transform, filter, etc.
   * Allows flexibility for different element types
   */
  style: Record<string, any>;

  /**
   * Optional custom metadata
   * For future extensibility and element-specific properties
   */
  metadata?: Record<string, any> | null;

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;

  /** Timestamp when record was soft-deleted (paranoid mode) */
  deletedAt?: Date | null;
}

/**
 * Input interface for creating a new PageElement
 * Makes optional the fields that are auto-generated or have defaults
 *
 * @interface IPageElementInput
 */
export interface IPageElementInput {
  /** Foreign key to parent Page (required) */
  pageId: string;

  /** Element type (required) */
  type: 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker';

  /** X coordinate in millimeters (required) */
  x: number;

  /** Y coordinate in millimeters (required) */
  y: number;

  /** Element width in millimeters (required) */
  width: number;

  /** Element height in millimeters (required) */
  height: number;

  /** Rotation angle in degrees (optional, defaults to 0) */
  rotation?: number;

  /** Z-index for layer ordering (optional, defaults to 0) */
  zIndex?: number;

  /** Element content (optional, can be constructed from type-specific fields) */
  content?: Record<string, any>;

  /** Element styling properties (optional) */
  style?: Record<string, any>;

  /** Optional custom metadata */
  metadata?: Record<string, any> | null;

  /**
   * Type-specific fields (validated by Joi, transformed into content/style)
   * These fields are optional and specific to certain element types
   */

  /** Emoji unicode content (required for type === 'emoji') */
  emojiContent?: string;

  /** Cloudinary URL (required for type === 'image' or 'sticker') */
  cloudinaryUrl?: string;

  /** Shape type (required for type === 'shape') */
  shapeType?: 'circle' | 'square' | 'rectangle' | 'triangle' | 'heart';

  /** Fill color for shapes (required for type === 'shape') */
  fillColor?: string;

  /** Opacity (optional, applies to all types) */
  opacity?: number;

  /** Foreign key to UserSticker (optional, for type === 'sticker') */
  stickerLibraryId?: string | null;
}

/**
 * Update interface for partial PageElement updates
 * All fields are optional for PATCH operations
 *
 * @interface IPageElementUpdate
 */
export interface IPageElementUpdate {
  /** Element type (optional) */
  type?: 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker';

  /** X coordinate in millimeters (optional) */
  x?: number;

  /** Y coordinate in millimeters (optional) */
  y?: number;

  /** Element width in millimeters (optional) */
  width?: number;

  /** Element height in millimeters (optional) */
  height?: number;

  /** Rotation angle in degrees (optional) */
  rotation?: number;

  /** Z-index for layer ordering (optional) */
  zIndex?: number;

  /** Element content (optional) */
  content?: Record<string, any>;

  /** Element styling properties (optional) */
  style?: Record<string, any>;

  /** Optional custom metadata */
  metadata?: Record<string, any> | null;
}

/**
 * Complete UserSticker interface with all fields from database
 * Used when retrieving full user sticker records from the database
 *
 * @interface IUserSticker
 */
export interface IUserSticker {
  /** Unique identifier (UUID) */
  id: string;

  /** Foreign key to User who owns this sticker */
  userId: string;

  /** User-friendly name for this sticker (e.g., "Autumn Leaf", "Travel Badge") */
  name: string;

  /** Public URL from Cloudinary for displaying the sticker */
  cloudinaryUrl: string;

  /** Cloudinary public ID (format: /users/:userId/stickers/:id), unique per user */
  cloudinaryPublicId: string;

  /** Thumbnail URL from Cloudinary (auto-generated, w_100,h_100,c_fit) */
  thumbnailUrl: string;

  /**
   * Array of tags for searching and organizing stickers
   * Example: ["nature", "animal", "cute"]
   */
  tags: string[];

  /** Whether this sticker is publicly visible (for future marketplace) */
  isPublic: boolean;

  /** Counter for tracking sticker usage across pages (optional analytics) */
  usageCount: number;

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;

  /** Timestamp when record was soft-deleted (paranoid mode) */
  deletedAt?: Date | null;
}

/**
 * Input interface for creating a new UserSticker
 * Makes optional the fields that are auto-generated or have defaults
 *
 * @interface IUserStickerInput
 */
export interface IUserStickerInput {
  /** Foreign key to User who owns this sticker (required) */
  userId: string;

  /** User-friendly name for this sticker (required) */
  name: string;

  /** Public URL from Cloudinary (required) */
  cloudinaryUrl: string;

  /** Cloudinary public ID (required, unique per user) */
  cloudinaryPublicId: string;

  /** Thumbnail URL from Cloudinary (optional, auto-generated) */
  thumbnailUrl?: string;

  /** Array of tags (optional, defaults to []) */
  tags?: string[];

  /** Whether this sticker is publicly visible (optional, defaults to false) */
  isPublic?: boolean;

  /** Usage count (optional, defaults to 0) */
  usageCount?: number;
}

/**
 * Update interface for partial UserSticker updates
 * All fields are optional for PATCH operations
 *
 * @interface IUserStickerUpdate
 */
export interface IUserStickerUpdate {
  /** User-friendly name for this sticker (optional) */
  name?: string;

  /** Public URL from Cloudinary (optional) */
  cloudinaryUrl?: string;

  /** Thumbnail URL from Cloudinary (optional) */
  thumbnailUrl?: string;

  /** Array of tags (optional) */
  tags?: string[];

  /** Whether this sticker is publicly visible (optional) */
  isPublic?: boolean;

  /** Usage count (optional) */
  usageCount?: number;
}
