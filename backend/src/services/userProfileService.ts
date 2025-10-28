/**
 * User Profile Service
 *
 * This service contains business logic for managing user profile information,
 * including the user's personal library of saved text elements.
 *
 * Key features:
 * - Get all saved texts for a user
 * - Add new saved text to library with validation
 * - Update existing saved text with validation
 * - Delete saved text from library
 * - Full CRUD operations with transaction support
 *
 * Security:
 * - All operations validate user ownership
 * - Transactions ensure data consistency
 * - Input validation prevents malformed data
 * - Error messages don't expose sensitive data
 *
 * @module services/userProfileService
 */

import { v4 as uuidv4 } from 'uuid';
import { User, SavedText } from '../models/User';
import { sequelize } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Validate a SavedText object
 *
 * Ensures all required fields are present and valid according to business rules.
 *
 * @private
 * @param {Partial<Omit<SavedText, 'id' | 'createdAt' | 'updatedAt'>>} textData - Data to validate
 * @throws {AppError} If validation fails
 */
const validateSavedText = (
  textData: Partial<Omit<SavedText, 'id' | 'createdAt' | 'updatedAt'>>
): void => {
  // Validate label
  if (!textData.label || typeof textData.label !== 'string') {
    throw new AppError('Label is required', 400);
  }
  if (textData.label.length < 1 || textData.label.length > 100) {
    throw new AppError('Label must be 1-100 characters', 400);
  }

  // Validate content
  if (!textData.content || typeof textData.content !== 'string') {
    throw new AppError('Content is required', 400);
  }
  if (textData.content.length < 1 || textData.content.length > 1000) {
    throw new AppError('Content must be 1-1000 characters', 400);
  }

  // Validate fontSize
  if (textData.fontSize === undefined || typeof textData.fontSize !== 'number') {
    throw new AppError('Font size is required', 400);
  }
  if (textData.fontSize < 8 || textData.fontSize > 200) {
    throw new AppError('Font size must be between 8 and 200 pixels', 400);
  }

  // Validate fontFamily
  if (!textData.fontFamily || typeof textData.fontFamily !== 'string') {
    throw new AppError('Font family is required', 400);
  }

  // Validate fontWeight
  if (!textData.fontWeight || typeof textData.fontWeight !== 'string') {
    throw new AppError('Font weight is required', 400);
  }
  const validFontWeights = ['normal', 'bold', '600', '700'];
  if (!validFontWeights.includes(textData.fontWeight)) {
    throw new AppError(
      `Invalid font weight. Must be one of: ${validFontWeights.join(', ')}`,
      400
    );
  }

  // Validate fontStyle
  if (!textData.fontStyle || typeof textData.fontStyle !== 'string') {
    throw new AppError('Font style is required', 400);
  }
  const validFontStyles = ['normal', 'italic'];
  if (!validFontStyles.includes(textData.fontStyle)) {
    throw new AppError(`Invalid font style. Must be one of: ${validFontStyles.join(', ')}`, 400);
  }

  // Validate textDecoration
  if (!textData.textDecoration || typeof textData.textDecoration !== 'string') {
    throw new AppError('Text decoration is required', 400);
  }
  const validDecorations = ['none', 'underline', 'line-through'];
  if (!validDecorations.includes(textData.textDecoration)) {
    throw new AppError(
      `Invalid text decoration. Must be one of: ${validDecorations.join(', ')}`,
      400
    );
  }

  // Validate color (HEX format)
  if (!textData.color || typeof textData.color !== 'string') {
    throw new AppError('Color is required', 400);
  }
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexColorRegex.test(textData.color)) {
    throw new AppError('Invalid color format. Use HEX (e.g., #000000)', 400);
  }

  // Validate textAlign
  if (!textData.textAlign || typeof textData.textAlign !== 'string') {
    throw new AppError('Text alignment is required', 400);
  }
  const validAlignments = ['left', 'center', 'right'];
  if (!validAlignments.includes(textData.textAlign)) {
    throw new AppError(`Invalid text alignment. Must be one of: ${validAlignments.join(', ')}`, 400);
  }

  // Validate lineHeight
  if (textData.lineHeight === undefined || typeof textData.lineHeight !== 'number') {
    throw new AppError('Line height is required', 400);
  }
  if (textData.lineHeight < 0.8 || textData.lineHeight > 3) {
    throw new AppError('Line height must be between 0.8 and 3.0', 400);
  }

  // type is optional, no validation needed
};

