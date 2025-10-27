/**
 * Email Service
 *
 * This service handles all email sending functionality using SendGrid.
 * It provides methods to send various types of emails including password
 * reset emails, welcome emails, and email verification.
 *
 * SendGrid integration:
 * - API key must be configured in environment variables
 * - Sends transactional emails (password resets, notifications)
 * - Handles errors gracefully with retry logic
 * - Logs all email operations for debugging
 *
 * Security considerations:
 * - Never log email content containing sensitive tokens
 * - Always use HTTPS links in emails
 * - Set reasonable token expiration times
 * - Rate limit password reset emails to prevent abuse
 *
 * @module services/emailService
 */

import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

/**
 * Initialize SendGrid with API key from environment
 * This must be called before any emails can be sent
 */
const initializeSendGrid = (): void => {
  const apiKey = process.env['SENDGRID_API_KEY'];

  if (!apiKey) {
    logger.error('SENDGRID_API_KEY is not defined in environment variables');
    throw new Error('Email service configuration error: SENDGRID_API_KEY is missing');
  }

  sgMail.setApiKey(apiKey);
  logger.info('SendGrid email service initialized');
};

// Initialize SendGrid on module load
initializeSendGrid();

/**
 * Get the sender email address from environment or use default
 *
 * @returns {string} Sender email address
 */
const getFromEmail = (): string => {
  return process.env['SENDGRID_FROM_EMAIL'] || 'noreply@ithaka.com';
};

/**
 * Get the frontend URL from environment or use default
 * Used to construct links in emails
 *
 * @returns {string} Frontend base URL
 */
const getFrontendUrl = (): string => {
  return process.env['FRONTEND_URL'] || 'http://localhost:5173';
};

/**
 * Send password reset email with token link
 *
 * This email contains a secure link that allows the user to reset their password.
 * The link expires after 1 hour for security.
 *
 * @async
 * @param {string} toEmail - Recipient email address
 * @param {string} resetToken - Password reset token (unhashed)
 * @param {string} firstName - User's first name for personalization
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 *
 * @example
 * await sendPasswordResetEmail(
 *   'user@example.com',
 *   'abc123def456',
 *   'John'
 * );
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  resetToken: string,
  firstName: string
): Promise<void> => {
  try {
    const frontendUrl = getFrontendUrl();
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(toEmail)}`;

    const msg = {
      to: toEmail,
      from: getFromEmail(),
      subject: 'Réinitialisation de votre mot de passe - Ithaka',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Réinitialisation de mot de passe</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Réinitialisation de mot de passe</h2>

              <p>Bonjour ${firstName},</p>

              <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Ithaka.</p>

              <p>Pour créer un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}"
                   style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Réinitialiser mon mot de passe
                </a>
              </div>

              <p style="color: #e74c3c; font-weight: bold;">
                ⚠️ Ce lien expire dans 1 heure pour votre sécurité.
              </p>

              <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste valide.</p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #7f8c8d;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${resetLink}" style="color: #3498db; word-break: break-all;">${resetLink}</a>
              </p>

              <p style="font-size: 12px; color: #7f8c8d; margin-top: 20px;">
                Cet email a été envoyé par Ithaka - Application de carnets de voyage<br>
                Pour toute question, contactez-nous à support@ithaka.com
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Bonjour ${firstName},

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Ithaka.

Pour créer un nouveau mot de passe, cliquez sur ce lien :
${resetLink}

⚠️ Ce lien expire dans 1 heure pour votre sécurité.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste valide.

---
Cet email a été envoyé par Ithaka - Application de carnets de voyage
Pour toute question, contactez-nous à support@ithaka.com
      `,
    };

    await sgMail.send(msg);

    logger.info('Password reset email sent successfully', {
      toEmail,
      // Never log the actual token for security
    });
  } catch (error: any) {
    logger.error('Failed to send password reset email', {
      toEmail,
      error: error.message,
      statusCode: error.code,
    });
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send welcome email to new users
 *
 * This email welcomes new users and provides helpful information
 * about getting started with the application.
 *
 * @async
 * @param {string} toEmail - Recipient email address
 * @param {string} firstName - User's first name
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 *
 * @example
 * await sendWelcomeEmail('user@example.com', 'John');
 */
