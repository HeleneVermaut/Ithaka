/**
 * Notebook Model
 *
 * This module defines the Notebook model for travel journals and daily diaries.
 * The Notebook model is the core entity for organizing pages, managing content structure,
 * and tracking journal metadata for export and sharing.
 *
 * A notebook represents a complete journal (Voyage, Daily, or Reportage) with defined
 * format and orientation settings that determine page layouts and PDF export specifications.
 *
 * Features:
 * - Multiple notebook types (Voyage for travel journals, Daily for daily logs, Reportage for reports)
 * - Configurable format (A4/A5) and orientation (portrait/landscape)
 * - Archive functionality (archivedAt timestamp, status enum)
 * - Cover image support for personalization
 * - Page count tracking (incremented by US03 page operations)
 * - Fixed 300 DPI for high-quality PDF export (US09)
 *
 * @module models/Notebook
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Interface defining all fields in the Notebook model
 * This represents the complete structure of a notebook record in the database
 *
 * @interface INotebook
 */
export interface INotebook {
  /** Unique identifier (UUID) */
  id: string;

  /** Foreign key to User who owns this notebook */
  userId: string;

  /** Notebook title (required, max 100 characters) */
  title: string;

  /** Optional notebook description (max 300 characters) */
  description?: string;

  /** Type of notebook: Voyage (travel), Daily (daily log), Reportage (report) */
  type: 'Voyage' | 'Daily' | 'Reportage';

  /** Page format for PDF export (A4 or A5) */
  format: 'A4' | 'A5';

  /** Page orientation for PDF export (portrait or landscape) */
  orientation: 'portrait' | 'landscape';

  /** DPI setting for PDF export (fixed at 300 for high quality) */
  dpi: number;

  /** Number of pages in this notebook (auto-incremented by US03) */
  pageCount: number;

  /** Optional cover image URL or base64 string */
  coverImageUrl?: string;

  /** Notebook status (active or archived) */
  status: 'active' | 'archived';

  /** Timestamp when notebook was archived (null if active) */
  archivedAt?: Date;

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;

  /** Timestamp when record was hard-deleted (paranoid disabled) */
  deletedAt?: Date;
}

/**
 * Attributes required when creating a new notebook
 * Makes some fields optional that are auto-generated or have defaults
 */
export interface NotebookCreationAttributes
  extends Optional<
    INotebook,
    | 'id'
    | 'description'
    | 'dpi'
    | 'pageCount'
    | 'coverImageUrl'
    | 'status'
    | 'archivedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}

/**
 * Notebook Model Class
 *
 * Extends Sequelize Model to provide type-safe database operations.
 * This class represents the notebooks table in PostgreSQL.
 *
 * @class Notebook
 * @extends Model<INotebook, NotebookCreationAttributes>
 */
export class Notebook extends Model<INotebook, NotebookCreationAttributes> implements INotebook {
  public id!: string;
  public userId!: string;
  public title!: string;
  public description?: string;
  public type!: 'Voyage' | 'Daily' | 'Reportage';
  public format!: 'A4' | 'A5';
  public orientation!: 'portrait' | 'landscape';
  public dpi!: number;
  public pageCount!: number;
  public coverImageUrl?: string;
  public status!: 'active' | 'archived';
  public archivedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  /**
   * Check if notebook is currently archived
   * Convenience method to check archive status
   *
   * @returns {boolean} True if notebook is archived
   *
   * @example
   * const notebook = await Notebook.findByPk(notebookId);
   * if (notebook.isArchived()) {
   *   console.log('This notebook is archived');
   * }
   */
  public isArchived(): boolean {
    return this.status === 'archived' && this.archivedAt !== null;
  }

  /**
   * Check if notebook is active (not archived)
   * Convenience method to check active status
   *
   * @returns {boolean} True if notebook is active
   *
   * @example
   * const notebook = await Notebook.findByPk(notebookId);
   * if (notebook.isActive()) {
   *   // Allow editing
   * }
   */
  public isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if notebook can be deleted
   * Notebooks must be archived before deletion (soft archive, then hard delete)
   *
   * @returns {boolean} True if notebook can be deleted
   *
   * @example
   * const notebook = await Notebook.findByPk(notebookId);
   * if (notebook.canBeDeleted()) {
   *   await notebook.destroy();
   * }
   */
  public canBeDeleted(): boolean {
    return this.isArchived();
  }

