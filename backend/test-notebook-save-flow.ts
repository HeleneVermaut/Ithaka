/**
 * Notebook Save Flow Integration Test
 *
 * This test validates the complete save flow for notebooks:
 * 1. Create a user and authenticate
 * 2. Create a notebook
 * 3. Update the notebook (save) with different field combinations
 * 4. Verify data persistence in database
 * 5. Test validation and error handling
 *
 * Run with: npm test -- test-notebook-save-flow.ts
 */

import axios, { AxiosInstance } from 'axios';
import { sequelize } from './src/config/database';
import { User } from './src/models/User';
import { Notebook } from './src/models/Notebook';
import { NotebookPermissions } from './src/models/NotebookPermissions';

const API_BASE_URL = 'http://localhost:3000/api';

interface TestResult {
  status: 'PASS' | 'FAIL';
  testName: string;
  details: string;
  error?: string;
}

class NotebookSaveFlowTester {
  private client: AxiosInstance;
  private results: TestResult[] = [];
  private testUserId: string = '';
  private testNotebookId: string = '';
  private accessToken: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  async runAllTests(): Promise<void> {
    console.log('\n========================================');
    console.log('Notebook Save Flow Integration Tests');
    console.log('========================================\n');

    try {
      // Setup: Create test user and authenticate
      await this.setupTestUser();

      // Test 1: Create a notebook
      await this.testCreateNotebook();

      // Test 2: Update title only
      await this.testUpdateTitle();

      // Test 3: Update description only
      await this.testUpdateDescription();

      // Test 4: Update multiple fields
      await this.testUpdateMultipleFields();

      // Test 5: Update DPI
      await this.testUpdateDpi();

      // Test 6: Update cover image
      await this.testUpdateCoverImage();

      // Test 7: Verify immutable fields cannot be changed
      await this.testImmutableFieldsProtection();

      // Test 8: Validate input constraints
      await this.testInputValidation();

      // Test 9: Verify database persistence
      await this.testDatabasePersistence();

      // Test 10: Verify timestamps
      await this.testTimestamps();

      // Test 11: Test unauthorized access
      await this.testUnauthorizedAccess();

      // Test 12: Test ownership validation
      await this.testOwnershipValidation();

      // Cleanup
      await this.cleanup();
    } catch (error) {
      this.addResult('FAIL', 'Setup', `Fatal error: ${error}`);
    }

    this.printReport();
  }

  private async setupTestUser(): Promise<void> {
    try {
      // Register a test user
      const registerResponse = await this.client.post('/auth/register', {
        email: `test-notebook-${Date.now()}@example.com`,
        password: 'TestPassword123',
        firstName: 'Notebook',
        lastName: 'Tester',
      });

      if (registerResponse.status !== 201) {
        throw new Error(`Registration failed: ${registerResponse.statusText}`);
      }

      // Extract user ID from response
      const userData = registerResponse.data.data.user;
      this.testUserId = userData.id;
      this.addResult('PASS', 'Setup', `Test user created: ${this.testUserId}`);

      // Login to get access token
      const loginResponse = await this.client.post('/auth/login', {
        email: registerResponse.data.data.user.email,
        password: 'TestPassword123',
      });

      if (loginResponse.status !== 200) {
        throw new Error(`Login failed: ${loginResponse.statusText}`);
      }

      // Set authorization header for future requests
      this.client.defaults.headers.common['Authorization'] =
        `Bearer ${loginResponse.data.data.accessToken}`;
      this.accessToken = loginResponse.data.data.accessToken;

      this.addResult('PASS', 'Setup', `Test user authenticated`);
    } catch (error) {
      throw new Error(`Setup failed: ${error}`);
    }
  }

  private async testCreateNotebook(): Promise<void> {
    try {
      const response = await this.client.post('/notebooks', {
        title: 'Test Notebook Save Flow',
        description: 'Testing notebook save functionality',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        dpi: 300,
      });

      if (response.status !== 201) {
        this.addResult('FAIL', 'Create Notebook',
          `Expected 201, got ${response.status}: ${response.data?.message}`);
        return;
      }

      this.testNotebookId = response.data.data.id;

      // Verify response structure
      const notebook = response.data.data;
      if (!notebook.id || !notebook.userId || !notebook.title) {
        this.addResult('FAIL', 'Create Notebook',
          'Response missing required fields');
        return;
      }

      if (notebook.userId !== this.testUserId) {
        this.addResult('FAIL', 'Create Notebook',
          'Notebook userId does not match authenticated user');
        return;
      }

      if (notebook.pageCount !== 1) {
        this.addResult('FAIL', 'Create Notebook',
          `Expected pageCount=1, got ${notebook.pageCount}`);
        return;
      }

      this.addResult('PASS', 'Create Notebook',
        `Notebook created with ID: ${this.testNotebookId}`);
    } catch (error) {
      this.addResult('FAIL', 'Create Notebook', `${error}`);
    }
  }

