'use strict';

/**
 * Migration: Add stickerLibraryId foreign key to page_elements table
 *
 * Adds optional foreign key to user_stickers table to support sticker type elements
 * that reference saved stickers from user's personal sticker library.
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add stickerLibraryId column with foreign key constraint
    await queryInterface.addColumn('page_elements', 'stickerLibraryId', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'user_stickers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional foreign key to user_stickers (for sticker type elements)',
    });

    // Add index on stickerLibraryId for query performance
    await queryInterface.addIndex('page_elements', ['stickerLibraryId'], {
      name: 'idx_element_sticker',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('page_elements', 'idx_element_sticker');

    // Then remove column
    await queryInterface.removeColumn('page_elements', 'stickerLibraryId');
  },
};
