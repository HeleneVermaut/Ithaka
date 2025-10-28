/**
 * Composable pour les règles de validation Vuelidate
 *
 * Ce fichier centralise toutes les règles de validation réutilisables
 * pour les formulaires d'authentification et de profil de l'application Ithaka.
 *
 * Utilise @vuelidate/core et @vuelidate/validators.
 *
 * Règles disponibles :
 * - Email : format + unicité asynchrone
 * - Password : robustesse (8+ chars, majuscule, chiffre, spécial)
 * - Pseudo : format + unicité asynchrone
 * - Bio : longueur max
 * - Confirmation de champs (password, email)
 *
 * Convention de nommage :
 * - Règles : camelCase avec préfixe de type (ex: emailRules, passwordRules)
 * - Validators custom : verbe + nom (ex: isEmailUnique, hasUppercase)
 */

import { helpers, required, email, minLength, maxLength, sameAs } from '@vuelidate/validators'
import { useAuthStore } from '@/stores/auth'
import type { PasswordStrength, PasswordStrengthResult } from '@/types/models'

/**
 * Validator custom : Vérifie qu'un email est unique (async)
 *
 * Appelle l'API pour vérifier si l'email n'est pas déjà utilisé.
 * Cette validation est debouncée automatiquement par Vuelidate.
 *
 * @param email - Email à vérifier
 * @returns Promise<boolean> - true si l'email est unique
 *
 * @example
 * email: { required, email, isEmailUnique }
 */
export const isEmailUnique = helpers.withAsync(async (value: string) => {
  if (!value) return true // Si vide, on laisse 'required' gérer
  const authStore = useAuthStore()
  return await authStore.checkEmailUnique(value)
})

/**
 * Validator custom : Vérifie qu'un pseudo est unique (async)
 *
 * Appelle l'API pour vérifier si le pseudo n'est pas déjà utilisé.
 *
 * @param pseudo - Pseudo à vérifier
 * @returns Promise<boolean> - true si le pseudo est unique
 *
 * @example
 * pseudo: { minLength: minLength(3), isUnique: isPseudoUnique }
 */
export const isPseudoUnique = helpers.withAsync(async (value: string) => {
  if (!value) return true // Si vide, le pseudo est optionnel
  const authStore = useAuthStore()
  return await authStore.checkPseudoUnique(value)
})

/**
 * Validator custom : Vérifie qu'un mot de passe contient au moins une majuscule
 *
 * @param password - Mot de passe à vérifier
 * @returns boolean - true si contient une majuscule
 */
export const hasUppercase = helpers.regex(/[A-Z]/)

/**
 * Validator custom : Vérifie qu'un mot de passe contient au moins un chiffre
 *
 * @param password - Mot de passe à vérifier
 * @returns boolean - true si contient un chiffre
 */
export const hasNumber = helpers.regex(/[0-9]/)

/**
 * Validator custom : Vérifie qu'un mot de passe contient au moins un caractère spécial
 *
 * Caractères spéciaux acceptés : !@#$%^&*()_+-=[]{}|;:,.<>?
 *
 * @param password - Mot de passe à vérifier
 * @returns boolean - true si contient un caractère spécial
 */
export const hasSpecialChar = helpers.regex(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/)

/**
 * Validator custom : Vérifie qu'un pseudo ne contient que des caractères alphanumériques et underscore
 *
 * Format accepté : lettres (a-z, A-Z), chiffres (0-9), underscore (_)
 *
 * @param pseudo - Pseudo à vérifier
 * @returns boolean - true si format valide
 */
export const isAlphanumericWithUnderscore = helpers.regex(/^[a-zA-Z0-9_]+$/)

/**
 * Règles de validation pour l'email (inscription, login, profil)
 *
 * - Requis
 * - Format email valide
 * - Unicité (asynchrone, seulement pour inscription/modification)
 *
 * @param checkUnique - Si true, vérifie l'unicité de l'email (async)
 * @returns Objet de règles Vuelidate
 *
 * @example
 * const rules = {
 *   email: emailRules(true) // Avec vérification d'unicité
 * }
 */
export const emailRules = (checkUnique: boolean = false) => {
  const rules: Record<string, unknown> = {
    required: helpers.withMessage("L'email est requis", required),
    email: helpers.withMessage("L'email n'est pas valide", email)
  }

  if (checkUnique) {
    rules.isUnique = helpers.withMessage(
      'Cet email est déjà utilisé',
      isEmailUnique
    )
  }

  return rules
}

