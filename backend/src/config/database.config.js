/**
 * Database Configuration for Sequelize CLI
 *
 * This configuration file is used by Sequelize CLI for running migrations.
 * It exports a plain JavaScript object that matches Sequelize CLI expectations.
 *
 * Note: This is separate from database.ts which is used by the application runtime.
 */

require('dotenv').config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false,
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    timezone: '+00:00',
  },
  test: {
    url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    timezone: '+00:00',
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    timezone: '+00:00',
  },
};
