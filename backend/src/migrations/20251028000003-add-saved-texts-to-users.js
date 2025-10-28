'use strict';

/**
 * Migration: Add savedTexts JSON column to users table
 *
 * This migration adds a new JSON column to store user's personal library of saved text elements.
 * The savedTexts column is initialized as an empty array for all existing users.
 *
 * @param {object} queryInterface - Sequelize QueryInterface for database operations
 * @param {object} Sequelize - Sequelize DataTypes
 */
module.exports = {
  /**
   * UP: Add savedTexts column to users table
   * @param {object} queryInterface - Sequelize QueryInterface
   * @param {object} Sequelize - Sequelize DataTypes
   * @returns {Promise<void>}
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'saved_texts', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'User personal library of saved text elements for reuse across notebooks',
    });
  },

  /**
   * DOWN: Remove savedTexts column from users table
   * @param {object} queryInterface - Sequelize QueryInterface
   * @param {object} Sequelize - Sequelize DataTypes
   * @returns {Promise<void>}
   */
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'saved_texts');
  },
};