/**
 * Règles de validation pour le mot de passe
 *
 * - Requis
 * - Minimum 8 caractères
 * - Au moins une majuscule
 * - Au moins un chiffre
 * - Au moins un caractère spécial
 *
 * @returns Objet de règles Vuelidate
 *
 * @example
 * const rules = {
 *   password: passwordRules
 * }
 */
export const passwordRules = {
  required: helpers.withMessage('Le mot de passe est requis', required),
  minLength: helpers.withMessage(
    'Le mot de passe doit contenir au moins 8 caractères',
    minLength(8)
  ),
  hasUppercase: helpers.withMessage(
    'Le mot de passe doit contenir au moins une majuscule',
    hasUppercase
  ),
  hasNumber: helpers.withMessage(
    'Le mot de passe doit contenir au moins un chiffre',
    hasNumber
  ),
  hasSpecialChar: helpers.withMessage(
    'Le mot de passe doit contenir au moins un caractère spécial (!@#$%...)',
    hasSpecialChar
  )
}

/**
 * Règles de validation pour la confirmation de mot de passe
 *
 * - Requis
 * - Doit être identique au mot de passe
 *
 * @param passwordFieldName - Nom du champ mot de passe à comparer
 * @returns Objet de règles Vuelidate
 *
 * @example
 * const formData = reactive({ password: '', confirmPassword: '' })
 * const rules = {
 *   password: passwordRules,
 *   confirmPassword: confirmPasswordRules('password')
 * }
 */
export const confirmPasswordRules = (passwordFieldName: string) => ({
  required: helpers.withMessage('La confirmation est requise', required),
  sameAs: helpers.withMessage(
    'Les mots de passe ne correspondent pas',
    sameAs(passwordFieldName)
  )
})

/**
 * Règles de validation pour le prénom
 *
 * - Requis
 * - Minimum 2 caractères
 * - Maximum 50 caractères
 *
 * @returns Objet de règles Vuelidate
 */
export const firstNameRules = {
  required: helpers.withMessage('Le prénom est requis', required),
  minLength: helpers.withMessage(
    'Le prénom doit contenir au moins 2 caractères',
    minLength(2)
  ),
  maxLength: helpers.withMessage(
    'Le prénom ne peut pas dépasser 50 caractères',
    maxLength(50)
  )
}

/**
 * Règles de validation pour le nom de famille
 *
 * - Requis
 * - Minimum 2 caractères
 * - Maximum 50 caractères
 *
 * @returns Objet de règles Vuelidate
 */
export const lastNameRules = {
  required: helpers.withMessage('Le nom est requis', required),
  minLength: helpers.withMessage(
    'Le nom doit contenir au moins 2 caractères',
    minLength(2)
  ),
  maxLength: helpers.withMessage(
    'Le nom ne peut pas dépasser 50 caractères',
    maxLength(50)
  )
}

/**
 * Règles de validation pour le pseudo (optionnel)
 *
 * - Minimum 3 caractères si fourni
 * - Maximum 20 caractères
 * - Format alphanumérique avec underscore
 * - Unicité (asynchrone, seulement pour inscription/modification)
 *
 * @param checkUnique - Si true, vérifie l'unicité du pseudo (async)
 * @returns Objet de règles Vuelidate
 *
 * @example
 * const rules = {
 *   pseudo: pseudoRules(true) // Avec vérification d'unicité
 * }
 */
export const pseudoRules = (checkUnique: boolean = false) => {
  const rules: Record<string, unknown> = {
    minLength: helpers.withMessage(
      'Le pseudo doit contenir au moins 3 caractères',
      minLength(3)
    ),
    maxLength: helpers.withMessage(
      'Le pseudo ne peut pas dépasser 20 caractères',
      maxLength(20)
    ),
    isAlphanumeric: helpers.withMessage(
      'Le pseudo ne peut contenir que des lettres, chiffres et underscores',
      isAlphanumericWithUnderscore
    )
  }

  if (checkUnique) {
    rules.isUnique = helpers.withMessage(
      'Ce pseudo est déjà utilisé',
      isPseudoUnique
    )
  }

  return rules
}

/**
 * Règles de validation pour la biographie (optionnelle)
 *
 * - Maximum 160 caractères (comme Twitter)
 *
 * @returns Objet de règles Vuelidate
 */
export const bioRules = {
  maxLength: helpers.withMessage(
    'La biographie ne peut pas dépasser 160 caractères',
    maxLength(160)
  )
}

