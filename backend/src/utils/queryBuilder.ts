/**
 * Query Builder Utility
 *
 * This module provides pure utility functions for building Sequelize query parameters
 * to support pagination, filtering, and sorting in the notebook gallery and other
 * paginated endpoints.
 *
 * These functions transform frontend query parameters into safe Sequelize query objects,
 * preventing SQL injection through Sequelize's parameterized queries and operators.
 *
 * Features:
 * - Type filtering (Voyage, Daily, Reportage - comma-separated support)
 * - Status filtering (active/archived based on archivedAt field)
 * - Title search (case-insensitive partial matching)
 * - Multi-criteria sorting (createdAt, title, pageCount, updatedAt, type)
 * - Pagination with configurable page size (default 12, max 100)
 * - Safe default fallbacks for all parameters
 *
 * Why separate utility?
 * - Centralizes filtering logic (testable, reusable)
 * - Prevents SQL injection (Sequelize operators handle parameterization)
 * - Keeps service layer clean and focused on business logic
 * - Makes query building predictable and maintainable
 *
 * @module utils/queryBuilder
 */

import { Op } from 'sequelize';

/**
 * Filter parameters interface
 * Defines all available filtering options for notebooks
 *
 * @interface FilterParams
 */
export interface FilterParams {
  /** Comma-separated notebook types (e.g., "Voyage,Daily") */
  type?: string;
  /** Status filter: "active" or "archived" */
  status?: string;
  /** Search term for title (case-insensitive partial match) */
  search?: string;
}

/**
 * Pagination result metadata
 * Contains information about the current page and total results
 *
 * @interface PaginationMetadata
 */
export interface PaginationMetadata {
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Valid sort field names
 * Defines which fields can be used for sorting
 */
const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'pageCount', 'type'] as const;
type SortField = typeof VALID_SORT_FIELDS[number];

/**
 * Valid sort directions
 */
const VALID_SORT_ORDERS = ['ASC', 'DESC'] as const;
type SortOrder = typeof VALID_SORT_ORDERS[number];

/**
 * Valid notebook types
 */
const VALID_NOTEBOOK_TYPES = ['Voyage', 'Daily', 'Reportage'] as const;
type NotebookType = typeof VALID_NOTEBOOK_TYPES[number];

/**
 * Default pagination settings
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Build WHERE clause for Sequelize query from filter parameters
 *
 * This function transforms frontend filter parameters into a safe Sequelize WHERE object.
 * All filters are combined with AND logic (must match all specified criteria).
 * The userId filter is always included to ensure users only see their own notebooks.
 *
 * Filter behavior:
 * - type: Filters by notebook type(s). Accepts comma-separated values.
 *         Empty string or no types provided = no filter applied.
 *         Example: "Voyage,Daily" → includes both Voyage and Daily notebooks
 *
 * - status: Filters by archive status.
 *           "active" → archivedAt IS NULL (not archived)
 *           "archived" → archivedAt IS NOT NULL (archived)
 *           null/undefined → defaults to "active" (show active notebooks only)
 *
 * - search: Searches in the title field using case-insensitive partial matching.
 *           Empty string → no search filter applied.
 *           Example: "Loire" → matches "Voyage en Loire", "Loire Valley Trip"
 *
 * Security:
 * - SQL injection is prevented through Sequelize operators (Op.in, Op.iLike, Op.not)
 * - All values are parameterized by Sequelize before reaching the database
 * - Invalid types are filtered out, only valid enum values are included
 *
 * @param {FilterParams} filters - Filter parameters from frontend
 * @param {string} userId - User ID to filter notebooks by ownership (required)
 * @returns {Record<string, any>} Sequelize WHERE clause object
 *
 * @example
 * // Filter by type and status
 * const where = buildWhereClause(
 *   { type: 'Voyage,Daily', status: 'active' },
 *   'user-123'
 * );
 * // Returns: {
 * //   userId: 'user-123',
 * //   type: { [Op.in]: ['Voyage', 'Daily'] },
 * //   archivedAt: null
 * // }
 *
 * @example
 * // Search with status filter
 * const where = buildWhereClause(
 *   { search: 'Loire', status: 'archived' },
 *   'user-123'
 * );
 * // Returns: {
 * //   userId: 'user-123',
 * //   title: { [Op.iLike]: '%Loire%' },
 * //   archivedAt: { [Op.not]: null }
 * // }
 *
 * @example
 * // No filters (defaults to active notebooks only)
 * const where = buildWhereClause({}, 'user-123');
 * // Returns: {
 * //   userId: 'user-123',
 * //   archivedAt: null
 * // }
 */