/**
 * Get all saved texts for a user
 *
 * Fetches the user's personal library of saved text elements, ordered by creation date.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @returns {Promise<SavedText[]>} Array of saved texts (empty if none), ordered newest first
 * @throws {AppError} 404 if user not found, 500 for database errors
 *
 * @example
 * const savedTexts = await getSavedTexts('user-uuid');
 * console.log(savedTexts); // [{ id: '...', label: 'Chapter Title', ... }, ...]
 */
export const getSavedTexts = async (userId: string): Promise<SavedText[]> => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn('getSavedTexts: User not found', { userId });
      throw new AppError('User not found', 404);
    }

    // Ensure savedTexts is an array (handle legacy data)
    const savedTexts = Array.isArray(user.savedTexts) ? user.savedTexts : [];

    // Sort by createdAt descending (newest first)
    return savedTexts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('getSavedTexts: Database error', { error: error instanceof Error ? error.message : String(error), userId });
    throw new AppError('Failed to fetch saved texts', 500);
  }
};

/**
 * Add a new saved text to user's library
 *
 * Creates a new text element and saves it to the user's library. Auto-generates ID and timestamps.
 * Validates all input data before saving.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @param {Omit<SavedText, 'id' | 'createdAt' | 'updatedAt'>} textData - New text data (no id or timestamps)
 * @returns {Promise<SavedText>} The newly created saved text (with generated id and timestamps)
 * @throws {AppError} 400 for validation errors, 404 for user not found, 500 for database errors
 *
 * @example
 * const newText = await addSavedText('user-uuid', {
 *   label: 'Chapter Title',
 *   content: 'My Novel Chapter',
 *   fontSize: 32,
 *   fontFamily: 'Georgia',
 *   fontWeight: 'bold',
 *   fontStyle: 'normal',
 *   textDecoration: 'none',
 *   color: '#000000',
 *   textAlign: 'center',
 *   lineHeight: 1.5,
 *   type: 'title'
 * });
 * console.log(newText.id); // 'uuid-generated'
 */
export const addSavedText = async (
  userId: string,
  textData: Omit<SavedText, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SavedText> => {
  const transaction = await sequelize.transaction();

  try {
    // Validate input data
    validateSavedText(textData);

    // Find user
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      logger.warn('addSavedText: User not found', { userId });
      throw new AppError('User not found', 404);
    }

    // Create new SavedText with generated id and timestamps
    const now = new Date();
    const newText: SavedText = {
      id: uuidv4(),
      label: textData.label,
      content: textData.content,
      fontSize: textData.fontSize,
      fontFamily: textData.fontFamily,
      fontWeight: textData.fontWeight,
      fontStyle: textData.fontStyle,
      textDecoration: textData.textDecoration,
      color: textData.color,
      textAlign: textData.textAlign,
      lineHeight: textData.lineHeight,
      type: textData.type,
      createdAt: now,
      updatedAt: now,
    };

    // Add to user's savedTexts array
    const currentSavedTexts = Array.isArray(user.savedTexts) ? user.savedTexts : [];
    currentSavedTexts.push(newText);

    // Update user
    await user.update({ savedTexts: currentSavedTexts }, { transaction });

    await transaction.commit();

    logger.info('addSavedText: Text saved successfully', {
      userId,
      textId: newText.id,
      label: newText.label,
    });

    return newText;
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('addSavedText: Error saving text', { error: error instanceof Error ? error.message : String(error), userId });
    throw new AppError('Failed to save text', 500);
  }
};

