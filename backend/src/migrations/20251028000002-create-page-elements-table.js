'use strict';

/**
 * Migration: Create page_elements table
 *
 * Creates the page_elements table to store canvas elements on pages.
 * Supports multiple element types with flexible content and styling via JSONB columns.
 * Paranoid mode enabled for soft delete recovery capability.
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First create the ENUM type if it doesn't exist
    await queryInterface.sequelize.query(
      `CREATE TYPE enum_page_elements_type AS ENUM ('text', 'image', 'shape', 'emoji', 'sticker', 'moodTracker');`
    ).catch(() => {
      // Type might already exist, ignore error
    });

    await queryInterface.createTable('page_elements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the page element',
      },
      pageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'pages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to parent page',
      },
      type: {
        type: Sequelize.ENUM('text', 'image', 'shape', 'emoji', 'sticker', 'moodTracker'),
        allowNull: false,
        comment: 'Type of canvas element',
      },
      x: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'X coordinate in millimeters (mm) from left edge',
      },
      y: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Y coordinate in millimeters (mm) from top edge',
      },
      width: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Element width in millimeters (mm)',
      },
      height: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Element height in millimeters (mm)',
      },
      rotation: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Rotation angle in degrees (-180 to 180)',
      },
      zIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Z-index for layer ordering',
      },
      content: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Element content (type-specific data)',
      },
      style: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Element styling properties',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Optional custom metadata',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when element was created',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when element was last updated',
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp when element was soft-deleted (paranoid mode)',
      },
    });

    // Create indexes for performance
    await queryInterface.addIndex('page_elements', ['pageId'], {
      name: 'idx_element_page',
    });

    await queryInterface.addIndex('page_elements', ['type'], {
      name: 'idx_element_type',
    });

    await queryInterface.addIndex('page_elements', ['zIndex'], {
      name: 'idx_element_zindex',
    });

    await queryInterface.addIndex(
      'page_elements',
      ['pageId', 'zIndex'],
      {
        name: 'idx_element_page_zindex',
      }
    );

    await queryInterface.addIndex('page_elements', ['createdAt'], {
      name: 'idx_element_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('page_elements', 'idx_element_created_at');
    await queryInterface.removeIndex('page_elements', 'idx_element_page_zindex');
    await queryInterface.removeIndex('page_elements', 'idx_element_zindex');
    await queryInterface.removeIndex('page_elements', 'idx_element_type');
    await queryInterface.removeIndex('page_elements', 'idx_element_page');

    // Then drop table
    await queryInterface.dropTable('page_elements');

    // Drop ENUM type
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS enum_page_elements_type;`
    ).catch(() => {
      // Ignore if type doesn't exist
    });
  },
};