export function buildWhereClause(filters: FilterParams, userId: string): Record<string, any> {
  const whereClause: Record<string, any> = {
    userId, // Always filter by user ownership
  };

  // Filter by type(s) - comma-separated, supports multiple types
  if (filters.type && filters.type.trim() !== '') {
    const types = filters.type
      .split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_NOTEBOOK_TYPES.includes(t as NotebookType));

    if (types.length > 0) {
      whereClause['type'] = { [Op.in]: types };
    }
  }

  // Filter by status (active or archived)
  // Defaults to active if not specified
  const status = filters.status || 'active';
  if (status === 'active') {
    whereClause['archivedAt'] = null; // archivedAt IS NULL
  } else if (status === 'archived') {
    whereClause['archivedAt'] = { [Op.not]: null }; // archivedAt IS NOT NULL
  }

  // Search in title (case-insensitive)
  if (filters.search && filters.search.trim() !== '') {
    const searchTerm = filters.search.trim();
    whereClause['title'] = { [Op.iLike]: `%${searchTerm}%` }; // Case-insensitive LIKE
  }

  return whereClause;
}

/**
 * Build ORDER BY clause for Sequelize query
 *
 * This function creates a safe ORDER BY clause for sorting query results.
 * It validates the sort field and direction, falling back to defaults if invalid.
 *
 * Valid sort fields:
 * - createdAt: Sort by creation date
 * - updatedAt: Sort by last modification date
 * - title: Sort alphabetically by title
 * - pageCount: Sort by number of pages
 * - type: Sort by notebook type (alphabetically)
 *
 * Sort directions:
 * - ASC: Ascending (oldest first, A-Z, lowest first)
 * - DESC: Descending (newest first, Z-A, highest first)
 *
 * Default behavior:
 * - Invalid field → falls back to 'createdAt'
 * - Invalid order → falls back to 'DESC'
 * - No parameters → returns [['createdAt', 'DESC']] (newest first)
 *
 * Security:
 * - Only whitelisted fields can be used for sorting
 * - SQL injection is prevented through Sequelize parameterization
 * - Invalid values are rejected and safe defaults are used
 *
 * @param {string} [sort] - Field to sort by (optional)
 * @param {string} [order] - Sort direction: ASC or DESC (optional)
 * @returns {Array<[string, string]>} Sequelize ORDER clause array
 *
 * @example
 * // Default sort (newest first)
 * const order = buildOrderClause();
 * // Returns: [['createdAt', 'DESC']]
 *
 * @example
 * // Sort by title alphabetically
 * const order = buildOrderClause('title', 'ASC');
 * // Returns: [['title', 'ASC']]
 *
 * @example
 * // Sort by page count (highest first)
 * const order = buildOrderClause('pageCount', 'DESC');
 * // Returns: [['pageCount', 'DESC']]
 *
 * @example
 * // Invalid field - falls back to default
 * const order = buildOrderClause('invalidField', 'ASC');
 * // Returns: [['createdAt', 'DESC']]
 */
export function buildOrderClause(sort?: string, order?: string): Array<[string, string]> {
  // Validate sort field
  const sortField: SortField = VALID_SORT_FIELDS.includes(sort as SortField)
    ? (sort as SortField)
    : 'createdAt';

  // Validate sort order
  const sortOrder: SortOrder =
    order?.toUpperCase() === 'ASC' || order?.toUpperCase() === 'DESC'
      ? (order.toUpperCase() as SortOrder)
      : 'DESC';

  return [[sortField, sortOrder]];
}

/**
 * Build pagination parameters for Sequelize query
 *
 * This function calculates OFFSET and LIMIT values for database pagination.
 * It enforces safe limits and handles edge cases to prevent invalid queries.
 *
 * Pagination behavior:
 * - Page numbers are 1-indexed (first page is page 1, not 0)
 * - OFFSET is calculated as: (page - 1) * limit
 * - Default page: 1
 * - Default limit: 12 items per page
 * - Maximum limit: 100 items per page (enforced)
 * - Minimum limit: 1 item per page (enforced)
 *
 * Edge cases:
 * - Page < 1 → treated as page 1 (offset = 0)
 * - Page > total pages → still calculates offset (database returns empty results)
 * - Limit > 100 → capped at 100
 * - Limit < 1 → set to 1
 * - Non-numeric values → fall back to defaults
 *
 * Why limit at 100?
 * - Prevents excessive database load
 * - Keeps response times reasonable
 * - Suitable for UI pagination (galleries typically show 12-50 items)
 *
 * Performance:
 * - OFFSET/LIMIT is standard SQL pagination
 * - Works well for datasets up to ~10,000 items
 * - For larger datasets, consider cursor-based pagination (future enhancement)
 *
 * @param {number} [page] - Page number (1-indexed, optional)
 * @param {number} [limit] - Items per page (optional)
 * @returns {{ offset: number; limit: number }} Pagination parameters for Sequelize
 *
 * @example
 * // Default pagination (first page, 12 items)
 * const params = buildPaginationParams();
 * // Returns: { offset: 0, limit: 12 }
 *
 * @example
 * // Page 2 with default limit
 * const params = buildPaginationParams(2);
 * // Returns: { offset: 12, limit: 12 }
 *
 * @example
 * // Custom page size (24 items per page)
 * const params = buildPaginationParams(1, 24);
 * // Returns: { offset: 0, limit: 24 }
 *
 * @example
 * // Limit capped at maximum
 * const params = buildPaginationParams(1, 200);
 * // Returns: { offset: 0, limit: 100 }
 *
 * @example
 * // Invalid page handled gracefully
 * const params = buildPaginationParams(0, 12);
 * // Returns: { offset: 0, limit: 12 }
 */
