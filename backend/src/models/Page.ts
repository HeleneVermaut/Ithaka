/**
 * Page Model
 *
 * This module defines the Page model for managing individual pages within notebooks.
 * Each page represents a single page in a notebook/journal and serves as a container
 * for canvas elements (text, images, shapes, etc.).
 *
 * Features:
 * - Sequential page numbering per notebook (page 1, 2, 3...)
 * - Support for custom cover pages (distinct from regular pages)
 * - Relationship to parent Notebook with CASCADE delete
 * - Unique constraint on (notebookId, pageNumber) to prevent duplicate page numbers
 *
 * @module models/Page
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Interface defining all fields in the Page model
 * This represents the complete structure of a page record in the database
 *
 * @interface IPage
 */
export interface IPage {
  /** Unique identifier (UUID) */
  id: string;

  /** Foreign key to parent Notebook */
  notebookId: string;

  /** Sequential page number within notebook (1, 2, 3, ...) */
  pageNumber: number;

  /** Flag indicating if this is a custom cover page */
  isCustomCover: boolean;

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;
}

/**
 * Attributes required when creating a new page
 * Makes some fields optional that are auto-generated or have defaults
 */
export interface PageCreationAttributes
  extends Optional<
    IPage,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
  > {}

/**
 * Page Model Class
 *
 * Extends Sequelize Model to provide type-safe database operations.
 * This class represents the pages table in PostgreSQL.
 *
 * @class Page
 * @extends Model<IPage, PageCreationAttributes>
 */
export class Page extends Model<IPage, PageCreationAttributes> implements IPage {
  declare id: string;
  declare notebookId: string;
  declare pageNumber: number;
  declare isCustomCover: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Check if this is a custom cover page
   * Convenience method to check if page is designated as cover
   *
   * @returns {boolean} True if this page is a custom cover
   *
   * @example
   * const page = await Page.findByPk(pageId);
   * if (page.isCover()) {
   *   // Apply cover styling
   * }
   */
  public isCover(): boolean {
    return this.isCustomCover;
  }

  /**
   * Get display label for page
   * Returns human-readable page identifier for UI display
   *
   * @returns {string} Display label (e.g., "Cover Page" or "Page 1")
   *
   * @example
   * const page = await Page.findByPk(pageId);
   * console.log(page.getDisplayLabel()); // "Cover Page" or "Page 1"
   */
  public getDisplayLabel(): string {
    return this.isCustomCover ? 'Cover Page' : `Page ${this.pageNumber}`;
  }
}

/**
 * Initialize Page model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
Page.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the page',
    },
    notebookId: {
      type: DataTypes.UUID,
      allowNull: false,
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
      comment: 'Foreign key to parent notebook',
    },
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Page number must be at least 1',
        },
        isInt: {
          msg: 'Page number must be an integer',
        },
      },
      comment: 'Sequential page number within notebook',
    },
    isCustomCover: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag indicating if this is a custom cover page',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when page was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when page was last updated',
    },
  },
  {
    sequelize,
    tableName: 'pages',
    modelName: 'Page',
    timestamps: true,
    paranoid: false, // Hard delete (pages are cascade deleted with notebook)
    underscored: true, // Use snake_case for automatically added fields
    indexes: [
      {
        fields: ['notebook_id'],
        name: 'idx_page_notebook',
      },
      {
        fields: ['notebook_id', 'page_number'],
        unique: true,
        name: 'idx_page_number_notebook',
      },
      {
        fields: ['created_at'],
        name: 'idx_page_created_at',
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
 * - Page belongs to Notebook (many pages per notebook)
 * - Page has many PageElements (created in this task)
 */

export default Page;
