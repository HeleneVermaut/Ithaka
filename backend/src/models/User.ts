/**
 * User Model
 *
 * This module defines the User model for authentication and profile management.
 * The User model is the core entity for the authentication system and stores
 * all user-related information including credentials, profile data, and security tokens.
 *
 * Security considerations:
 * - Passwords are NEVER stored in plain text; only bcrypt hashes are saved
 * - Password reset tokens are hashed before storage
 * - Email addresses are unique and validated
 * - Soft delete is enabled via paranoid mode (deletedAt field)
 *
 * @module models/User
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Saved text element in user's library
 * Represents a frequently-used text configuration that can be reused across notebooks
 *
 * @interface SavedText
 */
export interface SavedText {
  /** Unique identifier (UUID) for this saved text */
  id: string;

  /** User-friendly label/name for this saved text (e.g., "Chapter Title", "Poem Title") */
  label: string;

  /** The text content (max 1000 characters) */
  content: string;

  /** Font size in pixels (8-200) */
  fontSize: number;

  /** Font family name (Google Font or system font) */
  fontFamily: string;

  /** Font weight: "normal", "bold", "600", "700" */
  fontWeight: string;

  /** Font style: "normal", "italic" */
  fontStyle: string;

  /** Text decoration: "none", "underline", "line-through" */
  textDecoration: string;

  /** HEX color code (e.g., "#000000") */
  color: string;

  /** Text alignment: "left", "center", "right" */
  textAlign: string;

  /** Line height multiplier (e.g., 1.5 for 1.5x spacing) */
  lineHeight: number;

  /** Optional category/tag (e.g., "title", "quote", "poem") */
  type?: string;

  /** Timestamp when this text was saved */
  createdAt: Date;

  /** Timestamp of last update */
  updatedAt: Date;
}

/**
 * Interface defining all fields in the User model
 * This represents the complete structure of a user record in the database
 *
 * @interface IUser
 */
export interface IUser {
  /** Unique identifier (UUID) */
  id: string;

  /** User's email address (unique, required for login) */
  email: string;

  /** Bcrypt hashed password (never store plain text!) */
  passwordHash: string;

  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /** Optional unique username/handle */
  pseudo?: string;

  /** Optional short bio/status message (max 160 characters) */
  bio?: string;

  /** Optional profile picture in base64 format */
  avatarBase64?: string;

  /** Whether the user has verified their email address */
  isEmailVerified: boolean;

  /** Hashed token for password reset (only set when reset requested) */
  passwordResetToken?: string;

  /** Expiration date for password reset token (typically 1 hour) */
  passwordResetExpiry?: Date;

  /** Timestamp of last successful login */
  lastLoginAt?: Date;

  /** Timestamp of last logout */
  lastLogoutAt?: Date;

  /** User's personal library of saved text elements for reuse across notebooks */
  savedTexts: SavedText[];

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;

  /** Timestamp when record was soft-deleted (paranoid mode) */
  deletedAt?: Date;
}

/**
 * Attributes required when creating a new user
 * Makes some fields optional that are auto-generated or have defaults
 */
export interface UserCreationAttributes
  extends Optional<
    IUser,
    | 'id'
    | 'pseudo'
    | 'bio'
    | 'avatarBase64'
    | 'isEmailVerified'
    | 'passwordResetToken'
    | 'passwordResetExpiry'
    | 'lastLoginAt'
    | 'lastLogoutAt'
    | 'savedTexts'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  > {}

/**
 * User Model Class
 *
 * Extends Sequelize Model to provide type-safe database operations.
 * This class represents the users table in PostgreSQL.
 *
 * @class User
 * @extends Model<IUser, UserCreationAttributes>
 */
