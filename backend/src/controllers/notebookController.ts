/**
 * Notebook Controller
 *
 * This controller handles all HTTP requests related to notebook management:
 * - Create notebook (POST /api/notebooks)
 * - Get notebook by ID (GET /api/notebooks/:id)
 * - Update notebook (PUT /api/notebooks/:id)
 * - Delete notebook (DELETE /api/notebooks/:id)
 *
 * All endpoints in this controller require authentication (JWT middleware).
 * Users can only access and modify their own notebooks.
 *
 * Security:
 * - All operations validate ownership (userId must match notebook.userId)
 * - Returns 404 for both "not found" and "unauthorized" to prevent information leakage
 * - Immutable fields (type, format, orientation) cannot be changed after creation
 *
 * @module controllers/notebookController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as notebookService from '../services/notebookService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Create a new notebook
 *
 * POST /api/notebooks
 * Requires: JWT authentication
 * Body: CreateNotebookDto (title, type, format, orientation, description?, dpi?, coverImageUrl?)
 *
 * Creates a new notebook owned by the authenticated user with default permissions.
 * Automatically sets pageCount=0, status='active', and creates NotebookPermissions
 * record with type='private'.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Request body
 * {
 *   "title": "My Travel Journal",
 *   "description": "Summer 2025 Europe trip",
 *   "type": "Voyage",
 *   "format": "A4",
 *   "orientation": "portrait",
 *   "dpi": 300
 * }
 *
 * // Success response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "title": "My Travel Journal",
 *     "description": "Summer 2025 Europe trip",
 *     "type": "Voyage",
 *     "format": "A4",
 *     "orientation": "portrait",
 *     "dpi": 300,
 *     "pageCount": 0,
 *     "status": "active",
 *     "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" },
 *     "owner": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com" }
 *   },
 *   "message": "Notebook created successfully"
 * }
 */
export const handleCreateNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const data: notebookService.CreateNotebookDto = req.body;

    // Call service layer to create notebook
    const notebook = await notebookService.createNotebook(userId, data);

    logger.info('Notebook created via controller', {
      notebookId: notebook.id,
      userId,
      title: notebook.title,
    });

    res.status(201).json({
      success: true,
      data: notebook,
      message: 'Notebook created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a notebook by ID
 *
 * GET /api/notebooks/:id
 * Requires: JWT authentication
 * Params: id (notebook UUID)
 *
 * Retrieves a notebook by ID with ownership validation.
 * Returns 404 if notebook not found or user is not the owner (security practice).
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "title": "My Travel Journal",
 *     "description": "Summer 2025 Europe trip",
 *     "type": "Voyage",
 *     "format": "A4",
 *     "orientation": "portrait",
 *     "dpi": 300,
 *     "pageCount": 5,
 *     "status": "active",
 *     "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" },
 *     "owner": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com" },
 *     "createdAt": "2025-01-27T10:00:00Z",
 *     "updatedAt": "2025-01-27T15:30:00Z"
 *   }
 * }
 *
 * // Error response (404 Not Found)
 * {
 *   "status": "fail",
 *   "statusCode": 404,
 *   "message": "Notebook not found"
 * }
 */