/**
 * Update an existing saved text
 *
 * Updates fields in a saved text element. Preserves createdAt, updates updatedAt.
 * Only provided fields are updated; omitted fields are unchanged.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @param {string} textId - ID of the saved text to update
 * @param {Partial<Omit<SavedText, 'id' | 'createdAt' | 'updatedAt'>>} updates - Fields to update (all optional)
 * @returns {Promise<SavedText>} The updated saved text with new updatedAt timestamp
 * @throws {AppError} 400 for validation errors, 404 for user/textId not found, 500 for database errors
 *
 * @example
 * const updated = await updateSavedText('user-uuid', 'text-uuid', {
 *   fontSize: 36,
 *   color: '#333333'
 * });
 * console.log(updated.fontSize); // 36
 * console.log(updated.createdAt); // unchanged
 */
export const updateSavedText = async (
  userId: string,
  textId: string,
  updates: Partial<Omit<SavedText, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SavedText> => {
  const transaction = await sequelize.transaction();

  try {
    // Validate update data if any validation fields are present
    if (Object.keys(updates).length > 0) {
      validateSavedText(updates);
    }

    // Find user
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      logger.warn('updateSavedText: User not found', { userId });
      throw new AppError('User not found', 404);
    }

    // Get user's saved texts
    const savedTexts = Array.isArray(user.savedTexts) ? user.savedTexts : [];

    // Find the text to update
    const textIndex = savedTexts.findIndex((text) => text.id === textId);
    if (textIndex === -1) {
      logger.warn('updateSavedText: Text not found', { userId, textId });
      throw new AppError('Saved text not found', 404);
    }

    const originalText = savedTexts[textIndex];
    if (!originalText) {
      throw new AppError('Saved text not found', 404);
    }

    // Update the text (preserve createdAt, update updatedAt)
    const updatedText: SavedText = {
      ...originalText,
      ...updates,
      id: originalText.id, // Ensure id doesn't change
      createdAt: originalText.createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date(), // Update timestamp
    };

    // Replace in array
    savedTexts[textIndex] = updatedText;

    // Update user
    await user.update({ savedTexts }, { transaction });

    await transaction.commit();

    logger.info('updateSavedText: Text updated successfully', {
      userId,
      textId,
      updatedFields: Object.keys(updates),
    });

    return updatedText;
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('updateSavedText: Error updating text', { error: error instanceof Error ? error.message : String(error), userId, textId });
    throw new AppError('Failed to update text', 500);
  }
};

/**
 * Delete a saved text from user's library
 *
 * Removes a saved text element from the user's library permanently.
 *
 * @async
 * @param {string} userId - User's unique identifier
 * @param {string} textId - ID of the saved text to delete
 * @returns {Promise<void>}
 * @throws {AppError} 404 for user/textId not found, 500 for database errors
 *
 * @example
 * await deleteSavedText('user-uuid', 'text-uuid');
 * // Text is now deleted
 */
export const deleteSavedText = async (userId: string, textId: string): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    // Find user
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      logger.warn('deleteSavedText: User not found', { userId });
      throw new AppError('User not found', 404);
    }

    // Get user's saved texts
    const savedTexts = Array.isArray(user.savedTexts) ? user.savedTexts : [];

    // Find the text to delete
    const textIndex = savedTexts.findIndex((text) => text.id === textId);
    if (textIndex === -1) {
      logger.warn('deleteSavedText: Text not found', { userId, textId });
      throw new AppError('Saved text not found', 404);
    }

    // Remove from array
    savedTexts.splice(textIndex, 1);

    // Update user
    await user.update({ savedTexts }, { transaction });

    await transaction.commit();

    logger.info('deleteSavedText: Text deleted successfully', {
      userId,
      textId,
    });
  } catch (error) {
    await transaction.rollback();
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('deleteSavedText: Error deleting text', { error: error instanceof Error ? error.message : String(error), userId, textId });
    throw new AppError('Failed to delete text', 500);
  }
};

export default {
  getSavedTexts,
  addSavedText,
  updateSavedText,
  deleteSavedText,
};