  private async testUpdateTitle(): Promise<void> {
    try {
      const newTitle = `Updated Title ${Date.now()}`;
      const response = await this.client.put(`/notebooks/${this.testNotebookId}`, {
        title: newTitle,
      });

      if (response.status !== 200) {
        this.addResult('FAIL', 'Update Title',
          `Expected 200, got ${response.status}: ${response.data?.message}`);
        return;
      }

      const notebook = response.data.data;
      if (notebook.title !== newTitle) {
        this.addResult('FAIL', 'Update Title',
          `Title not updated. Expected "${newTitle}", got "${notebook.title}"`);
        return;
      }

      // Verify updatedAt was modified
      if (!notebook.updatedAt) {
        this.addResult('FAIL', 'Update Title',
          'updatedAt timestamp not present');
        return;
      }

      this.addResult('PASS', 'Update Title',
        `Title updated successfully to: ${newTitle}`);
    } catch (error) {
      this.addResult('FAIL', 'Update Title', `${error}`);
    }
  }

  private async testUpdateDescription(): Promise<void> {
    try {
      const newDescription = `Updated description ${Date.now()}`;
      const response = await this.client.put(`/notebooks/${this.testNotebookId}`, {
        description: newDescription,
      });

      if (response.status !== 200) {
        this.addResult('FAIL', 'Update Description',
          `Expected 200, got ${response.status}`);
        return;
      }

      const notebook = response.data.data;
      if (notebook.description !== newDescription) {
        this.addResult('FAIL', 'Update Description',
          `Description not updated. Expected "${newDescription}", got "${notebook.description}"`);
        return;
      }

      this.addResult('PASS', 'Update Description',
        `Description updated successfully`);
    } catch (error) {
      this.addResult('FAIL', 'Update Description', `${error}`);
    }
  }

  private async testUpdateMultipleFields(): Promise<void> {
    try {
      const updateData = {
        title: 'Multi Update Test',
        description: 'Multiple fields updated',
        dpi: 150,
      };

      const response = await this.client.put(`/notebooks/${this.testNotebookId}`, updateData);

      if (response.status !== 200) {
        this.addResult('FAIL', 'Update Multiple Fields',
          `Expected 200, got ${response.status}`);
        return;
      }

      const notebook = response.data.data;
      let allMatch = true;
      let mismatches: string[] = [];

      if (notebook.title !== updateData.title) {
        allMatch = false;
        mismatches.push(`title: expected "${updateData.title}", got "${notebook.title}"`);
      }
      if (notebook.description !== updateData.description) {
        allMatch = false;
        mismatches.push(`description: expected "${updateData.description}", got "${notebook.description}"`);
      }
      if (notebook.dpi !== updateData.dpi) {
        allMatch = false;
        mismatches.push(`dpi: expected ${updateData.dpi}, got ${notebook.dpi}`);
      }

      if (!allMatch) {
        this.addResult('FAIL', 'Update Multiple Fields',
          `Fields not updated: ${mismatches.join('; ')}`);
        return;
      }

      this.addResult('PASS', 'Update Multiple Fields',
        `All fields updated successfully`);
    } catch (error) {
      this.addResult('FAIL', 'Update Multiple Fields', `${error}`);
    }
  }

  private async testUpdateDpi(): Promise<void> {
    try {
      const response = await this.client.put(`/notebooks/${this.testNotebookId}`, {
        dpi: 600,
      });

      if (response.status !== 200) {
        this.addResult('FAIL', 'Update DPI',
          `Expected 200, got ${response.status}`);
        return;
      }

      const notebook = response.data.data;
      if (notebook.dpi !== 600) {
        this.addResult('FAIL', 'Update DPI',
          `DPI not updated. Expected 600, got ${notebook.dpi}`);
        return;
      }

      this.addResult('PASS', 'Update DPI',
        `DPI updated successfully to 600`);
    } catch (error) {
      this.addResult('FAIL', 'Update DPI', `${error}`);
    }
  }

  private async testUpdateCoverImage(): Promise<void> {
    try {
      const coverUrl = 'https://example.com/cover-image.jpg';
      const response = await this.client.put(`/notebooks/${this.testNotebookId}`, {
        coverImageUrl: coverUrl,
      });

      if (response.status !== 200) {
        this.addResult('FAIL', 'Update Cover Image',
          `Expected 200, got ${response.status}`);
        return;
      }

      const notebook = response.data.data;
      if (notebook.coverImageUrl !== coverUrl) {
        this.addResult('FAIL', 'Update Cover Image',
          `Cover image not updated. Expected "${coverUrl}", got "${notebook.coverImageUrl}"`);
        return;
      }

      this.addResult('PASS', 'Update Cover Image',
        `Cover image updated successfully`);
    } catch (error) {
      this.addResult('FAIL', 'Update Cover Image', `${error}`);
    }
  }