export const handleGetNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const notebookId = req.params['id'];

    if (!notebookId) {
      throw new AppError('Notebook ID is required', 400);
    }

    // Call service layer to get notebook
    const notebook = await notebookService.getNotebookById(notebookId, userId);

    // SECURITY: Return 404 for both "not found" and "unauthorized" cases
    if (!notebook) {
      throw new AppError('Notebook not found', 404);
    }

    logger.debug('Notebook retrieved via controller', {
      notebookId: notebook.id,
      userId,
    });

    res.status(200).json({
      success: true,
      data: notebook,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a notebook
 *
 * PUT /api/notebooks/:id
 * Requires: JWT authentication
 * Params: id (notebook UUID)
 * Body: UpdateNotebookDto (title?, description?, coverImageUrl?, dpi?)
 *
 * Updates a notebook's mutable fields only. The following fields are IMMUTABLE
 * and cannot be changed after creation:
 * - type (Voyage/Daily/Reportage)
 * - format (A4/A5)
 * - orientation (portrait/landscape)
 * - pageCount (managed by system)
 * - status (managed by system)
 *
 * Returns 404 if notebook not found or user is not the owner.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Request body
 * {
 *   "title": "Updated Travel Journal",
 *   "description": "Summer and Fall 2025 Europe trip",
 *   "dpi": 300
 * }
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "title": "Updated Travel Journal",
 *     "description": "Summer and Fall 2025 Europe trip",
 *     "type": "Voyage",
 *     "format": "A4",
 *     "orientation": "portrait",
 *     "dpi": 300,
 *     "pageCount": 5,
 *     "status": "active",
 *     "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" },
 *     "owner": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com" },
 *     "updatedAt": "2025-01-27T16:00:00Z"
 *   },
 *   "message": "Notebook updated successfully"
 * }
 */
export const handleUpdateNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const notebookId = req.params['id'];

    if (!notebookId) {
      throw new AppError('Notebook ID is required', 400);
    }

    const data: notebookService.UpdateNotebookDto = req.body;

    // Call service layer to update notebook
    const updatedNotebook = await notebookService.updateNotebook(notebookId, userId, data);

    // SECURITY: Return 404 for both "not found" and "unauthorized" cases
    if (!updatedNotebook) {
      throw new AppError('Notebook not found', 404);
    }

    logger.info('Notebook updated via controller', {
      notebookId: updatedNotebook.id,
      userId,
      updatedFields: Object.keys(data),
    });

    res.status(200).json({
      success: true,
      data: updatedNotebook,
      message: 'Notebook updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notebook
 *
 * DELETE /api/notebooks/:id
 * Requires: JWT authentication
 * Params: id (notebook UUID)
 *
 * Permanently deletes a notebook from the database (hard delete).
 * The database foreign key constraint (ON DELETE CASCADE) automatically
 * deletes the associated NotebookPermissions record.
 *
 * Returns 404 if notebook not found or user is not the owner.
 * Returns 204 No Content on successful deletion (no response body).
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Success response (204 No Content)
 * // No response body
 *
 * // Error response (404 Not Found)
 * {
 *   "status": "fail",
 *   "statusCode": 404,
 *   "message": "Notebook not found"
 * }
 */
export const handleDeleteNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const notebookId = req.params['id'];

    if (!notebookId) {
      throw new AppError('Notebook ID is required', 400);
    }

    // Call service layer to delete notebook
    const deleted = await notebookService.deleteNotebook(notebookId, userId);

    // SECURITY: Return 404 for both "not found" and "unauthorized" cases
    if (!deleted) {
      throw new AppError('Notebook not found', 404);
    }

    logger.info('Notebook deleted via controller', {
      notebookId,
      userId,
    });

    // 204 No Content - successful deletion with no response body
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Get notebooks with pagination and filtering
 *
 * GET /api/notebooks
 * Requires: JWT authentication
 * Query params: page, limit, sort, order, type, status, search
 *
 * Retrieves a paginated list of notebooks for the authenticated user with
 * support for filtering (type, status, search), sorting, and pagination.
 * This is the primary endpoint for displaying notebook galleries.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user and query params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Request URL
 * GET /api/notebooks?page=1&limit=12&sort=createdAt&order=DESC&type=Voyage,Daily&search=Paris
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "notebooks": [
 *       {
 *         "id": "uuid",
 *         "userId": "uuid",
 *         "title": "My Travel Journal",
 *         "description": "Summer 2025 Europe trip",
 *         "type": "Voyage",
 *         "format": "A4",
 *         "orientation": "portrait",
 *         "dpi": 300,
 *         "pageCount": 5,
 *         "status": "active",
 *         "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" },
 *         "createdAt": "2025-01-27T10:00:00Z",
 *         "updatedAt": "2025-01-27T15:30:00Z"
 *       }
 *     ],
 *     "pagination": {
 *       "currentPage": 1,
 *       "limit": 12,
 *       "total": 25,
 *       "totalPages": 3
 *     }
 *   }
 * }
 */
