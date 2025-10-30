/**
 * PageElement Model
 *
 * This module defines the PageElement model for managing canvas elements on pages.
 * Each page element represents a single item on a canvas page (text, image, shape, etc.)
 * with positioning, styling, and content properties.
 *
 * Features:
 * - Multiple element types (text, image, shape, emoji, sticker, moodTracker)
 * - Precise positioning in millimeters (mm)
 * - Z-index based layer management
 * - Flexible JSON content and styling columns
 * - Paranoid mode (soft delete) for recovery capability
 * - Atomic cascade delete with parent page
 *
 * Coordinates and dimensions are stored in millimeters to support multiple paper sizes
 * and facilitate high-quality PDF export at fixed 300 DPI (conversion happens at
 * serialization/deserialization boundaries).
 *
 * @module models/PageElement
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Element type enumeration
 * Defines all supported types of canvas elements
 */
export type ElementType = 'text' | 'image' | 'shape' | 'emoji' | 'sticker' | 'moodTracker';

/**
 * Interface defining all fields in the PageElement model
 * This represents the complete structure of a page element record in the database
 *
 * @interface IPageElement
 */
export interface IPageElement {
  /** Unique identifier (UUID) */
  id: string;

  /** Foreign key to parent Page */
  pageId: string;

  /** Element type (text, image, shape, etc.) */
  type: ElementType;

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

  /** Optional foreign key to UserSticker (for sticker type elements) */
  stickerLibraryId?: string | null;

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
 * Attributes required when creating a new page element
 * Makes some fields optional that are auto-generated or have defaults
 */
export interface PageElementCreationAttributes
  extends Optional<
    IPageElement,
    | 'id'
    | 'rotation'
    | 'zIndex'
    | 'stickerLibraryId'
    | 'metadata'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}

/**
 * PageElement Model Class
 *
 * Extends Sequelize Model to provide type-safe database operations.
 * This class represents the page_elements table in PostgreSQL.
 *
 * @class PageElement
 * @extends Model<IPageElement, PageElementCreationAttributes>
 */
export class PageElement extends Model<IPageElement, PageElementCreationAttributes> implements IPageElement {
  declare id: string;
  declare pageId: string;
  declare type: ElementType;
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare rotation: number;
  declare zIndex: number;
  declare stickerLibraryId?: string | null;
  declare content: Record<string, any>;
  declare style: Record<string, any>;
  declare metadata?: Record<string, any> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt?: Date | null;

  /**
   * Check if element is soft-deleted
   * Returns true if deletedAt timestamp is set (paranoid mode)
   *
   * @returns {boolean} True if element is soft-deleted
   *
   * @example
   * const element = await PageElement.findByPk(elementId, { paranoid: false });
   * if (element.isDeleted()) {
   *   console.log('This element has been deleted');
   * }
   */
  public isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  /**
   * Get bounding box for element
   * Returns coordinates and dimensions as bounding box object
   *
   * @returns {object} Bounding box { x, y, width, height }
   *
   * @example
   * const element = await PageElement.findByPk(elementId);
   * const bbox = element.getBoundingBox();
   * // { x: 10, y: 20, width: 100, height: 50 }
   */
  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Check if element contains point coordinates
   * Useful for hit detection in canvas
   *
   * @param {number} px - Point X coordinate
   * @param {number} py - Point Y coordinate
   * @returns {boolean} True if point is within element bounds
   *
   * @example
   * const element = await PageElement.findByPk(elementId);
   * if (element.containsPoint(50, 75)) {
   *   console.log('Point is inside this element');
   * }
   */
  public containsPoint(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }

  /**
   * Get element information for serialization
   * Excludes sensitive fields and paranoid timestamp
   *
   * @returns {object} Element data safe for API responses
   *
   * @example
   * const element = await PageElement.findByPk(elementId);
   * res.json(element.toSafeJSON());
   */
  public toSafeJSON(): object {
    const values = this.toJSON() as IPageElement;
    const { deletedAt, ...safeElement } = values;
    return safeElement;
  }
}

/**
 * Initialize PageElement model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
PageElement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the page element',
    },
    pageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'pages',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notEmpty: {
          msg: 'Page ID is required',
        },
      },
      comment: 'Foreign key to parent page',
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'shape', 'emoji', 'sticker', 'moodTracker'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['text', 'image', 'shape', 'emoji', 'sticker', 'moodTracker']],
          msg: 'Type must be one of: text, image, shape, emoji, sticker, moodTracker',
        },
      },
      comment: 'Type of canvas element',
    },
    x: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'X coordinate must be >= 0',
        },
      },
      comment: 'X coordinate in millimeters (mm) from left edge',
    },
    y: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Y coordinate must be >= 0',
        },
      },
      comment: 'Y coordinate in millimeters (mm) from top edge',
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Width must be > 0',
        },
      },
      comment: 'Element width in millimeters (mm), must be > 0',
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Height must be > 0',
        },
      },
      comment: 'Element height in millimeters (mm), must be > 0',
    },
    rotation: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [-180],
          msg: 'Rotation must be >= -180',
        },
        max: {
          args: [180],
          msg: 'Rotation must be <= 180',
        },
      },
      comment: 'Rotation angle in degrees (-180 to 180)',
    },
    zIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Z-index must be >= 0',
        },
        isInt: {
          msg: 'Z-index must be an integer',
        },
      },
      comment: 'Z-index for layer ordering (0 = bottom)',
    },
    stickerLibraryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'user_stickers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional foreign key to UserSticker (for sticker type elements)',
    },
    content: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isObject(value: any) {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('Content must be a JSON object');
          }
        },
      },
      comment: 'Element content (type-specific data stored as JSON)',
    },
    style: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isObject(value: any) {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error('Style must be a JSON object');
          }
        },
      },
      comment: 'Element styling properties stored as JSON',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Optional custom metadata for element-specific properties',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when element was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when element was last updated',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp when element was soft-deleted (paranoid mode)',
    },
  },
  {
    sequelize,
    tableName: 'page_elements',
    modelName: 'PageElement',
    timestamps: true,
    paranoid: true, // Enable soft delete with deletedAt field
    underscored: true, // Use snake_case for automatically added fields
    indexes: [
      {
        fields: ['page_id'],
        name: 'idx_element_page',
      },
      {
        fields: ['type'],
        name: 'idx_element_type',
      },
      {
        fields: ['z_index'],
        name: 'idx_element_zindex',
      },
      {
        fields: ['page_id', 'z_index'],
        name: 'idx_element_page_zindex',
      },
      {
        fields: ['sticker_library_id'],
        name: 'idx_element_sticker',
      },
      {
        fields: ['created_at'],
        name: 'idx_element_created_at',
      },
    ],
  }
);

/**
 * Define associations
 *
 * Note: Associations are defined in src/models/associations.ts to avoid circular dependencies.
 *
 * Relationships:
 * - PageElement belongs to Page (many elements per page)
 */

export default PageElement;