export class User extends Model<IUser, UserCreationAttributes> implements IUser {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare firstName: string;
  declare lastName: string;
  declare pseudo?: string;
  declare bio?: string;
  declare avatarBase64?: string;
  declare isEmailVerified: boolean;
  declare passwordResetToken?: string;
  declare passwordResetExpiry?: Date;
  declare lastLoginAt?: Date;
  declare lastLogoutAt?: Date;
  declare savedTexts: SavedText[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly deletedAt?: Date;

  /**
   * Get user's full name
   * Convenience method to get formatted full name
   *
   * @returns {string} Full name (firstName + lastName)
   *
   * @example
   * const user = await User.findByPk(userId);
   * console.log(user.getFullName()); // "John Doe"
   */
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if password reset token is still valid
   * Verifies that token exists and hasn't expired
   *
   * @returns {boolean} True if token is valid and not expired
   *
   * @example
   * const user = await User.findOne({ where: { email } });
   * if (user.isPasswordResetTokenValid()) {
   *   // Allow password reset
   * }
   */
  public isPasswordResetTokenValid(): boolean {
    if (!this.passwordResetToken || !this.passwordResetExpiry) {
      return false;
    }
    return this.passwordResetExpiry > new Date();
  }

  /**
   * Convert user to safe JSON (without sensitive data)
   * Removes password hash and reset tokens before sending to client
   *
   * @returns {object} User object safe for API responses
   *
   * @example
   * const user = await User.findByPk(userId);
   * res.json({ user: user.toSafeJSON() });
   */
  public toSafeJSON(): object {
    const values = this.toJSON() as IUser;
    // Remove sensitive fields
    const {
      passwordHash,
      passwordResetToken,
      passwordResetExpiry,
      deletedAt,
      ...safeUser
    } = values;
    return safeUser;
  }
}

/**
 * Initialize User model with schema definition
 *
 * This configures the table structure, data types, validations, and indexes.
 */
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the user',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
        notEmpty: {
          msg: 'Email is required',
        },
      },
      comment: 'User email address (unique, used for login)',
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password hash is required',
        },
      },
      comment: 'Bcrypt hashed password',
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'First name is required',
        },
        len: {
          args: [2, 100],
          msg: 'First name must be between 2 and 100 characters',
        },
      },
      comment: 'User first name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Last name is required',
        },
        len: {
          args: [2, 100],
          msg: 'Last name must be between 2 and 100 characters',
        },
      },
      comment: 'User last name',
    },
    pseudo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      validate: {
        len: {
          args: [3, 50],
          msg: 'Pseudo must be between 3 and 50 characters',
        },
      },
      comment: 'Optional unique username',
    },
    bio: {
      type: DataTypes.STRING(160),
      allowNull: true,
      validate: {
        len: {
          args: [0, 160],
          msg: 'Bio must not exceed 160 characters',
        },
      },
      comment: 'Optional short bio or status message',
    },
    avatarBase64: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional profile picture in base64 format',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether user has verified their email',
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Hashed token for password reset',
    },
    passwordResetExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration timestamp for password reset token',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful login',
    },
    lastLogoutAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last logout',
    },
    savedTexts: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'User personal library of saved text elements for reuse across notebooks',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when user was created',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when user was last updated',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when user was soft-deleted',
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    paranoid: true, // Enable soft delete with deletedAt field
    underscored: true, // Use snake_case for automatically added fields
    indexes: [
      {
        unique: true,
        fields: ['email'],
        name: 'users_email_unique',
      },
      {
        unique: true,
        fields: ['pseudo'],
        where: { pseudo: { [Op.ne]: null } },
        name: 'users_pseudo_unique',
      },
      {
        fields: ['password_reset_expiry'],
        name: 'users_password_reset_expiry_idx',
      },
      {
        fields: ['created_at'],
        name: 'users_created_at_idx',
      },
      {
        fields: ['last_login_at'],
        name: 'users_last_login_at_idx',
      },
    ],
  }
);

/**
 * Define associations
 *
 * Note: Associations are defined in src/models/associations.ts to avoid circular dependencies.
 *
 * Relationships:
 * - User has many Notebooks (one user can own multiple notebooks)
 * - When a User is deleted, all their Notebooks are cascade deleted
 */

export default User;
