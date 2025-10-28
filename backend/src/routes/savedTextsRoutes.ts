/**
 * Saved Texts Routes
 *
 * This module defines all routes for managing user's saved text library.
 * All routes require authentication via JWT token in httpOnly cookies.
 *
 * Routes:
 * - GET /api/users/saved-texts - Get all saved texts
 * - POST /api/users/saved-texts - Create new saved text
 * - PUT /api/users/saved-texts/:id - Update saved text
 * - DELETE /api/users/saved-texts/:id - Delete saved text
 *
 * @module routes/savedTextsRoutes
 */

import express, { Router } from 'express';
import { authenticateUser } from '../middleware/authMiddleware';
import { validate } from '../middleware/validation';
import { createSavedTextSchema, updateSavedTextSchema } from '../middleware/validation';
import * as savedTextsController from '../controllers/savedTextsController';

const router: Router = express.Router();

/**
 * GET /api/users/saved-texts
 * Get all saved texts for authenticated user
 *
 * @requires Authentication
 * @returns {Object} Array of saved texts
 */
router.get('/', authenticateUser, savedTextsController.handleGetSavedTexts);

/**
 * POST /api/users/saved-texts
 * Create and save new text to user's library
 *
 * @requires Authentication
 * @requires Body validation against createSavedTextSchema
 * @returns {Object} Created saved text with generated ID and timestamps
 */
router.post('/', authenticateUser, validate(createSavedTextSchema, 'body'), savedTextsController.handleAddSavedText);

/**
 * PUT /api/users/saved-texts/:id
 * Update existing saved text
 *
 * @requires Authentication
 * @requires URL param: id (UUID of saved text)
 * @requires Body validation against updateSavedTextSchema
 * @returns {Object} Updated saved text
 */
router.put('/:id', authenticateUser, validate(updateSavedTextSchema, 'body'), savedTextsController.handleUpdateSavedText);

/**
 * DELETE /api/users/saved-texts/:id
 * Delete saved text from user's library
 *
 * @requires Authentication
 * @requires URL param: id (UUID of saved text)
 * @returns {Object} Success message
 */
router.delete('/:id', authenticateUser, savedTextsController.handleDeleteSavedText);

export default router;