export const handleGetNotebooks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Parse query parameters with defaults
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = Math.min(parseInt(req.query['limit'] as string) || 12, 100); // Max 100 items
    const sort = (req.query['sort'] as string) || 'createdAt';
    const order = ((req.query['order'] as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    const type = req.query['type'] as string | undefined;
    const status = req.query['status'] as string | undefined;
    const search = req.query['search'] as string | undefined;

    // Build filters object
    const filters: Record<string, string> = {};
    if (type) {
      filters['type'] = type;
    }
    if (status) {
      filters['status'] = status;
    }
    if (search) {
      filters['search'] = search;
    }

    // Call service layer
    const result = await notebookService.getNotebooks(userId, filters, page, limit, sort, order);

    logger.debug('Notebooks list retrieved via controller', {
      userId,
      page,
      limit,
      total: result.pagination.total,
      filters,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate a notebook (create a copy)
 *
 * POST /api/notebooks/:id/duplicate
 * Requires: JWT authentication
 * Params: id (notebook UUID)
 *
 * Creates an independent copy of an existing notebook with a "(copie)" suffix.
 * The copy includes all metadata but resets pageCount to 0. Pages will be
 * copied in US03 when the Page model exists.
 *
 * Returns 404 if notebook not found or user is not the owner.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Success response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "new-uuid",
 *     "userId": "uuid",
 *     "title": "My Travel Journal (copie)",
 *     "description": "Summer 2025 Europe trip",
 *     "type": "Voyage",
 *     "format": "A4",
 *     "orientation": "portrait",
 *     "dpi": 300,
 *     "pageCount": 0,
 *     "status": "active",
 *     "permissions": { "id": "uuid", "notebookId": "new-uuid", "type": "private" },
 *     "owner": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com" }
 *   },
 *   "message": "Notebook duplicated successfully"
 * }
 *
 * // Error response (404 Not Found)
 * {
 *   "status": "fail",
 *   "statusCode": 404,
 *   "message": "Notebook not found"
 * }
 */
export const handleDuplicateNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const notebookId = req.params['id'];

    if (!notebookId) {
      throw new AppError('Notebook ID is required', 400);
    }

    // Call service layer to duplicate notebook
    const duplicatedNotebook = await notebookService.duplicateNotebook(notebookId, userId);

    // SECURITY: Return 404 for both "not found" and "unauthorized" cases
    if (!duplicatedNotebook) {
      throw new AppError('Notebook not found', 404);
    }

    logger.info('Notebook duplicated via controller', {
      sourceId: notebookId,
      newNotebookId: duplicatedNotebook.id,
      userId,
    });

    res.status(201).json({
      success: true,
      data: duplicatedNotebook,
      message: 'Notebook duplicated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive a notebook
 *
 * PUT /api/notebooks/:id/archive
 * Requires: JWT authentication
 * Params: id (notebook UUID)
 *
 * Archives a notebook by setting archivedAt timestamp and status='archived'.
 * Archived notebooks are excluded from the default getNotebooks() query and
 * can be restored with restoreNotebook().
 *
 * Returns 404 if notebook not found or user is not the owner.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "title": "My Travel Journal",
 *     "status": "archived",
 *     "archivedAt": "2025-01-27T16:00:00Z",
 *     "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" },
 *     "owner": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com" }
 *   },
 *   "message": "Notebook archived successfully"
 * }
 *
 * // Error response (404 Not Found)
 * {
 *   "status": "fail",
 *   "statusCode": 404,
 *   "message": "Notebook not found"
 * }
 */
export const handleArchiveNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const notebookId = req.params['id'];

    if (!notebookId) {
      throw new AppError('Notebook ID is required', 400);
    }

    // Call service layer to archive notebook
    const archivedNotebook = await notebookService.archiveNotebook(notebookId, userId);

    // SECURITY: Return 404 for both "not found" and "unauthorized" cases
    if (!archivedNotebook) {
      throw new AppError('Notebook not found', 404);
    }

    logger.info('Notebook archived via controller', {
      notebookId: archivedNotebook.id,
      userId,
      archivedAt: archivedNotebook.archivedAt,
    });

    res.status(200).json({
      success: true,
      data: archivedNotebook,
      message: 'Notebook archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore an archived notebook
 *
 * PUT /api/notebooks/:id/restore
 * Requires: JWT authentication
 * Params: id (notebook UUID)
 *
 * Restores a previously archived notebook by clearing archivedAt timestamp
 * and setting status='active'. The notebook will reappear in the default
 * getNotebooks() query.
 *
 * Returns 404 if notebook not found or user is not the owner.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "title": "My Travel Journal",
 *     "status": "active",
 *     "archivedAt": null,
 *     "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" },
 *     "owner": { "id": "uuid", "firstName": "John", "lastName": "Doe", "email": "john@example.com" }
 *   },
 *   "message": "Notebook restored successfully"
 * }
 *
 * // Error response (404 Not Found)
 * {
 *   "status": "fail",
 *   "statusCode": 404,
 *   "message": "Notebook not found"
 * }
 */
