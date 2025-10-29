/**
 * Notebook Service
 *
 * This service contains all the business logic for notebook management including:
 * - Creating new notebooks with default permissions
 * - Retrieving notebooks with ownership validation
 * - Updating notebook metadata (title, description, cover, dpi only)
 * - Deleting notebooks (hard delete with cascade to permissions)
 * - Listing user's active notebooks
 *
 * Security considerations:
 * - All operations validate ownership (userId must match notebook.userId)
 * - Returns null for both "not found" and "unauthorized" to prevent information leakage
 * - Immutable fields (type, format, orientation) cannot be changed after creation
 * - Status and pageCount are managed by system, not editable
 *
 * Business rules:
 * - New notebooks default to: pageCount=0, status='active', dpi=300, permissions='private'
 * - Type, format, and orientation are immutable after creation
 * - Only active notebooks are returned in getUserNotebooks
 * - Deleting a notebook cascades to NotebookPermissions (foreign key constraint)
 *
 * @module services/notebookService
 */

import { Notebook } from '../models/Notebook';
import { NotebookPermissions } from '../models/NotebookPermissions';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { createPage } from './pageService';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import {
  buildWhereClause,
  buildOrderClause,
  buildPaginationParams,
  buildPaginationMetadata,
  FilterParams,
  PaginationMetadata,
} from '../utils/queryBuilder';

/**
 * DTO for creating a new notebook
 *
 * @interface CreateNotebookDto
 */
export interface CreateNotebookDto {
  /** Notebook title (required, max 100 characters) */
  title: string;

  /** Optional notebook description (max 300 characters) */
  description?: string;

  /** Type of notebook: Voyage (travel), Daily (daily log), Reportage (report) - IMMUTABLE */
  type: 'Voyage' | 'Daily' | 'Reportage';

  /** Page format for PDF export (A4 or A5) - IMMUTABLE */
  format: 'A4' | 'A5';

  /** Page orientation for PDF export (portrait or landscape) - IMMUTABLE */
  orientation: 'portrait' | 'landscape';

  /** Optional DPI setting for PDF export (defaults to 300 if not provided) */
  dpi?: number;

  /** Optional cover image URL or base64 string */
  coverImageUrl?: string;
}

/**
 * DTO for updating an existing notebook
 * Only allows updating specific mutable fields
 *
 * @interface UpdateNotebookDto
 */
export interface UpdateNotebookDto {
  /** Update notebook title (max 100 characters) */
  title?: string;

  /** Update notebook description (max 300 characters) */
  description?: string;

  /** Update cover image URL or base64 string */
  coverImageUrl?: string;

  /** Update DPI setting for PDF export */
  dpi?: number;
}

/**
 * Create a new notebook with default permissions
 *
 * This function creates a new notebook owned by the specified user with all
 * required settings. It automatically creates a NotebookPermissions record
 * with type='private' for the new notebook.
 *
 * Defaults applied:
 * - pageCount: 0 (no pages yet)
 * - status: 'active' (notebook is active)
 * - dpi: 300 (if not provided in data)
 * - permissions.type: 'private' (only owner can access)
 *
 * @async
 * @param {string} userId - UUID of the user creating the notebook
 * @param {CreateNotebookDto} data - Notebook creation data
 * @returns {Promise<Notebook>} Created notebook with permissions included
 * @throws {AppError} 404 if user not found, 400 if validation fails, 500 if creation fails
 *
 * @example
 * const notebook = await createNotebook(userId, {
 *   title: 'My Travel Journal',
 *   description: 'Summer 2025 Europe trip',
 *   type: 'Voyage',
 *   format: 'A4',
 *   orientation: 'portrait',
 *   dpi: 300
 * });
 */
