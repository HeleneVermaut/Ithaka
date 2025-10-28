/**
 * Model Associations
 *
 * This module defines all Sequelize model associations to avoid circular dependency issues.
 * All models are imported here and their relationships are established after all models are loaded.
 *
 * This pattern ensures that:
 * - Models can be imported independently without triggering circular imports
 * - Associations are defined in a centralized location
 * - Bidirectional relationships are properly established
 *
 * Usage:
 * Import this file after all models are loaded to initialize associations:
 * import './models/associations';
 *
 * @module models/associations
 */

import { User } from './User';
import { Notebook } from './Notebook';
import { NotebookPermissions } from './NotebookPermissions';
import { Page } from './Page';
import { PageElement } from './PageElement';

/**
 * Initialize all model associations
 *
 * This function is called automatically when this module is imported.
 * It establishes all bidirectional relationships between models.
 */
export function initializeAssociations(): void {
  // User <-> Notebook (one-to-many)
  User.hasMany(Notebook, {
    foreignKey: 'userId',
    as: 'notebooks',
    onDelete: 'CASCADE',
  });

  Notebook.belongsTo(User, {
    foreignKey: 'userId',
    as: 'owner',
  });

  // Notebook <-> NotebookPermissions (one-to-one)
  Notebook.hasOne(NotebookPermissions, {
    foreignKey: 'notebookId',
    as: 'permissions',
    onDelete: 'CASCADE',
  });

  NotebookPermissions.belongsTo(Notebook, {
    foreignKey: 'notebookId',
    as: 'notebook',
  });

  // Notebook <-> Page (one-to-many) - US03
  Notebook.hasMany(Page, {
    foreignKey: 'notebookId',
    as: 'pages',
    onDelete: 'CASCADE',
  });

  Page.belongsTo(Notebook, {
    foreignKey: 'notebookId',
    as: 'notebook',
  });

  // Page <-> PageElement (one-to-many) - US03
  Page.hasMany(PageElement, {
    foreignKey: 'pageId',
    as: 'elements',
    onDelete: 'CASCADE',
  });

  PageElement.belongsTo(Page, {
    foreignKey: 'pageId',
    as: 'page',
  });
}

// Initialize associations when this module is imported
initializeAssociations();