  private async testImmutableFieldsProtection(): Promise<void> {
    try {
      const originalResponse = await this.client.get(`/notebooks/${this.testNotebookId}`);
      const originalType = originalResponse.data.data.type;
      const originalFormat = originalResponse.data.data.format;
      const originalOrientation = originalResponse.data.data.orientation;

      // Try to update immutable fields
      const response = await this.client.put(`/notebooks/${this.testNotebookId}`, {
        title: 'Should Update',
        type: 'Daily', // Try to change immutable field
        format: 'A5', // Try to change immutable field
        orientation: 'landscape', // Try to change immutable field
      });

      if (response.status !== 200) {
        this.addResult('FAIL', 'Immutable Fields Protection',
          `Update failed: ${response.status}`);
        return;
      }

      // Verify immutable fields were NOT changed
      const notebook = response.data.data;
      if (notebook.type !== originalType ||
          notebook.format !== originalFormat ||
          notebook.orientation !== originalOrientation) {
        this.addResult('FAIL', 'Immutable Fields Protection',
          'Immutable fields were modified (security issue!)');
        return;
      }

      // Verify mutable field was changed
      if (notebook.title !== 'Should Update') {
        this.addResult('FAIL', 'Immutable Fields Protection',
          'Mutable field was not updated');
        return;
      }

      this.addResult('PASS', 'Immutable Fields Protection',
        'Immutable fields are properly protected');
    } catch (error) {
      this.addResult('FAIL', 'Immutable Fields Protection', `${error}`);
    }
  }

  private async testInputValidation(): Promise<void> {
    try {
      const testCases = [
        {
          name: 'Title too long',
          data: { title: 'a'.repeat(101) },
          shouldFail: true,
        },
        {
          name: 'Description too long',
          data: { description: 'a'.repeat(301) },
          shouldFail: true,
        },
        {
          name: 'Invalid DPI (too low)',
          data: { dpi: 50 },
          shouldFail: true,
        },
        {
          name: 'Invalid DPI (too high)',
          data: { dpi: 700 },
          shouldFail: true,
        },
        {
          name: 'Empty update',
          data: {},
          shouldFail: true,
        },
      ];

      for (const testCase of testCases) {
        const response = await this.client.put(`/notebooks/${this.testNotebookId}`, testCase.data);

        if (testCase.shouldFail && response.status === 200) {
          this.addResult('FAIL', `Input Validation: ${testCase.name}`,
            `Expected validation to fail but got 200`);
        } else if (!testCase.shouldFail && response.status !== 200) {
          this.addResult('FAIL', `Input Validation: ${testCase.name}`,
            `Expected 200 but got ${response.status}`);
        }
      }

      this.addResult('PASS', 'Input Validation',
        'All validation tests passed');
    } catch (error) {
      this.addResult('FAIL', 'Input Validation', `${error}`);
    }
  }

  private async testDatabasePersistence(): Promise<void> {
    try {
      // Get notebook from API
      const apiResponse = await this.client.get(`/notebooks/${this.testNotebookId}`);
      const apiNotebook = apiResponse.data.data;

      // Get notebook directly from database
      const dbNotebook = await Notebook.findByPk(this.testNotebookId);

      if (!dbNotebook) {
        this.addResult('FAIL', 'Database Persistence',
          'Notebook not found in database');
        return;
      }

      // Compare critical fields
      const mismatches: string[] = [];

      if (apiNotebook.title !== dbNotebook.title) {
        mismatches.push(`title: API="${apiNotebook.title}", DB="${dbNotebook.title}"`);
      }
      if (apiNotebook.description !== dbNotebook.description) {
        mismatches.push(`description: API="${apiNotebook.description}", DB="${dbNotebook.description}"`);
      }
      if (apiNotebook.dpi !== dbNotebook.dpi) {
        mismatches.push(`dpi: API=${apiNotebook.dpi}, DB=${dbNotebook.dpi}`);
      }
      if (apiNotebook.coverImageUrl !== dbNotebook.coverImageUrl) {
        mismatches.push(`coverImageUrl: API="${apiNotebook.coverImageUrl}", DB="${dbNotebook.coverImageUrl}"`);
      }

      if (mismatches.length > 0) {
        this.addResult('FAIL', 'Database Persistence',
          `Mismatch between API and DB: ${mismatches.join('; ')}`);
        return;
      }

      this.addResult('PASS', 'Database Persistence',
        'All data correctly persisted in database');
    } catch (error) {
      this.addResult('FAIL', 'Database Persistence', `${error}`);
    }
  }