export const createNotebook = async (
  userId: string,
  data: CreateNotebookDto
): Promise<Notebook> => {
  try {
    // 1. Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('Notebook creation attempted for non-existent user', { userId });
      throw new AppError('User not found', 404);
    }

    // 2. Create notebook with defaults
    const notebook = await Notebook.create({
      userId,
      title: data.title,
      description: data.description,
      type: data.type,
      format: data.format,
      orientation: data.orientation,
      dpi: data.dpi || 300, // Default to 300 DPI
      pageCount: 0, // No pages initially (will update to 1 after creating first page)
      coverImageUrl: data.coverImageUrl,
      status: 'active', // New notebooks are active
    });

    // 3. Create associated permissions with default type='private'
    await NotebookPermissions.create({
      notebookId: notebook.id,
      type: 'private', // Default to private
    });

    // 4. Create first page automatically
    try {
      await createPage(notebook.id, 1, false, userId);
      // Update pageCount to 1
      await notebook.update({ pageCount: 1 });
    } catch (pageError) {
      logger.warn('Failed to create first page for notebook', {
        notebookId: notebook.id,
        error: pageError,
      });
      // Don't fail the notebook creation if first page creation fails
      // This prevents users from being blocked from creating notebooks
    }

    logger.info('Notebook created successfully', {
      notebookId: notebook.id,
      userId: user.id,
      title: notebook.title,
      type: notebook.type,
    });

    // 5. Return notebook with associations
    const notebookWithAssociations = await Notebook.findByPk(notebook.id, {
      include: [
        { model: NotebookPermissions, as: 'permissions' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!notebookWithAssociations) {
      throw new AppError('Failed to retrieve created notebook', 500);
    }

    return notebookWithAssociations;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Failed to create notebook', error);
    throw new AppError('Failed to create notebook', 500);
  }
};

/**
 * Get a notebook by ID with ownership validation
 *
 * This function retrieves a notebook and validates that the requesting user
 * is the owner. For security, it returns null for both "not found" and
 * "unauthorized" cases to prevent information leakage (attackers cannot
 * enumerate notebook IDs).
 *
 * @async
 * @param {string} notebookId - UUID of the notebook to retrieve
 * @param {string} userId - UUID of the user requesting the notebook
 * @returns {Promise<Notebook | null>} Notebook with associations, or null if not found/unauthorized
 *
 * @example
 * const notebook = await getNotebookById(notebookId, userId);
 * if (!notebook) {
 *   return res.status(404).json({ error: 'Notebook not found' });
 * }
 */
export const getNotebookById = async (
  notebookId: string,
  userId: string
): Promise<Notebook | null> => {
  try {
    // Fetch notebook by ID with associations
    const notebook = await Notebook.findByPk(notebookId, {
      include: [
        { model: NotebookPermissions, as: 'permissions' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    // SECURITY: Return null for both "not found" and "unauthorized" cases
    // This prevents information leakage (attacker cannot determine if notebook exists)
    if (!notebook || notebook.userId !== userId) {
      if (notebook) {
        logger.warn('Unauthorized notebook access attempt', {
          notebookId,
          userId,
          ownerId: notebook.userId,
        });
      }
      return null;
    }

    logger.debug('Notebook retrieved successfully', {
      notebookId: notebook.id,
      userId,
    });

    return notebook;
  } catch (error) {
    logger.error('Failed to retrieve notebook', { notebookId, userId, error });
    throw new AppError('Failed to retrieve notebook', 500);
  }
};

/**
 * Update notebook metadata (only mutable fields)
 *
 * This function updates a notebook's mutable fields. The following fields
 * are IMMUTABLE and cannot be changed after creation:
 * - type (Voyage/Daily/Reportage)
 * - format (A4/A5)
 * - orientation (portrait/landscape)
 * - pageCount (managed by system)
 * - status (managed by system)
 * - archivedAt (managed by system)
 *
 * Only these fields can be updated:
 * - title
 * - description
 * - coverImageUrl
 * - dpi
 *
 * @async
 * @param {string} notebookId - UUID of the notebook to update
 * @param {string} userId - UUID of the user requesting the update
 * @param {UpdateNotebookDto} data - Fields to update
 * @returns {Promise<Notebook | null>} Updated notebook, or null if not found/unauthorized
 * @throws {AppError} 500 if update fails
 *
 * @example
 * const updated = await updateNotebook(notebookId, userId, {
 *   title: 'Updated Title',
 *   description: 'New description',
 *   dpi: 300
 * });
 */
export const updateNotebook = async (
  notebookId: string,
  userId: string,
  data: UpdateNotebookDto
): Promise<Notebook | null> => {
  try {
    // 1. Validate ownership first
    const notebook = await Notebook.findByPk(notebookId);

    // SECURITY: Return null for both "not found" and "unauthorized" cases
    if (!notebook || notebook.userId !== userId) {
      if (notebook) {
        logger.warn('Unauthorized notebook update attempt', {
          notebookId,
          userId,
          ownerId: notebook.userId,
        });
      }
      return null;
    }

    // 2. Build update object with only allowed fields
    const allowedUpdates: Partial<UpdateNotebookDto> = {};

    if (data.title !== undefined) {
      allowedUpdates.title = data.title;
    }
    if (data.description !== undefined) {
      allowedUpdates.description = data.description;
    }
    if (data.coverImageUrl !== undefined) {
      allowedUpdates.coverImageUrl = data.coverImageUrl;
    }
    if (data.dpi !== undefined) {
      allowedUpdates.dpi = data.dpi;
    }

    // 3. Update notebook with allowed fields only
    await notebook.update(allowedUpdates);

    logger.info('Notebook updated successfully', {
      notebookId: notebook.id,
      userId,
      updatedFields: Object.keys(allowedUpdates),
    });

    // 4. Return updated notebook with associations
    const updatedNotebook = await Notebook.findByPk(notebook.id, {
      include: [
        { model: NotebookPermissions, as: 'permissions' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    return updatedNotebook;
  } catch (error) {
    logger.error('Failed to update notebook', { notebookId, userId, error });
    throw new AppError('Failed to update notebook', 500);
  }
};

/**
 * Delete a notebook (hard delete)
 *
 * This function permanently deletes a notebook from the database.
 * The database foreign key constraint (ON DELETE CASCADE) will automatically
 * delete the associated NotebookPermissions record.
 *
 * Future: This may be changed to soft delete (archive) by setting
 * status='archived' and archivedAt=now() instead of hard delete.
 *
 * @async
 * @param {string} notebookId - UUID of the notebook to delete
 * @param {string} userId - UUID of the user requesting deletion
 * @returns {Promise<boolean>} True if deleted, false if not found/unauthorized
 *
 * @example
 * const deleted = await deleteNotebook(notebookId, userId);
 * if (!deleted) {
 *   return res.status(404).json({ error: 'Notebook not found' });
 * }
 */
export const deleteNotebook = async (
  notebookId: string,
  userId: string
): Promise<boolean> => {
  try {
    // 1. Validate ownership first
    const notebook = await Notebook.findByPk(notebookId);

    // SECURITY: Return false for both "not found" and "unauthorized" cases
    if (!notebook || notebook.userId !== userId) {
      if (notebook) {
        logger.warn('Unauthorized notebook deletion attempt', {
          notebookId,
          userId,
          ownerId: notebook.userId,
        });
      }
      return false;
    }

    // 2. Perform hard delete (cascade will delete NotebookPermissions)
    await notebook.destroy();

    logger.info('Notebook deleted successfully', {
      notebookId,
      userId,
      title: notebook.title,
    });

    return true;
  } catch (error) {
    logger.error('Failed to delete notebook', { notebookId, userId, error });
    throw new AppError('Failed to delete notebook', 500);
  }
};

/**
 * Get all active notebooks for a user
 *
 * This function retrieves all notebooks owned by the specified user where
 * status='active'. Archived notebooks are not included. Results are ordered
 * by createdAt DESC (newest first).
 *
 * Note: Pagination will be added in TASK08.
 *
 * @async
 * @param {string} userId - UUID of the user whose notebooks to retrieve
 * @returns {Promise<Notebook[]>} Array of notebooks (empty if user has no notebooks)
 *
 * @example
 * const notebooks = await getUserNotebooks(userId);
 * console.log(`User has ${notebooks.length} active notebooks`);
 */
export const getUserNotebooks = async (userId: string): Promise<Notebook[]> => {
  try {
    // Fetch all active notebooks for user, ordered by creation date (newest first)
    const notebooks = await Notebook.findAll({
      where: {
        userId,
        status: 'active', // Only active notebooks
      },
      include: [
        { model: NotebookPermissions, as: 'permissions' },
      ],
      order: [['createdAt', 'DESC']], // Newest first
    });

    logger.debug('User notebooks retrieved', {
      userId,
      count: notebooks.length,
    });

    return notebooks;
  } catch (error) {
    logger.error('Failed to retrieve user notebooks', { userId, error });
    throw new AppError('Failed to retrieve notebooks', 500);
  }
};

/**
 * Response type for paginated notebook results
 *
 * @interface PaginatedNotebooksResponse
 */
export interface PaginatedNotebooksResponse {
  /** Array of notebooks for the current page */
  notebooks: Notebook[];
  /** Pagination metadata */
  pagination: PaginationMetadata;
}

/**
 * Get notebooks with pagination, filtering, and sorting
 *
 * This function retrieves a paginated list of notebooks for a user with support for
 * advanced filtering (type, status, search), sorting, and pagination. This is the
 * primary function for displaying notebook galleries with customizable views.
 *
 * Features:
 * - Pagination: Configurable page size (default 12 items per page)
 * - Type filtering: Filter by notebook type(s) - Voyage, Daily, Reportage (comma-separated)
 * - Status filtering: active (default), archived, or all
 * - Search: Case-insensitive partial matching in title field
 * - Sorting: Multiple fields with ASC/DESC order
 * - Associations: Includes NotebookPermissions in response
 *
 * Default behavior:
 * - Shows only active notebooks (archivedAt IS NULL) unless status='archived'
 * - Sorts by createdAt DESC (newest first)
 * - Returns first page (page 1) with 12 items
 *
 * Security:
 * - Always filters by userId to ensure users only see their own notebooks
 * - Uses queryBuilder utilities to prevent SQL injection
 *
 * Performance:
 * - Uses findAndCountAll for efficient pagination (single query with count)
 * - Leverages database indexes on userId, createdAt, type, title
 * - Returns empty array for no results (not an error)
 *
 * @async
 * @param {string} userId - UUID of the user whose notebooks to retrieve
 * @param {FilterParams} [filters={}] - Optional filter parameters (type, status, search)
 * @param {number} [page=1] - Page number (1-indexed, defaults to 1)
 * @param {number} [limit=12] - Items per page (defaults to 12, max 100)
 * @param {string} [sort='createdAt'] - Field to sort by (createdAt, title, pageCount, updatedAt, type)
 * @param {'ASC' | 'DESC'} [order='DESC'] - Sort direction (ASC or DESC)
 * @returns {Promise<PaginatedNotebooksResponse>} Paginated notebooks with metadata
 * @throws {AppError} 500 if database query fails
 *
 * @example
 * // Get first page of all active notebooks (default behavior)
 * const result = await getNotebooks(userId);
 * console.log(`Found ${result.pagination.total} notebooks`);
 * console.log(`Page ${result.pagination.currentPage} of ${result.pagination.totalPages}`);
 *
 * @example
 * // Filter by type and search
 * const result = await getNotebooks(
 *   userId,
 *   { type: 'Voyage,Daily', search: 'Paris' },
 *   1,
 *   12,
 *   'title',
 *   'ASC'
 * );
 *
 * @example
 * // Get archived notebooks only
 * const result = await getNotebooks(
 *   userId,
 *   { status: 'archived' },
 *   1,
 *   12
 * );
 */
export const getNotebooks = async (
  userId: string,
  filters: FilterParams = {},
  page: number = 1,
  limit: number = 12,
  sort: string = 'createdAt',
  order: 'ASC' | 'DESC' = 'DESC'
): Promise<PaginatedNotebooksResponse> => {
  try {
    // Build WHERE clause with filters (defaults to status='active' if not specified)
    const whereClause = buildWhereClause(filters, userId);

    // Build ORDER BY clause (validates field and direction)
    const orderClause = buildOrderClause(sort, order);

    // Build pagination parameters (offset and limit)
    const { offset, limit: pageSize } = buildPaginationParams(page, limit);

    // Execute query with count
    const { count, rows } = await Notebook.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: NotebookPermissions,
          as: 'permissions',
        },
      ],
      order: orderClause,
      limit: pageSize,
      offset,
    });

    // Build pagination metadata
    const pagination = buildPaginationMetadata(count, page, pageSize);

    logger.debug('Notebooks retrieved with pagination', {
      userId,
      filters,
      total: count,
      page,
      pageSize,
    });

    return {
      notebooks: rows,
      pagination,
    };
  } catch (error) {
    logger.error('Failed to retrieve notebooks with pagination', {
      userId,
      filters,
      page,
      limit,
      error,
    });
    throw new AppError('Failed to retrieve notebooks', 500);
  }
};

/**
 * Duplicate a notebook (create a copy)
 *
 * This function creates a copy of an existing notebook with a "(copie)" suffix in the title.
 * The copy is independent of the original and can be edited without affecting the source.
 *
 * What is copied:
 * - title (with "(copie)" suffix)
 * - type, format, orientation (immutable settings)
 * - description, dpi
 * - New notebook gets new UUID, timestamps, and default values
 *
 * What is NOT copied (defaults applied):
 * - Pages (pageCount = 0) - Pages will be copied in US03 when Page model exists
 * - coverImageUrl (null) - User can add new cover
 * - status ('active') - New copy is always active
 * - archivedAt (null) - Not archived
 * - NotebookPermissions (type='private') - Default privacy
 *
 * Transaction safety:
 * - Uses Sequelize transaction to ensure atomicity
 * - If notebook creation fails, permissions won't be created
 * - If permissions creation fails, notebook creation is rolled back
 * - No partial copies left in database
 *
 * Security:
 * - Validates ownership: source notebook must belong to userId
 * - Returns null for both "not found" and "unauthorized" to prevent information leakage
 *
 * @async
 * @param {string} sourceId - UUID of the notebook to duplicate
 * @param {string} userId - UUID of the user requesting duplication (must be owner)
 * @returns {Promise<Notebook | null>} Created notebook copy, or null if not found/unauthorized
 * @throws {AppError} 500 if duplication fails
 *
 * @example
 * const copy = await duplicateNotebook(sourceNotebookId, userId);
 * if (!copy) {
 *   return res.status(404).json({ error: 'Notebook not found' });
 * }
 * console.log(`Created copy: ${copy.title}`); // "Original Title (copie)"
 *
 * @example
 * // Create multiple copies
 * const copy1 = await duplicateNotebook(sourceId, userId);
 * const copy2 = await duplicateNotebook(sourceId, userId);
 * // Results in: "Title (copie)", "Title (copie)" (both independent)
 */
export const duplicateNotebook = async (
  sourceId: string,
  userId: string
): Promise<Notebook | null> => {
  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch source notebook and validate ownership
    const sourceNotebook = await Notebook.findByPk(sourceId);

    // SECURITY: Return null for both "not found" and "unauthorized" cases
    if (!sourceNotebook || sourceNotebook.userId !== userId) {
      await transaction.rollback();
      if (sourceNotebook) {
        logger.warn('Unauthorized notebook duplication attempt', {
          sourceId,
          userId,
          ownerId: sourceNotebook.userId,
        });
      }
      return null;
    }

    // 2. Create new notebook with copied attributes
    const newNotebook = await Notebook.create(
      {
        userId,
        title: `${sourceNotebook.title} (copie)`,
        description: sourceNotebook.description,
        type: sourceNotebook.type,
        format: sourceNotebook.format,
        orientation: sourceNotebook.orientation,
        dpi: sourceNotebook.dpi,
        pageCount: 0, // Pages not copied in US02 (deferred to US03)
        coverImageUrl: undefined as any, // Cover not copied (TypeScript workaround)
        status: 'active',
        archivedAt: undefined as any, // Not archived (TypeScript workaround)
      },
      { transaction }
    );

    // 3. Create default permissions for new notebook
    await NotebookPermissions.create(
      {
        notebookId: newNotebook.id,
        type: 'private',
      },
      { transaction }
    );

    // 4. Commit transaction
    await transaction.commit();

    logger.info('Notebook duplicated successfully', {
      sourceId,
      newNotebookId: newNotebook.id,
      userId,
      title: newNotebook.title,
    });

    // 5. Return notebook with associations
    const notebookWithAssociations = await Notebook.findByPk(newNotebook.id, {
      include: [
        { model: NotebookPermissions, as: 'permissions' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    return notebookWithAssociations;
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to duplicate notebook', { sourceId, userId, error });
    throw new AppError('Failed to duplicate notebook', 500);
  }
};

/**
 * Archive a notebook
 *
 * This function marks a notebook as archived by setting the archivedAt timestamp
 * and changing the status to 'archived'. Archived notebooks are excluded from
 * the default getNotebooks() query (which filters for status='active').
 *
 * Archive behavior:
 * - Sets archivedAt to current timestamp (Date.now())
 * - Sets status to 'archived'
 * - Notebook remains in database (not deleted)
 * - Pages are implicitly archived (still associated with notebook)
 * - Can be restored with restoreNotebook()
 * - After 30 days in archive, may be permanently deleted (cleanup job in later phase)
 *
 * Security:
 * - Validates ownership before archiving
 * - Returns null for both "not found" and "unauthorized" to prevent information leakage
 *
 * Use cases:
 * - User wants to hide old notebooks without deleting
 * - Temporary removal from active gallery
 * - Safety net before permanent deletion
 *
 * @async
 * @param {string} notebookId - UUID of the notebook to archive
 * @param {string} userId - UUID of the user requesting archival (must be owner)
 * @returns {Promise<Notebook | null>} Updated notebook, or null if not found/unauthorized
 * @throws {AppError} 500 if archive operation fails
 *
 * @example
 * const archived = await archiveNotebook(notebookId, userId);
 * if (!archived) {
 *   return res.status(404).json({ error: 'Notebook not found' });
 * }
 * console.log(`Archived at: ${archived.archivedAt}`);
 * console.log(`Status: ${archived.status}`); // "archived"
 *
 * @example
 * // Archive and notify user
 * const archived = await archiveNotebook(notebookId, userId);
 * if (archived) {
 *   console.log('Notebook moved to archive. Can be restored within 30 days.');
 * }
 */
export const archiveNotebook = async (
  notebookId: string,
  userId: string
): Promise<Notebook | null> => {
  try {
    // 1. Validate ownership first
    const notebook = await Notebook.findByPk(notebookId);

    // SECURITY: Return null for both "not found" and "unauthorized" cases
    if (!notebook || notebook.userId !== userId) {
      if (notebook) {
        logger.warn('Unauthorized notebook archive attempt', {
          notebookId,
          userId,
          ownerId: notebook.userId,
        });
      }
      return null;
    }

    // 2. Update notebook to archived state
    await notebook.update({
      archivedAt: new Date(),
      status: 'archived',
    });

    logger.info('Notebook archived successfully', {
      notebookId,
      userId,
      title: notebook.title,
      archivedAt: notebook.archivedAt,
    });

    // 3. Return updated notebook with associations
    const updatedNotebook = await Notebook.findByPk(notebook.id, {
      include: [
        { model: NotebookPermissions, as: 'permissions' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    return updatedNotebook;
  } catch (error) {
    logger.error('Failed to archive notebook', { notebookId, userId, error });
    throw new AppError('Failed to archive notebook', 500);
  }
};

/**
 * Restore an archived notebook
 *
 * This function restores a previously archived notebook by clearing the archivedAt
 * timestamp and setting status back to 'active'. The notebook will reappear in
 * the default getNotebooks() query.
 *
 * Restore behavior:
 * - Sets archivedAt to null
 * - Sets status to 'active'
 * - Notebook becomes visible in default gallery
 * - All pages remain intact (were never deleted)
 * - Can be re-archived if needed
 *
 * Security:
 * - Validates ownership before restoring
 * - Returns null for both "not found" and "unauthorized" to prevent information leakage
 *
 * Use cases:
 * - User changed mind about archiving
 * - Restore before 30-day deletion deadline
 * - Reactivate old notebooks for editing
 *
 * @async
 * @param {string} notebookId - UUID of the notebook to restore
 * @param {string} userId - UUID of the user requesting restoration (must be owner)
 * @returns {Promise<Notebook | null>} Updated notebook, or null if not found/unauthorized
 * @throws {AppError} 500 if restore operation fails
 *
 * @example
 * const restored = await restoreNotebook(notebookId, userId);
 * if (!restored) {
 *   return res.status(404).json({ error: 'Notebook not found' });
 * }
 * console.log(`Status: ${restored.status}`); // "active"
 * console.log(`archivedAt: ${restored.archivedAt}`); // null
 *
 * @example
 * // Restore and notify user
 * const restored = await restoreNotebook(notebookId, userId);
 * if (restored) {
 *   console.log('Notebook restored to active notebooks.');
 * }
 */
export const restoreNotebook = async (
  notebookId: string,
  userId: string
): Promise<Notebook | null> => {
  try {
    // 1. Validate ownership first
    const notebook = await Notebook.findByPk(notebookId);

    // SECURITY: Return null for both "not found" and "unauthorized" cases
    if (!notebook || notebook.userId !== userId) {
      if (notebook) {
        logger.warn('Unauthorized notebook restore attempt', {
          notebookId,
          userId,
          ownerId: notebook.userId,
        });
      }
      return null;
    }

    // 2. Update notebook to active state
    // TypeScript workaround: Cast to any to set null explicitly
    await notebook.update({
      archivedAt: null as any,
      status: 'active',
    });

    logger.info('Notebook restored successfully', {
      notebookId,
      userId,
      title: notebook.title,
    });

    // 3. Return updated notebook with associations
    const updatedNotebook = await Notebook.findByPk(notebook.id, {
      include: [
        { model: NotebookPermissions, as: 'permissions' },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    return updatedNotebook;
  } catch (error) {
    logger.error('Failed to restore notebook', { notebookId, userId, error });
    throw new AppError('Failed to restore notebook', 500);
  }
};

/**
 * Get archived notebooks with pagination
 *
 * This function retrieves only archived notebooks (where archivedAt IS NOT NULL)
 * for a user with pagination support. This is used for the archive section view
 * where users can restore or permanently delete archived notebooks.
 *
 * Features:
 * - Returns only archived notebooks (status='archived', archivedAt IS NOT NULL)
 * - Pagination support (default 12 items per page)
 * - Sorted by archivedAt DESC (most recently archived first)
 * - Includes NotebookPermissions in response
 * - Returns pagination metadata (for UI controls)
 *
 * Use cases:
 * - Archive section view (TASK11 on frontend)
 * - Show notebooks pending deletion (30-day countdown)
 * - Allow user to restore or permanently delete
 *
 * Security:
 * - Always filters by userId to ensure users only see their own notebooks
 * - Returns empty array if user has no archived notebooks (not an error)
 *
 * @async
 * @param {string} userId - UUID of the user whose archived notebooks to retrieve
 * @param {number} [page=1] - Page number (1-indexed, defaults to 1)
 * @param {number} [limit=12] - Items per page (defaults to 12, max 100)
 * @returns {Promise<PaginatedNotebooksResponse>} Paginated archived notebooks with metadata
 * @throws {AppError} 500 if database query fails
 *
 * @example
 * // Get first page of archived notebooks
 * const result = await getArchivedNotebooks(userId);
 * console.log(`Found ${result.pagination.total} archived notebooks`);
 * result.notebooks.forEach(notebook => {
 *   const daysInArchive = Math.floor((Date.now() - notebook.archivedAt.getTime()) / (1000 * 60 * 60 * 24));
 *   console.log(`${notebook.title}: ${30 - daysInArchive} days until deletion`);
 * });
 *
 * @example
 * // Paginate through archived notebooks
 * const page1 = await getArchivedNotebooks(userId, 1, 12);
 * const page2 = await getArchivedNotebooks(userId, 2, 12);
 */
export const getArchivedNotebooks = async (
  userId: string,
  page: number = 1,
  limit: number = 12
): Promise<PaginatedNotebooksResponse> => {
  try {
    // Build pagination parameters
    const { offset, limit: pageSize } = buildPaginationParams(page, limit);

    // Query for archived notebooks only
    const { count, rows } = await Notebook.findAndCountAll({
      where: {
        userId,
        archivedAt: { [Op.ne]: null } as any, // archivedAt IS NOT NULL (TypeScript workaround)
      },
      include: [
        {
          model: NotebookPermissions,
          as: 'permissions',
        },
      ],
      order: [['archivedAt', 'DESC']], // Most recently archived first
      limit: pageSize,
      offset,
    });

    // Build pagination metadata
    const pagination = buildPaginationMetadata(count, page, pageSize);

    logger.debug('Archived notebooks retrieved', {
      userId,
      total: count,
      page,
      pageSize,
    });

    return {
      notebooks: rows,
      pagination,
    };
  } catch (error) {
    logger.error('Failed to retrieve archived notebooks', {
      userId,
      page,
      limit,
      error,
    });
    throw new AppError('Failed to retrieve archived notebooks', 500);
  }
};

export default {
  createNotebook,
  getNotebookById,
  updateNotebook,
  deleteNotebook,
  getUserNotebooks,
  getNotebooks,
  duplicateNotebook,
  archiveNotebook,
  restoreNotebook,
  getArchivedNotebooks,
};