export function buildPaginationParams(
  page?: number,
  limit?: number
): { offset: number; limit: number } {
  // Parse and validate page number (1-indexed)
  const validPage = Math.max(DEFAULT_PAGE, Math.floor(Number(page) || DEFAULT_PAGE));

  // Parse and validate limit (enforce min and max)
  const parsedLimit = Math.floor(Number(limit) || DEFAULT_LIMIT);
  const validLimit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsedLimit));

  // Calculate offset (0-indexed for database)
  const offset = (validPage - 1) * validLimit;

  return {
    offset,
    limit: validLimit,
  };
}

/**
 * Build pagination metadata from query results
 *
 * This helper function creates metadata about the pagination state,
 * useful for frontend pagination controls (showing page numbers, enabling/disabling buttons).
 *
 * The metadata includes:
 * - total: Total number of items across all pages
 * - totalPages: Number of pages required to show all items
 * - currentPage: Current page number (1-indexed)
 * - pageSize: Number of items per page
 * - hasNext: Whether there is a next page available
 * - hasPrev: Whether there is a previous page available
 *
 * Edge cases:
 * - Empty results (total = 0) → totalPages = 0, hasNext/hasPrev = false
 * - Single page → totalPages = 1, hasNext/hasPrev = false
 * - Last page → hasNext = false, hasPrev = true (if not first page)
 *
 * @param {number} total - Total number of items from count query
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {PaginationMetadata} Pagination metadata object
 *
 * @example
 * // 50 items, page 2, 12 per page
 * const metadata = buildPaginationMetadata(50, 2, 12);
 * // Returns: {
 * //   total: 50,
 * //   totalPages: 5,
 * //   currentPage: 2,
 * //   pageSize: 12,
 * //   hasNext: true,
 * //   hasPrev: true
 * // }
 *
 * @example
 * // Empty results
 * const metadata = buildPaginationMetadata(0, 1, 12);
 * // Returns: {
 * //   total: 0,
 * //   totalPages: 0,
 * //   currentPage: 1,
 * //   pageSize: 12,
 * //   hasNext: false,
 * //   hasPrev: false
 * // }
 *
 * @example
 * // Last page (45 items, page 4, 12 per page)
 * const metadata = buildPaginationMetadata(45, 4, 12);
 * // Returns: {
 * //   total: 45,
 * //   totalPages: 4,
 * //   currentPage: 4,
 * //   pageSize: 12,
 * //   hasNext: false,
 * //   hasPrev: true
 * // }
 */
export function buildPaginationMetadata(
  total: number,
  currentPage: number,
  pageSize: number
): PaginationMetadata {
  const totalPages = Math.ceil(total / pageSize);

  return {
    total,
    totalPages,
    currentPage,
    pageSize,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

/**
 * Example usage of queryBuilder utilities
 *
 * This example demonstrates how to use the queryBuilder functions together
 * in a typical service layer method for fetching paginated, filtered, and sorted notebooks.
 *
 * @example
 * // In notebookService.ts
 * import { buildWhereClause, buildOrderClause, buildPaginationParams, buildPaginationMetadata } from '../utils/queryBuilder';
 * import { Notebook } from '../models/Notebook';
 *
 * async function getNotebooks(
 *   userId: string,
 *   filters: FilterParams,
 *   sort?: string,
 *   order?: string,
 *   page?: number,
 *   limit?: number
 * ) {
 *   // Build query parameters
 *   const where = buildWhereClause(filters, userId);
 *   const orderClause = buildOrderClause(sort, order);
 *   const { offset, limit: pageSize } = buildPaginationParams(page, limit);
 *
 *   // Execute query with count
 *   const { count, rows } = await Notebook.findAndCountAll({
 *     where,
 *     order: orderClause,
 *     limit: pageSize,
 *     offset,
 *   });
 *
 *   // Build pagination metadata
 *   const pagination = buildPaginationMetadata(count, page || 1, pageSize);
 *
 *   return {
 *     notebooks: rows,
 *     pagination,
 *   };
 * }
 */
