/**
 * Legal Routes
 *
 * Routes pour les documents légaux (privacy policy, terms of service)
 * GDPR compliance - Articles 13 & 14
 *
 * @module routes/legalRoutes
 */

import { Router } from 'express';
import { getPrivacyPolicy, getTermsOfService } from '../controllers/legalController';

const router = Router();

/**
 * @route   GET /api/legal/privacy-policy
 * @desc    Get privacy policy document (GDPR Article 13 & 14)
 * @access  Public
 *
 * Returns the complete privacy policy in markdown format
 * Includes information about data collection, processing, rights, etc.
 */
router.get('/privacy-policy', getPrivacyPolicy);

/**
 * @route   GET /api/legal/terms
 * @desc    Get terms of service document
 * @access  Public
 *
 * Returns the complete terms of service in markdown format
 */
router.get('/terms', getTermsOfService);

export default router;
