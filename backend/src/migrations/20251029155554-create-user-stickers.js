'use strict';

/**
 * Migration: Create user_stickers table
 *
 * Creates the user_stickers table to store user's personal sticker collections.
 * Each sticker is a saved image asset that can be reused across multiple pages.
 * Supports Cloudinary integration for cloud storage and delivery.
 * Paranoid mode enabled for soft delete recovery capability.
 *
 * @param {QueryInterface} queryInterface - Sequelize query interface
 * @param {Sequelize} Sequelize - Sequelize instance with DataTypes
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_stickers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the user sticker',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to user who owns this sticker',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'User-friendly name for this sticker',
      },
      cloudinary_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Public URL from Cloudinary for displaying the sticker',
      },
      cloudinary_public_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Cloudinary public ID (unique per user, format: /users/:userId/stickers/:id)',
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: '',
        comment: 'Thumbnail URL from Cloudinary (w_100,h_100,c_fit) for preview in library',
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of tags for organizing and searching stickers',
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this sticker is publicly visible (for future marketplace)',
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Counter for tracking sticker usage across pages (analytics)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when sticker was created',
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when sticker was last updated',
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp when sticker was soft-deleted (paranoid mode)',
      },
    });

    // Create indexes for performance
    await queryInterface.addIndex('user_stickers', ['user_id'], {
      name: 'idx_sticker_user',
    });

    await queryInterface.addIndex('user_stickers', ['is_public'], {
      name: 'idx_sticker_public',
    });

    await queryInterface.addIndex('user_stickers', ['user_id', 'name'], {
      name: 'idx_sticker_user_name',
    });

    await queryInterface.addIndex('user_stickers', ['user_id', 'cloudinary_public_id'], {
      unique: true,
      name: 'idx_sticker_user_cloudinary_unique',
    });

    await queryInterface.addIndex('user_stickers', ['created_at'], {
      name: 'idx_sticker_created_at',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('user_stickers', 'idx_sticker_created_at');
    await queryInterface.removeIndex('user_stickers', 'idx_sticker_user_cloudinary_unique');
    await queryInterface.removeIndex('user_stickers', 'idx_sticker_user_name');
    await queryInterface.removeIndex('user_stickers', 'idx_sticker_public');
    await queryInterface.removeIndex('user_stickers', 'idx_sticker_user');

    // Then drop table
    await queryInterface.dropTable('user_stickers');
  },
};