/**
 * Fonction utilitaire : Calcule la robustesse d'un mot de passe
 *
 * Critères de robustesse :
 * - Longueur (8-11: +20, 12-15: +30, 16+: +40)
 * - Majuscule (+15)
 * - Minuscule (+15)
 * - Chiffre (+15)
 * - Caractère spécial (+15)
 *
 * Niveaux :
 * - 0-30: weak (faible)
 * - 31-60: medium (moyen)
 * - 61-85: strong (fort)
 * - 86-100: very-strong (très fort)
 *
 * @param password - Mot de passe à analyser
 * @returns Résultat avec niveau, score et suggestions
 *
 * @example
 * const result = calculatePasswordStrength('MyPass123!')
 * console.log(result.strength) // "strong"
 * console.log(result.score) // 85
 * console.log(result.suggestions) // []
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0
  const suggestions: string[] = []

  // Vérification longueur
  if (password.length >= 8 && password.length <= 11) {
    score += 20
  } else if (password.length >= 12 && password.length <= 15) {
    score += 30
  } else if (password.length >= 16) {
    score += 40
  } else {
    suggestions.push('Utilisez au moins 8 caractères')
  }

  // Vérification majuscule
  if (/[A-Z]/.test(password)) {
    score += 15
  } else {
    suggestions.push('Ajoutez une majuscule')
  }

  // Vérification minuscule
  if (/[a-z]/.test(password)) {
    score += 15
  } else {
    suggestions.push('Ajoutez une minuscule')
  }

  // Vérification chiffre
  if (/[0-9]/.test(password)) {
    score += 15
  } else {
    suggestions.push('Ajoutez un chiffre')
  }

  // Vérification caractère spécial
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    score += 15
  } else {
    suggestions.push('Ajoutez un caractère spécial (!@#$%...)')
  }

  // Détermination du niveau
  let strength: PasswordStrength
  if (score <= 30) {
    strength = 'weak'
  } else if (score <= 60) {
    strength = 'medium'
  } else if (score <= 85) {
    strength = 'strong'
  } else {
    strength = 'very-strong'
  }

  return {
    strength,
    score,
    suggestions
  }
}

/**
 * Fonction utilitaire : Convertit un fichier image en base64
 *
 * Lit un fichier File (depuis input type="file") et le convertit
 * en une chaîne base64 (data:image/jpeg;base64,...).
 *
 * Utilisé pour l'upload de photo de profil.
 *
 * @param file - Fichier image (JPEG, PNG)
 * @returns Promise<string> - Chaîne base64 de l'image
 *
 * @throws Error si la lecture échoue
 *
 * @example
 * const file = event.target.files[0]
 * const base64 = await convertFileToBase64(file)
 * formData.avatarBase64 = base64
 */
export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      // Le résultat est déjà au format data:image/...;base64,...
      resolve(reader.result as string)
    }

    reader.onerror = () => {
      reject(new Error("Erreur lors de la lecture du fichier"))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Fonction utilitaire : Valide la taille et le format d'une image
 *
 * Vérifie que le fichier :
 * - Est une image JPEG ou PNG
 * - Ne dépasse pas 2MB (2 097 152 bytes)
 *
 * @param file - Fichier à valider
 * @returns { valid: boolean, error?: string }
 *
 * @example
 * const file = event.target.files[0]
 * const validation = validateImageFile(file)
 * if (!validation.valid) {
 *   console.error(validation.error)
 * }
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSizeBytes = 2 * 1024 * 1024 // 2MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']

  // Vérification du type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non supporté. Utilisez JPEG ou PNG.'
    }
  }

  // Vérification de la taille
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: 'Image trop grande. Maximum 2MB.'
    }
  }

  return { valid: true }
}

/**
 * SECTION: Validations pour les éléments texte
 * ===============================================
 *
 * Fonctions de validation pour l'édition de texte dans le canvas
 * Utilisées par le composant TextPanel et les validations en temps réel
 */

/**
 * Résultat de validation pour les textes
 */
export interface TextValidationResult {
  valid: boolean
  error?: string
}

/**
 * Valide le contenu textuel
 *
 * Règles:
 * - Texte non vide requis (au moins 1 caractère non-espace)
 * - Maximum 1000 caractères
 *
 * @param text - Le texte à valider
 * @returns Résultat de validation avec message d'erreur si invalide
 *
 * @example
 * const result = validateTextContent('Hello World')
 * if (result.valid) {
 *   console.log('Texte accepté')
 * } else {
 *   console.error(result.error)
 * }
 */