  private async testTimestamps(): Promise<void> {
    try {
      // Get initial state
      const response1 = await this.client.get(`/notebooks/${this.testNotebookId}`);
      const initialUpdatedAt = new Date(response1.data.data.updatedAt);

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));

      await this.client.put(`/notebooks/${this.testNotebookId}`, {
        title: `Updated at ${Date.now()}`,
      });

      // Get updated state
      const response2 = await this.client.get(`/notebooks/${this.testNotebookId}`);
      const newUpdatedAt = new Date(response2.data.data.updatedAt);

      if (newUpdatedAt <= initialUpdatedAt) {
        this.addResult('FAIL', 'Timestamps',
          `updatedAt was not changed or went backwards`);
        return;
      }

      this.addResult('PASS', 'Timestamps',
        'Timestamps updated correctly on save');
    } catch (error) {
      this.addResult('FAIL', 'Timestamps', `${error}`);
    }
  }

  private async testUnauthorizedAccess(): Promise<void> {
    try {
      // Create client without auth token
      const unAuthClient = axios.create({
        baseURL: API_BASE_URL,
        validateStatus: () => true,
      });

      const response = await unAuthClient.put(`/notebooks/${this.testNotebookId}`, {
        title: 'Should not work',
      });

      if (response.status === 200) {
        this.addResult('FAIL', 'Unauthorized Access',
          'Update succeeded without authentication (security issue!)');
        return;
      }

      if (response.status !== 401) {
        this.addResult('FAIL', 'Unauthorized Access',
          `Expected 401, got ${response.status}`);
        return;
      }

      this.addResult('PASS', 'Unauthorized Access',
        'Unauthorized requests are properly rejected');
    } catch (error) {
      this.addResult('FAIL', 'Unauthorized Access', `${error}`);
    }
  }

  private async testOwnershipValidation(): Promise<void> {
    try {
      // Create another test user
      const otherUserEmail = `other-user-${Date.now()}@example.com`;
      const registerResponse = await this.client.post('/auth/register', {
        email: otherUserEmail,
        password: 'OtherPassword123',
        firstName: 'Other',
        lastName: 'User',
      });

      const otherUserId = registerResponse.data.data.user.id;

      // Login as other user
      const loginResponse = await this.client.post('/auth/login', {
        email: otherUserEmail,
        password: 'OtherPassword123',
      });

      // Create a new client with other user's token
      const otherUserClient = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${loginResponse.data.data.accessToken}`,
        },
        validateStatus: () => true,
      });

      // Try to update first user's notebook
      const response = await otherUserClient.put(`/notebooks/${this.testNotebookId}`, {
        title: 'Should not work',
      });

      if (response.status === 200) {
        this.addResult('FAIL', 'Ownership Validation',
          'Other user was able to update notebook (security issue!)');
        return;
      }

      if (response.status !== 404) {
        this.addResult('FAIL', 'Ownership Validation',
          `Expected 404, got ${response.status}`);
        return;
      }

      this.addResult('PASS', 'Ownership Validation',
        'Ownership is properly enforced');
    } catch (error) {
      this.addResult('FAIL', 'Ownership Validation', `${error}`);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.testUserId) {
        // Delete test user (cascade will delete notebooks and permissions)
        await User.destroy({
          where: { id: this.testUserId },
        });
      }
      this.addResult('PASS', 'Cleanup', 'Test data cleaned up');
    } catch (error) {
      this.addResult('FAIL', 'Cleanup', `${error}`);
    }
  }

  private addResult(status: 'PASS' | 'FAIL', testName: string, details: string, error?: string): void {
    this.results.push({
      status,
      testName,
      details,
      error,
    });
  }

  private printReport(): void {
    console.log('\n========================================');
    console.log('Test Results');
    console.log('========================================\n');

    let passCount = 0;
    let failCount = 0;

    this.results.forEach((result) => {
      const icon = result.status === 'PASS' ? '✓' : '✗';
      const color = result.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${color}${icon} ${result.testName}${reset}`);
      console.log(`  ${result.details}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      if (result.status === 'PASS') {
        passCount++;
      } else {
        failCount++;
      }
    });

    console.log('\n========================================');
    console.log(`Summary: ${passCount} passed, ${failCount} failed`);
    console.log('========================================\n');

    process.exit(failCount > 0 ? 1 : 0);
  }
}

// Run the tests
const tester = new NotebookSaveFlowTester();
tester.runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