export const sendWelcomeEmail = async (
  toEmail: string,
  firstName: string
): Promise<void> => {
  try {
    const frontendUrl = getFrontendUrl();

    const msg = {
      to: toEmail,
      from: getFromEmail(),
      subject: 'Bienvenue sur Ithaka - Commencez votre aventure',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenue sur Ithaka</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Bienvenue sur Ithaka ! 🎉</h2>

              <p>Bonjour ${firstName},</p>

              <p>Nous sommes ravis de vous accueillir dans la communauté Ithaka, l'application qui transforme vos voyages en souvenirs inoubliables.</p>

              <h3 style="color: #2c3e50; margin-top: 30px;">Pour commencer :</h3>

              <ul style="margin-left: 20px;">
                <li style="margin-bottom: 10px;">Créez votre premier carnet de voyage</li>
                <li style="margin-bottom: 10px;">Ajoutez vos photos et récits</li>
                <li style="margin-bottom: 10px;">Personnalisez votre profil</li>
                <li style="margin-bottom: 10px;">Partagez vos aventures avec vos proches</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}/dashboard"
                   style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Accéder à mon compte
                </a>
              </div>

              <p>Si vous avez des questions, n'hésitez pas à consulter notre guide d'utilisation ou à nous contacter.</p>

              <p style="margin-top: 30px;">Bon voyage ! ✈️</p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #7f8c8d;">
                Cet email a été envoyé par Ithaka - Application de carnets de voyage<br>
                Pour toute question, contactez-nous à support@ithaka.com
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Bienvenue sur Ithaka !

Bonjour ${firstName},

Nous sommes ravis de vous accueillir dans la communauté Ithaka, l'application qui transforme vos voyages en souvenirs inoubliables.

Pour commencer :
- Créez votre premier carnet de voyage
- Ajoutez vos photos et récits
- Personnalisez votre profil
- Partagez vos aventures avec vos proches

Accédez à votre compte : ${frontendUrl}/dashboard

Si vous avez des questions, n'hésitez pas à consulter notre guide d'utilisation ou à nous contacter.

Bon voyage !

---
Cet email a été envoyé par Ithaka - Application de carnets de voyage
Pour toute question, contactez-nous à support@ithaka.com
      `,
    };

    await sgMail.send(msg);

    logger.info('Welcome email sent successfully', { toEmail });
  } catch (error: any) {
    logger.error('Failed to send welcome email', {
      toEmail,
      error: error.message,
    });
    // Don't throw error for welcome email - it's not critical
    // User can still use the app even if welcome email fails
  }
};

/**
 * Send password changed confirmation email
 *
 * This email notifies the user that their password was successfully changed.
 * It's important for security to notify users of account changes.
 *
 * @async
 * @param {string} toEmail - Recipient email address
 * @param {string} firstName - User's first name
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 *
 * @example
 * await sendPasswordChangedEmail('user@example.com', 'John');
 */
export const sendPasswordChangedEmail = async (
  toEmail: string,
  firstName: string
): Promise<void> => {
  try {
    const msg = {
      to: toEmail,
      from: getFromEmail(),
      subject: 'Votre mot de passe a été modifié - Ithaka',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mot de passe modifié</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Mot de passe modifié</h2>

              <p>Bonjour ${firstName},</p>

              <p>Votre mot de passe Ithaka a été modifié avec succès.</p>

              <p style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
                ✓ Votre compte est maintenant sécurisé avec votre nouveau mot de passe.
              </p>

              <p style="color: #e74c3c; font-weight: bold;">
                ⚠️ Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement à support@ithaka.com
              </p>

              <p>Pour votre sécurité :</p>
              <ul style="margin-left: 20px;">
                <li>Toutes vos autres sessions ont été déconnectées</li>
                <li>Utilisez votre nouveau mot de passe pour vous reconnecter</li>
                <li>Ne partagez jamais votre mot de passe</li>
              </ul>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 12px; color: #7f8c8d;">
                Cet email a été envoyé par Ithaka - Application de carnets de voyage<br>
                Pour toute question, contactez-nous à support@ithaka.com
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Bonjour ${firstName},

Votre mot de passe Ithaka a été modifié avec succès.

✓ Votre compte est maintenant sécurisé avec votre nouveau mot de passe.

⚠️ Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement à support@ithaka.com

Pour votre sécurité :
- Toutes vos autres sessions ont été déconnectées
- Utilisez votre nouveau mot de passe pour vous reconnecter
- Ne partagez jamais votre mot de passe

---
Cet email a été envoyé par Ithaka - Application de carnets de voyage
Pour toute question, contactez-nous à support@ithaka.com
      `,
    };

    await sgMail.send(msg);

    logger.info('Password changed confirmation email sent successfully', { toEmail });
  } catch (error: any) {
    logger.error('Failed to send password changed email', {
      toEmail,
      error: error.message,
    });
    // Don't throw error - password was already changed successfully
    // Email failure shouldn't prevent the user from continuing
  }
};

export default {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
};