export function validateTextContent(text: string): TextValidationResult {
  // Vérifier que le texte n'est pas vide (ou seulement des espaces)
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: 'Le texte ne peut pas être vide'
    }
  }

  // Vérifier la longueur maximale
  if (text.length > 1000) {
    return {
      valid: false,
      error: `Le texte dépasse la limite de 1000 caractères (${text.length}/1000)`
    }
  }

  // Le texte est valide
  return {
    valid: true
  }
}

/**
 * Valide la taille de police
 *
 * Règles:
 * - Doit être un nombre
 * - Minimum 8px
 * - Maximum 200px
 *
 * @param size - La taille de police en pixels (nombre ou chaîne convertible)
 * @returns Résultat de validation avec message d'erreur si invalide
 *
 * @example
 * const result = validateFontSize(16)
 * if (result.valid) {
 *   console.log('Taille acceptée')
 * }
 */
export function validateFontSize(size: number | string): TextValidationResult {
  // Convertir en nombre si c'est une chaîne
  const numSize = typeof size === 'string' ? parseFloat(size) : size

  // Vérifier que c'est un nombre valide
  if (isNaN(numSize)) {
    return {
      valid: false,
      error: 'La taille doit être un nombre valide'
    }
  }

  // Vérifier le minimum
  if (numSize < 8) {
    return {
      valid: false,
      error: 'La taille minimale est 8px'
    }
  }

  // Vérifier le maximum
  if (numSize > 200) {
    return {
      valid: false,
      error: 'La taille maximale est 200px'
    }
  }

  // La taille est valide
  return {
    valid: true
  }
}

/**
 * Valide une couleur au format HEX
 *
 * Formats acceptés:
 * - #RGB (ex: #F00)
 * - #RRGGBB (ex: #FF0000)
 * - #RRGGBBAA (ex: #FF0000FF) - avec alpha
 *
 * Règles:
 * - Doit commencer par #
 * - Doit contenir 3, 6 ou 8 caractères hexadécimaux après le #
 *
 * @param color - La couleur au format HEX
 * @returns Résultat de validation avec message d'erreur si invalide
 *
 * @example
 * const result = validateColorHex('#FF0000')
 * if (result.valid) {
 *   console.log('Couleur acceptée')
 * }
 */
export function validateColorHex(color: string): TextValidationResult {
  // Vérifier que la couleur n'est pas vide
  if (!color || color.trim().length === 0) {
    return {
      valid: false,
      error: 'La couleur ne peut pas être vide'
    }
  }

  // Vérifier le format HEX complet (#RGB, #RRGGBB, ou #RRGGBBAA)
  const hexRegex = /^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/i

  if (!hexRegex.test(color)) {
    return {
      valid: false,
      error:
        'La couleur doit être au format HEX valide (#RGB, #RRGGBB, ou #RRGGBBAA). Exemple: #FF0000'
    }
  }

  // La couleur est valide
  return {
    valid: true
  }
}

/**
 * Valide tous les paramètres d'un élément texte en une seule fonction
 *
 * @param params - Objet contenant text, fontSize, color
 * @returns Objet avec chaque champ validé individuellement
 *
 * @example
 * const validation = validateTextElement({
 *   text: 'Hello',
 *   fontSize: 16,
 *   color: '#FF0000'
 * })
 * if (validation.text.valid && validation.fontSize.valid && validation.color.valid) {
 *   console.log('Tous les champs sont valides')
 * }
 */
export function validateTextElement(params: {
  text: string
  fontSize: number | string
  color: string
}): Record<string, TextValidationResult> {
  return {
    text: validateTextContent(params.text),
    fontSize: validateFontSize(params.fontSize),
    color: validateColorHex(params.color)
  }
}

/**
 * Vérifie si un objet de validation est complètement valide
 * (tous les champs doivent avoir valid: true)
 *
 * @param validationResults - Objet contenant les résultats de validation
 * @returns true si tous les champs sont valides
 *
 * @example
 * const validation = validateTextElement({...})
 * if (isAllTextValidationValid(validation)) {
 *   // Procéder à la création du texte
 * }
 */
export function isAllTextValidationValid(
  validationResults: Record<string, TextValidationResult>
): boolean {
  return Object.values(validationResults).every((result) => result.valid)
}

/**
 * Extrait tous les messages d'erreur d'un objet de validation texte
 *
 * @param validationResults - Objet contenant les résultats de validation
 * @returns Tableau des messages d'erreur
 *
 * @example
 * const errors = getTextValidationErrors(validation)
 * errors.forEach(error => console.error(error))
 */
export function getTextValidationErrors(
  validationResults: Record<string, TextValidationResult>
): string[] {
  return Object.values(validationResults)
    .filter((result) => !result.valid && result.error)
    .map((result) => result.error as string)
}