export const handleRestoreNotebook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const notebookId = req.params['id'];

    if (!notebookId) {
      throw new AppError('Notebook ID is required', 400);
    }

    // Call service layer to restore notebook
    const restoredNotebook = await notebookService.restoreNotebook(notebookId, userId);

    // SECURITY: Return 404 for both "not found" and "unauthorized" cases
    if (!restoredNotebook) {
      throw new AppError('Notebook not found', 404);
    }

    logger.info('Notebook restored via controller', {
      notebookId: restoredNotebook.id,
      userId,
    });

    res.status(200).json({
      success: true,
      data: restoredNotebook,
      message: 'Notebook restored successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get archived notebooks with pagination
 *
 * GET /api/notebooks/archived
 * Requires: JWT authentication
 * Query params: page, limit
 *
 * Retrieves a paginated list of archived notebooks for the authenticated user.
 * This endpoint is used for the archive section view where users can restore
 * or permanently delete archived notebooks.
 *
 * @async
 * @param {AuthRequest} req - Express request with authenticated user and query params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>}
 *
 * @example
 * // Request URL
 * GET /api/notebooks/archived?page=1&limit=12
 *
 * // Success response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "notebooks": [
 *       {
 *         "id": "uuid",
 *         "userId": "uuid",
 *         "title": "Old Travel Journal",
 *         "status": "archived",
 *         "archivedAt": "2025-01-20T10:00:00Z",
 *         "permissions": { "id": "uuid", "notebookId": "uuid", "type": "private" }
 *       }
 *     ],
 *     "pagination": {
 *       "currentPage": 1,
 *       "limit": 12,
 *       "total": 5,
 *       "totalPages": 1
 *     }
 *   }
 * }
 */
export const handleGetArchivedNotebooks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Parse query parameters with defaults
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = Math.min(parseInt(req.query['limit'] as string) || 12, 100); // Max 100 items

    // Call service layer
    const result = await notebookService.getArchivedNotebooks(userId, page, limit);

    logger.debug('Archived notebooks retrieved via controller', {
      userId,
      page,
      limit,
      total: result.pagination.total,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleCreateNotebook,
  handleGetNotebook,
  handleUpdateNotebook,
  handleDeleteNotebook,
  handleGetNotebooks,
  handleDuplicateNotebook,
  handleArchiveNotebook,
  handleRestoreNotebook,
  handleGetArchivedNotebooks,
};
