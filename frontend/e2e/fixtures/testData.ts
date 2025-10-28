/**
 * E2E Test Data Fixtures
 *
 * Contains reusable test data for E2E tests including:
 * - User credentials
 * - Notebook test data
 * - Mock dates for testing countdown
 * - Validation test cases
 */

/**
 * SECURITY NOTE: Test user credentials loaded from environment variables
 * See auth.setup.ts for detailed documentation on setting these variables.
 */
export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e.test@example.com',
  password: process.env.E2E_TEST_PASSWORD || '',
  name: 'E2E Test User'
}

export const TEST_NOTEBOOKS = {
  basic: {
    title: 'Mon carnet de voyage',
    type: 'Voyage' as const,
    format: 'A4' as const,
    orientation: 'portrait' as const,
    description: 'Voyage en Italie 2025'
  },
  daily: {
    title: 'Journal quotidien',
    type: 'Daily' as const,
    format: 'A5' as const,
    orientation: 'portrait' as const,
    description: 'Journal quotidien personnel'
  },
  reportage: {
    title: 'Reportage photo',
    type: 'Reportage' as const,
    format: 'Letter' as const,
    orientation: 'landscape' as const,
    description: 'Reportage photographique'
  }
}

/**
 * Bulk test notebooks for pagination testing
 * Creates 25 notebooks: 10 Voyage, 10 Daily, 5 Reportage
 */
export function generateBulkTestNotebooks(count: number = 25) {
  const notebooks = []
  const types = ['Voyage', 'Voyage', 'Voyage', 'Voyage', 'Voyage', 'Voyage', 'Voyage', 'Voyage', 'Voyage', 'Voyage', 'Daily', 'Daily', 'Daily', 'Daily', 'Daily', 'Daily', 'Daily', 'Daily', 'Daily', 'Daily', 'Reportage', 'Reportage', 'Reportage', 'Reportage', 'Reportage']

  for (let i = 1; i <= count; i++) {
    const type = types[i - 1] || 'Voyage'
    notebooks.push({
      title: `Test Notebook ${i}${type === 'Reportage' ? ' - Rome' : ''}`,
      type: type as 'Voyage' | 'Daily' | 'Reportage',
      format: i % 3 === 0 ? ('A5' as const) : ('A4' as const),
      orientation: i % 2 === 0 ? ('landscape' as const) : ('portrait' as const),
      description: `Test notebook number ${i} for pagination testing`
    })
  }

  return notebooks
}

/**
 * Validation test cases
 */
export const VALIDATION_CASES = {
  title: {
    empty: {
      input: '',
      expectedError: 'Le titre est obligatoire'
    },
    tooLong: {
      input: 'A'.repeat(101),
      expectedError: 'Le titre ne peut pas dépasser 100 caractères'
    },
    valid: {
      input: 'Valid Notebook Title',
      expectedError: null
    }
  },
  description: {
    tooLong: {
      input: 'A'.repeat(301),
      expectedError: 'La description ne peut pas dépasser 300 caractères'
    },
    valid: {
      input: 'A'.repeat(250),
      expectedError: null
    }
  },
  type: {
    empty: {
      input: null,
      expectedError: 'Le type est obligatoire'
    },
    valid: {
      input: 'Voyage',
      expectedError: null
    }
  }
}

/**
 * Archive countdown test cases
 * These represent notebooks archived at different times
 */
export const ARCHIVE_COUNTDOWN_CASES = {
  recent: {
    title: 'Recent Archive',
    daysAgo: 5,
    expectedDaysRemaining: 25,
    expectedBarColor: 'green'
  },
  medium: {
    title: 'Medium Archive',
    daysAgo: 20,
    expectedDaysRemaining: 10,
    expectedBarColor: 'orange'
  },
  critical: {
    title: 'Critical Archive',
    daysAgo: 29,
    expectedDaysRemaining: 1,
    expectedBarColor: 'red'
  }
}

/**
 * Keyboard navigation test paths
 * Defines the expected tab order through the page
 */
export const KEYBOARD_NAVIGATION_PATHS = {
  notebooksPage: [
    'input[placeholder*="Rechercher"]',
    'input[type="checkbox"]', // First filter checkbox
    'button:has-text("Nouveau carnet")',
    '.notebook-card', // First notebook card
    'button:has-text("Suivant")' // Pagination button
  ]
}

/**
 * Accessibility test cases
 */
export const ACCESSIBILITY_CASES = {
  focusTrapping: {
    description: 'Modal should trap focus within itself',
    expectedBehavior: 'Focus cycles through modal elements'
  },
  ariaLiveRegions: {
    description: 'Toast notifications should use aria-live',
    expectedBehavior: 'Screen reader announces changes'
  },
  keyboardShortcuts: {
    escape: 'Escape key should close modals',
    enter: 'Enter key should submit forms',
    space: 'Space key should activate buttons'
  }
}

/**
 * API error scenarios for testing error handling
 */
export const ERROR_SCENARIOS = {
  networkError: {
    description: 'Network connection lost',
    expectedMessage: 'Erreur de connexion'
  },
  serverError500: {
    description: 'Server error',
    statusCode: 500,
    expectedMessage: 'Erreur serveur'
  },
  notFound404: {
    description: 'Resource not found',
    statusCode: 404,
    expectedMessage: 'Ressource non trouvée'
  },
  unauthorized401: {
    description: 'Session expired',
    statusCode: 401,
    expectedMessage: 'Votre session a expiré'
  }
}

/**
 * Performance test targets
 */
export const PERFORMANCE_TARGETS = {
  notebookGalleryLoad: 2000, // 2 seconds
  createNotebookForm: 500, // 0.5 seconds
  pagination: 1000, // 1 second
  search: 800 // 0.8 seconds
}

/**
 * Browser compatibility test matrix
 */
export const BROWSER_MATRIX = {
  desktop: ['chromium', 'firefox', 'webkit'],
  mobile: ['mobile-chrome']
}
