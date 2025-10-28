'use strict';

/**
 * Migration: Create pages table
 *
 * Creates the pages table to store individual pages within notebooks.
 * Each page is a container for canvas elements and has a sequential page number.
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the page',
      },
      notebookId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'notebooks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to parent notebook',
      },
      pageNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Sequential page number within notebook',
      },
      isCustomCover: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag indicating if this is a custom cover page',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when page was created',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when page was last updated',
      },
    });

    // Create indexes for performance
    await queryInterface.addIndex('pages', ['notebookId'], {
      name: 'idx_page_notebook',
    });

    await queryInterface.addIndex(
      'pages',
      ['notebookId', 'pageNumber'],
      {
        name: 'idx_page_number_notebook',
        unique: true,
      }
    );

    await queryInterface.addIndex('pages', ['createdAt'], {
      name: 'idx_page_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('pages', 'idx_page_created_at');
    await queryInterface.removeIndex('pages', 'idx_page_number_notebook');
    await queryInterface.removeIndex('pages', 'idx_page_notebook');

    // Then drop table
    await queryInterface.dropTable('pages');
  },
};
