/**
 * Models Index
 *
 * Barrel export file for all Sequelize models.
 * This centralizes model exports for cleaner imports throughout the application.
 *
 * Usage:
 * import { User, Notebook, NotebookPermissions } from './models';
 *
 * @module models
 */

export { User } from './User';
export { Notebook } from './Notebook';
export { NotebookPermissions } from './NotebookPermissions';

// Initialize all model associations after models are loaded
// This must be imported after model exports to avoid circular dependencies
import './associations';

// Future exports:
// export { Page } from './Page'; // US03
// export { PageElement } from './PageElement'; // US03+
