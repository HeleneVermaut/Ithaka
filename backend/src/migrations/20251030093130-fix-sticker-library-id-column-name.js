'use strict';

/**
 * Migration: Fix stickerLibraryId column naming convention
 *
 * The column was originally created as 'stickerLibraryId' (camelCase) but
 * Sequelize expects 'sticker_library_id' (snake_case) due to underscored: true setting.
 *
 * This migration:
 * 1. Renames the column from 'stickerLibraryId' to 'sticker_library_id'
 * 2. Drops and recreates the index with the correct column name
 * 3. Drops and recreates the foreign key constraint with the correct column name
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Remove the existing index on the old column name
    await queryInterface.removeIndex('page_elements', 'idx_element_sticker');

    // Step 2: Remove the foreign key constraint (if it exists)
    // We need to find the constraint name first
    await queryInterface.sequelize.query(`
      ALTER TABLE page_elements
      DROP CONSTRAINT IF EXISTS page_elements_stickerLibraryId_fkey;
    `);

    // Step 3: Rename the column from camelCase to snake_case
    await queryInterface.renameColumn(
      'page_elements',
      'stickerLibraryId',
      'sticker_library_id'
    );

    // Step 4: Re-add the foreign key constraint with the new column name
    await queryInterface.addConstraint('page_elements', {
      fields: ['sticker_library_id'],
      type: 'foreign key',
      name: 'fk_page_elements_sticker_library_id',
      references: {
        table: 'user_stickers',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Step 5: Re-add the index with the new column name
    await queryInterface.addIndex('page_elements', ['sticker_library_id'], {
      name: 'idx_element_sticker',
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse the changes if we need to rollback

    // Step 1: Remove the index
    await queryInterface.removeIndex('page_elements', 'idx_element_sticker');

    // Step 2: Remove the new foreign key constraint
    await queryInterface.removeConstraint(
      'page_elements',
      'fk_page_elements_sticker_library_id'
    );

    // Step 3: Rename column back to camelCase
    await queryInterface.renameColumn(
      'page_elements',
      'sticker_library_id',
      'stickerLibraryId'
    );

    // Step 4: Re-add the original foreign key constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE page_elements
      ADD CONSTRAINT page_elements_stickerLibraryId_fkey
      FOREIGN KEY ("stickerLibraryId")
      REFERENCES user_stickers(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
    `);

    // Step 5: Re-add the index with the old column name
    await queryInterface.addIndex('page_elements', ['stickerLibraryId'], {
      name: 'idx_element_sticker',
    });
  },
};
