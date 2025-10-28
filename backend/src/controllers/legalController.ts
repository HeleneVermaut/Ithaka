/**
 * Legal Controller
 *
 * Contrôleur pour gérer les documents légaux (privacy policy, terms of service)
 * GDPR Article 13 & 14 - Information obligation
 *
 * @module controllers/legalController
 */

import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Get the Privacy Policy document
 *
 * @route GET /api/legal/privacy-policy
 * @access Public
 *
 * Returns the privacy policy in markdown format
 * GDPR Article 13: Information to be provided when personal data are collected
 *
 * @param req - Express request object
 * @param res - Express response object
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "content": "# Privacy Policy...",
 *   "lastUpdated": "2025-01-28",
 *   "version": "1.0"
 * }
 */
export const getPrivacyPolicy = async (_req: Request, res: Response): Promise<void> => {
  try {
    const filePath = path.join(__dirname, '../../docs/PRIVACY-POLICY.md');
    const content = await fs.readFile(filePath, 'utf-8');

    res.status(200).json({
      content,
      lastUpdated: '2025-01-28',
      version: '1.0',
      gdprCompliance: 'In accordance with GDPR Article 13 & 14',
    });

    logger.info('Privacy policy retrieved');
  } catch (error) {
    logger.error('Error reading privacy policy:', error);
    res.status(500).json({
      message: 'Error loading privacy policy',
      error: 'Unable to read privacy policy file',
    });
  }
};

/**
 * Get the Terms of Service document
 *
 * @route GET /api/legal/terms
 * @access Public
 *
 * Returns the terms of service in markdown format
 *
 * @param req - Express request object
 * @param res - Express response object
 *
 * @example
 * // Success response (200 OK)
 * {
 *   "content": "# Terms of Service...",
 *   "lastUpdated": "2025-01-28",
 *   "version": "1.0"
 * }
 */
export const getTermsOfService = async (_req: Request, res: Response): Promise<void> => {
  try {
    const filePath = path.join(__dirname, '../../docs/TERMS-OF-SERVICE.md');
    const content = await fs.readFile(filePath, 'utf-8');

    res.status(200).json({
      content,
      lastUpdated: '2025-01-28',
      version: '1.0',
    });

    logger.info('Terms of service retrieved');
  } catch (error) {
    logger.error('Error reading terms of service:', error);
    res.status(500).json({
      message: 'Error loading terms of service',
      error: 'Unable to read terms of service file',
    });
  }
};
