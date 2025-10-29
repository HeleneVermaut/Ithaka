/**
 * Notebook Model Unit Tests
 *
 * Tests the Notebook Sequelize model to verify:
 * - Valid notebook creation with all required and optional fields
 * - Default value application (pageCount=0, status='active', dpi=300)
 * - ENUM validation for type, format, orientation, status
 * - Required field validation (title, userId, type, format, orientation)
 * - String length validation (title max 100, description max 300)
 * - Timestamp auto-generation (createdAt, updatedAt)
 * - Optional field handling (description, coverImageUrl, archivedAt)
 * - Helper method functionality (isArchived, isActive, canBeDeleted, etc.)
 *
 * @module models/__tests__/Notebook.test
 */

import { Notebook } from '../Notebook';
import { User } from '../User';
import { sequelize } from '../../config/database';
import { ValidationError } from 'sequelize';

describe('Notebook Model', () => {
  let testUser: User;

  beforeAll(async () => {
    // Sync database schema (force: true drops and recreates tables)
    await sequelize.sync({ force: true });

    // Create test user for foreign key relationships
    testUser = await User.create({
      email: 'notebook-test@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456', // Mock bcrypt hash
      firstName: 'Test',
      lastName: 'User',
    });
  });

  afterAll(async () => {
    // Clean up and close connection
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up notebooks after each test
    await Notebook.destroy({ where: {}, force: true });
  });

  describe('Creation', () => {
    it('should create a valid notebook with all required fields', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'My Travel Journal',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.id).toBeDefined();
      expect(notebook.userId).toBe(testUser.id);
      expect(notebook.title).toBe('My Travel Journal');
      expect(notebook.type).toBe('Voyage');
      expect(notebook.format).toBe('A4');
      expect(notebook.orientation).toBe('portrait');
      expect(notebook.createdAt).toBeInstanceOf(Date);
      expect(notebook.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply default values correctly', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Default Values Test',
        type: 'Daily',
        format: 'A5',
        orientation: 'landscape',
      });

      expect(notebook.pageCount).toBe(0);
      expect(notebook.status).toBe('active');
      expect(notebook.dpi).toBe(300);
      expect(notebook.archivedAt).toBeNull();
      expect(notebook.description).toBeUndefined();
      expect(notebook.coverImageUrl).toBeUndefined();
    });

    it('should create notebook with optional fields', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Complete Notebook',
        description: 'A detailed travel journal from my European adventure',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        coverImageUrl: 'https://example.com/cover.jpg',
      });

      expect(notebook.description).toBe('A detailed travel journal from my European adventure');
      expect(notebook.coverImageUrl).toBe('https://example.com/cover.jpg');
    });

    it('should auto-generate UUID for id', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'UUID Test',
        type: 'Reportage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should auto-generate timestamps on creation', async () => {
      const beforeCreate = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Timestamp Test',
        type: 'Daily',
        format: 'A5',
        orientation: 'portrait',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      const afterCreate = new Date();

      expect(notebook.createdAt).toBeInstanceOf(Date);
      expect(notebook.updatedAt).toBeInstanceOf(Date);
      expect(notebook.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(notebook.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Validations - Required Fields', () => {
    it('should fail if userId is missing', async () => {
      await expect(
        Notebook.create({
          title: 'No User ID',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if title is missing', async () => {
      await expect(
        Notebook.create({
          userId: testUser.id,
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if title is empty string', async () => {
      await expect(
        Notebook.create({
          userId: testUser.id,
          title: '',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should fail if type is missing', async () => {
      await expect(
        Notebook.create({
          userId: testUser.id,
          title: 'No Type',
          format: 'A4',
          orientation: 'portrait',
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if format is missing', async () => {
      await expect(
        Notebook.create({
          userId: testUser.id,
          title: 'No Format',
          type: 'Voyage',
          orientation: 'portrait',
        } as any)
      ).rejects.toThrow();
    });

    it('should fail if orientation is missing', async () => {
      await expect(
        Notebook.create({
          userId: testUser.id,
          title: 'No Orientation',
          type: 'Voyage',
          format: 'A4',
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('Validations - String Length', () => {
    it('should fail if title exceeds 100 characters', async () => {
      const longTitle = 'A'.repeat(101);

      await expect(
        Notebook.create({
          userId: testUser.id,
          title: longTitle,
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should succeed with title at 100 characters', async () => {
      const maxTitle = 'A'.repeat(100);

      const notebook = await Notebook.create({
        userId: testUser.id,
        title: maxTitle,
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.title).toBe(maxTitle);
      expect(notebook.title.length).toBe(100);
    });

    it('should succeed with title at 1 character', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'A',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.title).toBe('A');
    });

    it('should fail if description exceeds 300 characters', async () => {
      const longDescription = 'D'.repeat(301);

      await expect(
        Notebook.create({
          userId: testUser.id,
          title: 'Description Test',
          description: longDescription,
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should succeed with description at 300 characters', async () => {
      const maxDescription = 'D'.repeat(300);

      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Description Test',
        description: maxDescription,
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.description).toBe(maxDescription);
      expect(notebook.description!.length).toBe(300);
    });

    it('should succeed with null description', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'No Description',
        description: undefined,
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.description).toBeUndefined();
    });
  });

  describe('Validations - ENUM Fields', () => {
    describe('Type ENUM', () => {
      it('should accept valid type: Voyage', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Voyage Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        });

        expect(notebook.type).toBe('Voyage');
      });

      it('should accept valid type: Daily', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Daily Test',
          type: 'Daily',
          format: 'A4',
          orientation: 'portrait',
        });

        expect(notebook.type).toBe('Daily');
      });

      it('should accept valid type: Reportage', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Reportage Test',
          type: 'Reportage',
          format: 'A4',
          orientation: 'portrait',
        });

        expect(notebook.type).toBe('Reportage');
      });

      it('should fail with invalid type', async () => {
        await expect(
          Notebook.create({
            userId: testUser.id,
            title: 'Invalid Type',
            type: 'InvalidType' as any,
            format: 'A4',
            orientation: 'portrait',
          })
        ).rejects.toThrow();
      });
    });

    describe('Format ENUM', () => {
      it('should accept valid format: A4', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'A4 Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        });

        expect(notebook.format).toBe('A4');
      });

      it('should accept valid format: A5', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'A5 Test',
          type: 'Voyage',
          format: 'A5',
          orientation: 'portrait',
        });

        expect(notebook.format).toBe('A5');
      });

      it('should fail with invalid format', async () => {
        await expect(
          Notebook.create({
            userId: testUser.id,
            title: 'Invalid Format',
            type: 'Voyage',
            format: 'A3' as any,
            orientation: 'portrait',
          })
        ).rejects.toThrow();
      });
    });

    describe('Orientation ENUM', () => {
      it('should accept valid orientation: portrait', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Portrait Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        });

        expect(notebook.orientation).toBe('portrait');
      });

      it('should accept valid orientation: landscape', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Landscape Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'landscape',
        });

        expect(notebook.orientation).toBe('landscape');
      });

      it('should fail with invalid orientation', async () => {
        await expect(
          Notebook.create({
            userId: testUser.id,
            title: 'Invalid Orientation',
            type: 'Voyage',
            format: 'A4',
            orientation: 'square' as any,
          })
        ).rejects.toThrow();
      });
    });

    describe('Status ENUM', () => {
      it('should default to active status', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Status Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
        });

        expect(notebook.status).toBe('active');
      });

      it('should accept valid status: active', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Active Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
          status: 'active',
        });

        expect(notebook.status).toBe('active');
      });

      it('should accept valid status: archived', async () => {
        const notebook = await Notebook.create({
          userId: testUser.id,
          title: 'Archived Test',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
          status: 'archived',
          archivedAt: new Date(),
        });

        expect(notebook.status).toBe('archived');
      });

      it('should fail with invalid status', async () => {
        await expect(
          Notebook.create({
            userId: testUser.id,
            title: 'Invalid Status',
            type: 'Voyage',
            format: 'A4',
            orientation: 'portrait',
            status: 'deleted' as any,
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('Validations - Numeric Fields', () => {
    it('should default dpi to 300', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'DPI Test',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.dpi).toBe(300);
    });

    it('should default pageCount to 0', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'PageCount Test',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.pageCount).toBe(0);
    });

    it('should fail if pageCount is negative', async () => {
      await expect(
        Notebook.create({
          userId: testUser.id,
          title: 'Negative PageCount',
          type: 'Voyage',
          format: 'A4',
          orientation: 'portrait',
          pageCount: -1,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should accept positive pageCount', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Positive PageCount',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        pageCount: 25,
      });

      expect(notebook.pageCount).toBe(25);
    });
  });

  describe('Helper Methods', () => {
    it('isArchived() should return true for archived notebook', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Archived Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        status: 'archived',
        archivedAt: new Date(),
      });

      expect(notebook.isArchived()).toBe(true);
    });

    it('isArchived() should return false for active notebook', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Active Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        status: 'active',
      });

      expect(notebook.isArchived()).toBe(false);
    });

    it('isActive() should return true for active notebook', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Active Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        status: 'active',
      });

      expect(notebook.isActive()).toBe(true);
    });

    it('isActive() should return false for archived notebook', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Archived Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        status: 'archived',
        archivedAt: new Date(),
      });

      expect(notebook.isActive()).toBe(false);
    });

    it('canBeDeleted() should return true for archived notebook', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Archived Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        status: 'archived',
        archivedAt: new Date(),
      });

      expect(notebook.canBeDeleted()).toBe(true);
    });

    it('canBeDeleted() should return false for active notebook', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Active Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
        status: 'active',
      });

      expect(notebook.canBeDeleted()).toBe(false);
    });

    it('getTypeDisplayName() should return correct display name for Voyage', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Voyage Notebook',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.getTypeDisplayName()).toBe('Travel Journal');
    });

    it('getTypeDisplayName() should return correct display name for Daily', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Daily Notebook',
        type: 'Daily',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.getTypeDisplayName()).toBe('Daily Diary');
    });

    it('getTypeDisplayName() should return correct display name for Reportage', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Reportage Notebook',
        type: 'Reportage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.getTypeDisplayName()).toBe('Reportage');
    });

    it('toSafeJSON() should exclude deletedAt field', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Safe JSON Test',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      const safeJSON = notebook.toSafeJSON() as any;

      expect(safeJSON.id).toBeDefined();
      expect(safeJSON.title).toBe('Safe JSON Test');
      expect(safeJSON.deletedAt).toBeUndefined();
    });
  });

  describe('Associations', () => {
    it('should have association with User model', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Association Test',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      expect(notebook.userId).toBe(testUser.id);
    });
  });

  describe('Timestamp Updates', () => {
    it('should update updatedAt when notebook is modified', async () => {
      const notebook = await Notebook.create({
        userId: testUser.id,
        title: 'Original Title',
        type: 'Voyage',
        format: 'A4',
        orientation: 'portrait',
      });

      const originalUpdatedAt = notebook.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      notebook.title = 'Updated Title';
      await notebook.save();

      expect(notebook.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