  /**
   * Get display name for notebook type
   * Returns human-readable type name for UI display
   *
   * @returns {string} Display name for type
   *
   * @example
   * const notebook = await Notebook.findByPk(notebookId);
   * console.log(notebook.getTypeDisplayName()); // "Travel Journal"
   */
  public getTypeDisplayName(): string {
    const typeNames: Record<string, string> = {
      Voyage: 'Travel Journal',
      Daily: 'Daily Diary',
      Reportage: 'Reportage',
    };
    return typeNames[this.type] || this.type;
  }

  /**
   * Convert notebook to safe JSON (without internal metadata)
   * Removes deletedAt field before sending to client
   *
   * @returns {object} Notebook object safe for API responses
   *
   * @example
   * const notebook = await Notebook.findByPk(notebookId);
   * res.json({ notebook: notebook.toSafeJSON() });
   */
  public toSafeJSON(): object {
    const values = this.toJSON() as INotebook;
    // Remove internal fields
    const { deletedAt, ...safeNotebook } = values;
    return safeNotebook;
  }
}

/**
 * Initialize Notebook model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
Notebook.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the notebook',
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
      comment: 'Foreign key to user who owns this notebook',
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title is required',
        },
        len: {
          args: [1, 100],
          msg: 'Title must be between 1 and 100 characters',
        },
      },
      comment: 'Notebook title',
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: true,
      validate: {
        len: {
          args: [0, 300],
          msg: 'Description must not exceed 300 characters',
        },
      },
      comment: 'Optional notebook description',
    },
    type: {
      type: DataTypes.ENUM('Voyage', 'Daily', 'Reportage'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['Voyage', 'Daily', 'Reportage']],
          msg: 'Type must be one of: Voyage, Daily, Reportage',
        },
      },
      comment: 'Type of notebook (Voyage/Daily/Reportage)',
    },
    format: {
      type: DataTypes.ENUM('A4', 'A5'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['A4', 'A5']],
          msg: 'Format must be either A4 or A5',
        },
      },
      comment: 'Page format for PDF export (A4 or A5)',
    },
    orientation: {
      type: DataTypes.ENUM('portrait', 'landscape'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['portrait', 'landscape']],
          msg: 'Orientation must be either portrait or landscape',
        },
      },
      comment: 'Page orientation for PDF export',
    },
    dpi: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300,
      comment: 'DPI setting for PDF export (fixed at 300)',
    },
    pageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Page count cannot be negative',
        },
      },
      comment: 'Number of pages in this notebook',
    },
    coverImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Optional cover image URL or base64 string',
    },
    status: {
      type: DataTypes.ENUM('active', 'archived'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: {
          args: [['active', 'archived']],
          msg: 'Status must be either active or archived',
        },
      },
      comment: 'Notebook status (active or archived)',
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when notebook was archived (null if active)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when notebook was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when notebook was last updated',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when notebook was hard-deleted',
    },
  },
  {
    sequelize,
    tableName: 'notebooks',
    modelName: 'Notebook',
    timestamps: true,
    paranoid: false, // Hard delete only (no soft delete)
    underscored: true, // Use snake_case for automatically added fields
    indexes: [
      {
        fields: ['user_id'],
        name: 'notebooks_user_id_idx',
      },
      {
        fields: ['user_id', 'archived_at'],
        name: 'notebooks_user_id_archived_at_idx',
      },
      {
        fields: ['created_at'],
        name: 'notebooks_created_at_idx',
      },
      {
        fields: ['type'],
        name: 'notebooks_type_idx',
      },
      {
        fields: ['title'],
        name: 'notebooks_title_idx',
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
 * - Notebook belongs to User (many notebooks per user)
 * - Notebook has one NotebookPermissions (created in TASK02)
 * - Notebook has many Pages (will be created in US03)
 */

export default Notebook;
