/**
 * NotebookPermissions Model
 *
 * This module defines the NotebookPermissions model for managing notebook sharing and visibility settings.
 * The NotebookPermissions model controls who can access a notebook and how they can interact with it.
 *
 * A notebook permission record defines the visibility level (private, public, restricted) and manages
 * access control through public links or explicit user/email allowlists for restricted access.
 *
 * Features:
 * - Three permission types: private (owner only), public (anyone with link), restricted (specific users/emails)
 * - Public link generation for shareable notebooks (unique URL slug)
 * - Allowlists for restricted access (emails or user IDs)
 * - One-to-one relationship with Notebook (each notebook has exactly one permissions record)
 * - Automatic creation on notebook creation (defaults to private)
 *
 * @module models/NotebookPermissions
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Interface defining all fields in the NotebookPermissions model
 * This represents the complete structure of a notebook permissions record in the database
 *
 * @interface INotebookPermissions
 */
export interface INotebookPermissions {
  /** Unique identifier (UUID) */
  id: string;

  /** Foreign key to Notebook this permissions record belongs to */
  notebookId: string;

  /** Permission type: private (owner only), public (anyone with link), restricted (allowlist) */
  type: 'private' | 'public' | 'restricted';

  /** Unique URL slug for public sharing (null if private/restricted) */
  publicLink?: string;

  /** JSON array of allowed email addresses for restricted access */
  allowedEmails?: string[];

  /** JSON array of allowed user UUIDs for restricted access */
  allowedUserIds?: string[];

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;
}

/**
 * Attributes required when creating new notebook permissions
 * Makes some fields optional that are auto-generated or have defaults
 */
export interface NotebookPermissionsCreationAttributes
  extends Optional<
    INotebookPermissions,
    | 'id'
    | 'type'
    | 'publicLink'
    | 'allowedEmails'
    | 'allowedUserIds'
    | 'createdAt'
    | 'updatedAt'
  > {}

/**
 * NotebookPermissions Model Class
 *
 * Extends Sequelize Model to provide type-safe database operations.
 * This class represents the notebook_permissions table in PostgreSQL.
 *
 * @class NotebookPermissions
 * @extends Model<INotebookPermissions, NotebookPermissionsCreationAttributes>
 */
export class NotebookPermissions
  extends Model<INotebookPermissions, NotebookPermissionsCreationAttributes>
  implements INotebookPermissions
{
  public id!: string;
  public notebookId!: string;
  public type!: 'private' | 'public' | 'restricted';
  public publicLink?: string;
  public allowedEmails?: string[];
  public allowedUserIds?: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Check if notebook is private (owner only access)
   * Convenience method to check privacy status
   *
   * @returns {boolean} True if notebook is private
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * if (permissions.isPrivate()) {
   *   console.log('This notebook is private');
   * }
   */
  public isPrivate(): boolean {
    return this.type === 'private';
  }

  /**
   * Check if notebook is public (accessible via public link)
   * Convenience method to check public accessibility
   *
   * @returns {boolean} True if notebook is public
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * if (permissions.isPublic()) {
   *   // Generate and return public link
   * }
   */
  public isPublic(): boolean {
    return this.type === 'public' && this.publicLink !== null;
  }

  /**
   * Check if notebook is restricted (allowlist-based access)
   * Convenience method to check restricted status
   *
   * @returns {boolean} True if notebook has restricted access
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * if (permissions.isRestricted()) {
   *   // Check if user is in allowlist
   * }
   */
  public isRestricted(): boolean {
    return this.type === 'restricted';
  }

  /**
   * Check if a user ID is in the allowed users list
   * Validates if a specific user has restricted access
   *
   * @param {string} userId - User UUID to check
   * @returns {boolean} True if user is in allowlist
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * if (permissions.isUserAllowed('user-uuid-123')) {
   *   // Grant access
   * }
   */
  public isUserAllowed(userId: string): boolean {
    if (!this.isRestricted() || !this.allowedUserIds) {
      return false;
    }
    return this.allowedUserIds.includes(userId);
  }

  /**
   * Check if an email is in the allowed emails list
   * Validates if a specific email has restricted access
   *
   * @param {string} email - Email address to check
   * @returns {boolean} True if email is in allowlist
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * if (permissions.isEmailAllowed('user@example.com')) {
   *   // Grant access
   * }
   */
  public isEmailAllowed(email: string): boolean {
    if (!this.isRestricted() || !this.allowedEmails) {
      return false;
    }
    return this.allowedEmails.includes(email.toLowerCase());
  }

  /**
   * Get display name for permission type
   * Returns human-readable permission type for UI display
   *
   * @returns {string} Display name for permission type
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * console.log(permissions.getTypeDisplayName()); // "Private"
   */
  public getTypeDisplayName(): string {
    const typeNames: Record<string, string> = {
      private: 'Private',
      public: 'Public',
      restricted: 'Restricted',
    };
    return typeNames[this.type] || this.type;
  }

  /**
   * Convert permissions to safe JSON (without internal metadata)
   * Prepares permissions object for API responses
   *
   * @returns {object} Permissions object safe for API responses
   *
   * @example
   * const permissions = await NotebookPermissions.findOne({ where: { notebookId } });
   * res.json({ permissions: permissions.toSafeJSON() });
   */
  public toSafeJSON(): object {
    const values = this.toJSON() as INotebookPermissions;
    // For private notebooks, don't expose allowlists
    if (this.isPrivate()) {
      const { allowedEmails, allowedUserIds, publicLink, ...safePermissions } = values;
      return safePermissions;
    }
    // For public notebooks, don't expose allowlists
    if (this.isPublic()) {
      const { allowedEmails, allowedUserIds, ...safePermissions } = values;
      return safePermissions;
    }
    // For restricted notebooks, expose allowlists but not internal fields
    return values;
  }
}

/**
 * Initialize NotebookPermissions model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
NotebookPermissions.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the notebook permissions record',
    },
    notebookId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'notebooks',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      validate: {
        notEmpty: {
          msg: 'Notebook ID is required',
        },
      },
      comment: 'Foreign key to notebook this permissions record belongs to',
    },
    type: {
      type: DataTypes.ENUM('private', 'public', 'restricted'),
      allowNull: false,
      defaultValue: 'private',
      validate: {
        isIn: {
          args: [['private', 'public', 'restricted']],
          msg: 'Type must be one of: private, public, restricted',
        },
      },
      comment: 'Permission type (private/public/restricted)',
    },
    publicLink: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Public link must not exceed 100 characters',
        },
      },
      comment: 'Unique URL slug for public sharing (null if private/restricted)',
    },
    allowedEmails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of allowed email addresses for restricted access',
    },
    allowedUserIds: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of allowed user UUIDs for restricted access',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when permissions record was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when permissions record was last updated',
    },
  },
  {
    sequelize,
    tableName: 'notebook_permissions',
    modelName: 'NotebookPermissions',
    timestamps: true,
    paranoid: false, // No soft delete for permissions
    underscored: true, // Use snake_case for automatically added fields
    indexes: [
      {
        fields: ['notebook_id'],
        unique: true,
        name: 'notebook_permissions_notebook_id_idx',
      },
      {
        fields: ['public_link'],
        unique: true,
        name: 'notebook_permissions_public_link_idx',
      },
      {
        fields: ['type'],
        name: 'notebook_permissions_type_idx',
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
 * - NotebookPermissions belongs to Notebook (one-to-one)
 * - Notebook has one NotebookPermissions (defined in associations.ts)
 */

export default NotebookPermissions;
