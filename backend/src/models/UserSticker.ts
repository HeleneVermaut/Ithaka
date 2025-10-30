/**
 * UserSticker Model
 *
 * This module defines the UserSticker model for managing user's personal sticker collections.
 * Each UserSticker represents a saved image asset that can be reused across multiple pages
 * in different notebooks, enabling users to build personal design libraries.
 *
 * Features:
 * - Ownership constraint tied to User
 * - Cloudinary integration for cloud storage and image delivery
 * - Thumbnail URLs for preview in sticker library UI
 * - Tagging system for searching and organizing stickers
 * - Public/private sharing flag for future marketplace features
 * - Usage tracking for analytics and recommendations
 * - Soft-delete support via paranoid mode for recovery capability
 * - Unique constraint on (userId, cloudinaryPublicId) to prevent duplicates
 *
 * @module models/UserSticker
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Interface defining all fields in the UserSticker model
 * This represents the complete structure of a user sticker record in the database
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
 * Attributes required when creating a new user sticker
 * Makes some fields optional that are auto-generated or have defaults
 */
export interface UserStickerCreationAttributes
  extends Optional<
    IUserSticker,
    | 'id'
    | 'thumbnailUrl'
    | 'tags'
    | 'isPublic'
    | 'usageCount'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}

/**
 * UserSticker Model Class
 *
 * Extends Sequelize Model to provide type-safe database operations.
 * This class represents the user_stickers table in PostgreSQL.
 *
 * @class UserSticker
 * @extends Model<IUserSticker, UserStickerCreationAttributes>
 */
export class UserSticker extends Model<IUserSticker, UserStickerCreationAttributes> implements IUserSticker {
  declare id: string;
  declare userId: string;
  declare name: string;
  declare cloudinaryUrl: string;
  declare cloudinaryPublicId: string;
  declare thumbnailUrl: string;
  declare tags: string[];
  declare isPublic: boolean;
  declare usageCount: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt?: Date | null;

  /**
   * Check if sticker is soft-deleted
   * Returns true if deletedAt timestamp is set (paranoid mode)
   *
   * @returns {boolean} True if sticker is soft-deleted
   *
   * @example
   * const sticker = await UserSticker.findByPk(stickerId, { paranoid: false });
   * if (sticker.isDeleted()) {
   *   console.log('This sticker has been deleted');
   * }
   */
  public isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  /**
   * Add tag to this sticker
   * Ensures no duplicate tags and maintains lowercase formatting
   *
   * @param {string} tag - Tag to add (will be converted to lowercase)
   * @returns {Promise<void>}
   *
   * @example
   * await sticker.addTag('nature');
   * // tags are now ["nature"]
   */
  public async addTag(tag: string): Promise<void> {
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
      await this.save();
    }
  }

  /**
   * Remove tag from this sticker
   *
   * @param {string} tag - Tag to remove
   * @returns {Promise<void>}
   *
   * @example
   * await sticker.removeTag('cute');
   */
  public async removeTag(tag: string): Promise<void> {
    const normalizedTag = tag.toLowerCase().trim();
    const index = this.tags.indexOf(normalizedTag);
    if (index > -1) {
      this.tags.splice(index, 1);
      await this.save();
    }
  }

  /**
   * Increment usage counter for analytics
   * Called when sticker is placed on a page
   *
   * @returns {Promise<number>} Updated usage count
   *
   * @example
   * await sticker.incrementUsage();
   */
  public async incrementUsage(): Promise<number> {
    this.usageCount += 1;
    await this.save();
    return this.usageCount;
  }

  /**
   * Get sticker information for serialization
   * Excludes sensitive fields and paranoid timestamp
   *
   * @returns {object} Sticker data safe for API responses
   *
   * @example
   * const sticker = await UserSticker.findByPk(stickerId);
   * res.json(sticker.toSafeJSON());
   */
  public toSafeJSON(): object {
    const values = this.toJSON() as IUserSticker;
    const { deletedAt, ...safeSticker } = values;
    return safeSticker;
  }
}

/**
 * Initialize UserSticker model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
UserSticker.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the user sticker',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notEmpty: {
          msg: 'User ID is required',
        },
      },
      comment: 'Foreign key to user who owns this sticker',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Sticker name is required',
        },
        len: {
          args: [1, 100],
          msg: 'Sticker name must be between 1 and 100 characters',
        },
      },
      comment: 'User-friendly name for this sticker',
    },
    cloudinaryUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        isUrl: {
          msg: 'Cloudinary URL must be a valid HTTPS URL',
        },
        notEmpty: {
          msg: 'Cloudinary URL is required',
        },
      },
      comment: 'Public URL from Cloudinary for displaying the sticker',
    },
    cloudinaryPublicId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Cloudinary public ID is required',
        },
      },
      comment: 'Cloudinary public ID (unique per user, format: /users/:userId/stickers/:id)',
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
      validate: {
        isUrl: {
          msg: 'Thumbnail URL must be a valid HTTPS URL',
        },
      },
      comment: 'Thumbnail URL from Cloudinary (w_100,h_100,c_fit) for preview in library',
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        // Custom validator for tags array
        isValidTagsArray(value: any) {
          if (!Array.isArray(value)) {
            throw new Error('Tags must be an array');
          }
          if (value.length > 10) {
            throw new Error('Maximum 10 tags allowed');
          }
          for (const tag of value) {
            if (typeof tag !== 'string' || tag.length === 0 || tag.length > 30) {
              throw new Error('Each tag must be a string between 1 and 30 characters');
            }
          }
        },
      },
      comment: 'Array of tags for organizing and searching stickers',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isIn: {
          args: [[true, false]],
          msg: 'isPublic must be a boolean',
        },
      },
      comment: 'Whether this sticker is publicly visible (for future marketplace)',
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Usage count cannot be negative',
        },
        isInt: {
          msg: 'Usage count must be an integer',
        },
      },
      comment: 'Counter for tracking sticker usage across pages (analytics)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when sticker was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when sticker was last updated',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp when sticker was soft-deleted (paranoid mode)',
    },
  },
  {
    sequelize,
    tableName: 'user_stickers',
    modelName: 'UserSticker',
    timestamps: true,
    paranoid: true, // Enable soft delete with deletedAt field
    underscored: true, // Use snake_case for automatically added fields
    indexes: [
      {
        fields: ['user_id'],
        name: 'idx_sticker_user',
      },
      {
        fields: ['is_public'],
        name: 'idx_sticker_public',
      },
      {
        fields: ['user_id', 'name'],
        name: 'idx_sticker_user_name',
      },
      {
        fields: ['user_id', 'cloudinary_public_id'],
        unique: true,
        name: 'idx_sticker_user_cloudinary_unique',
      },
      {
        fields: ['created_at'],
        name: 'idx_sticker_created_at',
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
 * - UserSticker belongs to User (many stickers per user)
 * - UserSticker has many PageElements (can be used in multiple page elements)
 */

export default UserSticker;
