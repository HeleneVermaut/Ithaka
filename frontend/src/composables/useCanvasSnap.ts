/**
 * Composable pour la détection d'alignement et le snapping magnétique (US04-TASK26)
 *
 * Ce composable fournit un système de snapping magnétique pour les éléments de canvas.
 * Il détecte automatiquement quand un élément en déplacement s'aligne avec d'autres éléments
 * et affiche des guides visuels pour aider l'utilisateur à positionner les éléments avec précision.
 *
 * Caractéristiques principales :
 * - Détection d'alignement automatique (bords gauche/droit, haut/bas, centres)
 * - Affichage de guides visuels (lignes horizontales/verticales)
 * - Seuil de snap configurable (défaut: 10px)
 * - Calcul des points de snap depuis tous les éléments du canvas
 * - Performance optimisée avec cache et debounce
 * - Support des snaps simultanés (horizontal + vertical)
 *
 * Utilisation dans les composants :
 * ```typescript
 * import { useCanvasSnap } from '@/composables/useCanvasSnap'
 * import type { IPageElement } from '@/types/models'
 *
 * const {
 *   detectAlignment,
 *   applySnap,
 *   getSnapGuides,
 *   clearSnapGuides,
 *   shouldSnap
 * } = useCanvasSnap()
 *
 * // Pendant le drag
 * const elementRect = element.getBoundingClientRect()
 * const allElements = pageElementsStore.elements
 *
 * const alignment = detectAlignment(elementRect, allElements)
 * if (alignment && shouldSnap(alignment.distance)) {
 *   const snappedPos = applySnap({ x: newX, y: newY }, alignment)
 * }
 * ```
 *
 * @module composables/useCanvasSnap
 */

import { ref, computed, type ComputedRef } from 'vue'
import type { IPageElement } from '@/types/pageElement'

/**
 * Type d'alignement pour le snapping
 * - 'left' : alignement des bords gauches
 * - 'right' : alignement des bords droits
 * - 'top' : alignement des bords supérieurs
 * - 'bottom' : alignement des bords inférieurs
 * - 'center-x' : alignement des centres horizontaux
 * - 'center-y' : alignement des centres verticaux
 */
type SnapType = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y'

/**
 * Représente un point d'alignement possible dans le canvas
 *
 * Les points de snap sont calculés à partir des propriétés des éléments existants.
 * Pour chaque élément, on génère plusieurs points de snap :
 * - left, right : positions du bord gauche/droit
 * - top, bottom : positions du bord supérieur/inférieur
 * - center-x, center-y : positions du centre de l'élément
 *
 * @interface SnapPoint
 */
interface SnapPoint {
  /** Type d'alignement (left, right, top, bottom, center-x, center-y) */
  type: SnapType

  /** Valeur de la position (en pixels) */
  value: number

  /** ID de l'élément source du point de snap (optionnel) */
  elementId?: string
}

/**
 * Représente un alignement détecté entre l'élément en déplacement et d'autres éléments
 *
 * Quand la distance à un point de snap est inférieure au seuil (10px),
 * cette interface capture l'alignement détecté et la correction à appliquer.
 *
 * @interface Alignment
 */
interface Alignment {
  /** Type d'alignement détecté (left, right, top, bottom, center-x, center-y) */
  type: SnapType

  /** Position X corrigée en pixels (si alignement horizontal) */
  correctedX?: number

  /** Position Y corrigée en pixels (si alignement vertical) */
  correctedY?: number

  /** Distance en pixels jusqu'au point d'alignement */
  distance: number

  /** Valeur du point d'snap (pour débogage et visualisation) */
  snapValue: number
}

/**
 * Représente une ligne de guide visuelle affichée pendant le snapping
 *
 * Les guides sont des lignes horizontales ou verticales qui aident l'utilisateur
 * à visualiser l'alignement en cours. Elles sont rendues par le composant parent.
 *
 * @interface SnapGuide
 */
interface SnapGuide {
  /** Type de guide : horizontal ou vertical */
  type: 'horizontal' | 'vertical'

  /** Position de la ligne (x pour vertical, y pour horizontal) */
  position: number

  /** Indique si le guide est actuellement visible */
  visible: boolean

  /** ID de l'élément source pour identification */
  elementId?: string
}

/**
 * Résultat du calcul de snap avec les corrections X et Y
 *
 * Quand plusieurs alignements sont détectés (horizontal et vertical),
 * cette interface capture les deux corrections simultanément.
 *
 * @interface SnapResult
 */
interface SnapResult {
  /** Nouvelle position X (si correction horizontale appliquée) */
  x?: number

  /** Nouvelle position Y (si correction verticale appliquée) */
  y?: number

  /** Alignement horizontal détecté (si applicable) */
  horizontalAlignment?: Alignment

  /** Alignement vertical détecté (si applicable) */
  verticalAlignment?: Alignment
}

/**
 * Configuration du seuil de snap (en pixels)
 *
 * Quand la distance entre l'élément et un point d'alignement est inférieure
 * à cette valeur, le snapping est déclenché automatiquement.
 */
const SNAP_THRESHOLD_PX = 10

/**
 * Configuration du délai de debounce pour la détection de snap (en millisecondes)
 *
 * Réduit le nombre de calculs lors du drag rapide en attendant que le mouvement
 * se stabilise avant de recalculer les alignements.
 */
const SNAP_DEBOUNCE_MS = 50

/**
 * Facteur de conversion millimètres → pixels
 *
 * Le backend stocke les positions en millimètres, le frontend affiche en pixels.
 * Ratio : 1mm = 3.7795275591 px (à 96 DPI)
 */
const MM_TO_PX = 3.7795275591

/**
 * Composable useCanvasSnap - Gestion du snapping magnétique pour le canvas
 *
 * Fournit toutes les fonctionnalités nécessaires pour détecter les alignements,
 * afficher les guides visuels, et corriger les positions des éléments.
 *
 * @returns Objet contenant toutes les fonctions et références réactives du composable
 *
 * @example
 * ```typescript
 * import { useCanvasSnap } from '@/composables/useCanvasSnap'
 *
 * const {
 *   calculateSnapPoints,
 *   detectAlignment,
 *   applySnap,
 *   getSnapGuides,
 *   clearSnapGuides,
 *   shouldSnap
 * } = useCanvasSnap()
 *
 * // Utiliser pendant le drag d'un élément
 * const snapGuides = getSnapGuides()
 * ```
 */
export const useCanvasSnap = () => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  /**
   * Cache des points de snap calculés
   *
   * Stocke le résultat du dernier calcul de points de snap pour éviter
   * de recalculer à chaque détection d'alignement. Invalidé quand les
   * éléments de la page changent.
   */
  const snapPointsCache = ref<SnapPoint[] | null>(null)

  /**
   * ID des éléments pour lesquels le cache a été calculé
   *
   * Utilisé pour détecter quand la liste des éléments a changé
   * et invalider le cache.
   */
  const cachedElementIds = ref<Set<string>>(new Set())

  /**
   * Guides visuels actuellement affichés
   *
   * Liste des lignes de guide (horizontales et verticales) à afficher
   * pour aider l'utilisateur à voir les alignements détectés.
   */
  const snapGuidesState = ref<SnapGuide[]>([])

  /**
   * Timer pour le debounce de la détection de snap
   *
   * Permet d'attendre 50ms après un mouvement avant de recalculer
   * les alignements, pour améliorer la performance.
   */
  let snapDebounceTimer: NodeJS.Timeout | null = null

  // ========================================
  // CORE SNAP DETECTION FUNCTIONS
  // ========================================

  /**
   * Convertit une position en millimètres (unité backend) à pixels (unité frontend)
   *
   * @param mm - Position en millimètres
   * @returns Position en pixels
   */
  const mmToPx = (mm: number): number => {
    return mm * MM_TO_PX
  }

  /**
   * Calcule tous les points d'alignement possible à partir des éléments du canvas
   *
   * Pour chaque élément existant, génère 6 points d'snap :
   * - left : bord gauche de l'élément
   * - right : bord droit de l'élément
   * - center-x : centre horizontal
   * - top : bord supérieur
   * - bottom : bord inférieur
   * - center-y : centre vertical
   *
   * Utilise un cache pour éviter de recalculer à chaque mouvement.
   *
   * @param allElements - Liste de tous les éléments du canvas
   * @returns Array de SnapPoint représentant tous les alignements possibles
   *
   * @example
   * ```typescript
   * const snapPoints = calculateSnapPoints(pageElements)
   * // Retourne environ 6 * nombreEléments points
   * ```
   */
  const calculateSnapPoints = (allElements: IPageElement[]): SnapPoint[] => {
    // Créer un Set des IDs d'éléments
    const currentElementIds = new Set(allElements.map(el => el.id))

    // Vérifier si le cache est toujours valide
    const elementIdsChanged =
      allElements.length !== cachedElementIds.value.size ||
      !Array.from(currentElementIds).every(id => cachedElementIds.value.has(id))

    // Retourner le cache s'il est valide
    if (!elementIdsChanged && snapPointsCache.value !== null) {
      return snapPointsCache.value
    }

    // Recalculer les points de snap
    const snapPoints: SnapPoint[] = []

    for (const element of allElements) {
      const left = mmToPx(element.x)
      const right = mmToPx(element.x + element.width)
      const centerX = left + mmToPx(element.width) / 2
      const top = mmToPx(element.y)
      const bottom = mmToPx(element.y + element.height)
      const centerY = top + mmToPx(element.height) / 2

      // Ajouter les 6 points de snap pour cet élément
      snapPoints.push(
        { type: 'left', value: left, elementId: element.id },
        { type: 'right', value: right, elementId: element.id },
        { type: 'center-x', value: centerX, elementId: element.id },
        { type: 'top', value: top, elementId: element.id },
        { type: 'bottom', value: bottom, elementId: element.id },
        { type: 'center-y', value: centerY, elementId: element.id }
      )
    }

    // Mettre à jour le cache
    snapPointsCache.value = snapPoints
    cachedElementIds.value = currentElementIds

    return snapPoints
  }

  /**
   * Détecte l'alignement le plus proche pour un élément pendant le drag
   *
   * Compare la position actuelle de l'élément avec tous les points de snap
   * pour trouver les alignements les plus proches (dans la limite du seuil).
   *
   * Retourne les alignements horizontaux et verticaux séparément pour permettre
   * des snaps simultanés sur X et Y.
   *
   * @param elementRect - DOMRect de l'élément en déplacement
   * @param snapPoints - Liste des points de snap disponibles
   * @returns Objet avec alignements horizontaux et verticaux, ou null si aucun alignment
   *
   * @example
   * ```typescript
   * const elementRect = element.getBoundingClientRect()
   * const snapPoints = calculateSnapPoints(allElements)
   * const alignments = detectAlignment(elementRect, snapPoints)
   * if (alignments.horizontal && shouldSnap(alignments.horizontal.distance)) {
   *   // Appliquer le snap horizontal
   * }
   * ```
   */
  const detectAlignment = (
    elementRect: DOMRect,
    snapPoints: SnapPoint[]
  ): { horizontal: Alignment | null; vertical: Alignment | null } | null => {
    if (snapPoints.length === 0) {
      return null
    }

    // Calculer les positions clés de l'élément en déplacement
    const elementLeft = elementRect.left
    const elementRight = elementRect.right
    const elementCenterX = elementLeft + elementRect.width / 2
    const elementTop = elementRect.top
    const elementBottom = elementRect.bottom
    const elementCenterY = elementTop + elementRect.height / 2

    // Trouver l'alignement horizontal le plus proche
    let closestHorizontal: Alignment | null = null
    let minHorizontalDistance = SNAP_THRESHOLD_PX

    for (const snapPoint of snapPoints) {
      let distance = 0
      let correctedX = 0
      let elementEdgePosition = 0

      // Calculer la distance pour chaque type d'alignement horizontal
      switch (snapPoint.type) {
        case 'left':
          elementEdgePosition = elementLeft
          distance = Math.abs(elementEdgePosition - snapPoint.value)
          correctedX = snapPoint.value
          break
        case 'right':
          elementEdgePosition = elementRight
          distance = Math.abs(elementEdgePosition - snapPoint.value)
          correctedX = snapPoint.value - elementRect.width
          break
        case 'center-x':
          elementEdgePosition = elementCenterX
          distance = Math.abs(elementEdgePosition - snapPoint.value)
          correctedX = snapPoint.value - elementRect.width / 2
          break
        default:
          continue
      }

      // Mettre à jour le meilleur alignement horizontal si plus proche
      if (distance < minHorizontalDistance) {
        minHorizontalDistance = distance
        closestHorizontal = {
          type: snapPoint.type,
          correctedX,
          distance,
          snapValue: snapPoint.value
        }
      }
    }

    // Trouver l'alignement vertical le plus proche
    let closestVertical: Alignment | null = null
    let minVerticalDistance = SNAP_THRESHOLD_PX

    for (const snapPoint of snapPoints) {
      let distance = 0
      let correctedY = 0
      let elementEdgePosition = 0

      // Calculer la distance pour chaque type d'alignement vertical
      switch (snapPoint.type) {
        case 'top':
          elementEdgePosition = elementTop
          distance = Math.abs(elementEdgePosition - snapPoint.value)
          correctedY = snapPoint.value
          break
        case 'bottom':
          elementEdgePosition = elementBottom
          distance = Math.abs(elementEdgePosition - snapPoint.value)
          correctedY = snapPoint.value - elementRect.height
          break
        case 'center-y':
          elementEdgePosition = elementCenterY
          distance = Math.abs(elementEdgePosition - snapPoint.value)
          correctedY = snapPoint.value - elementRect.height / 2
          break
        default:
          continue
      }

      // Mettre à jour le meilleur alignement vertical si plus proche
      if (distance < minVerticalDistance) {
        minVerticalDistance = distance
        closestVertical = {
          type: snapPoint.type,
          correctedY,
          distance,
          snapValue: snapPoint.value
        }
      }
    }

    // Retourner les alignements détectés (ou null si aucun)
    if (closestHorizontal === null && closestVertical === null) {
      return null
    }

    return {
      horizontal: closestHorizontal,
      vertical: closestVertical
    }
  }

  /**
   * Détermine si un alignement est assez proche pour déclencher le snapping
   *
   * Compare la distance à un point de snap avec le seuil configuré (10px par défaut).
   * Utilisé pour filtrer les alignements "trop loin" et éviter des snaps inattendus.
   *
   * @param distance - Distance en pixels jusqu'au point de snap
   * @returns true si la distance est inférieure au seuil, false sinon
   *
   * @example
   * ```typescript
   * if (alignment && shouldSnap(alignment.distance)) {
   *   // Distance acceptable, appliquer le snap
   * }
   * ```
   */
  const shouldSnap = (distance: number): boolean => {
    return distance <= SNAP_THRESHOLD_PX
  }

  /**
   * Applique les corrections de snap à une position
   *
   * Prend une position actuelle et un ensemble d'alignements détectés,
   * puis retourne une nouvelle position avec les corrections appliquées.
   *
   * Supporte les snaps simultanés sur les axes X et Y.
   *
   * @param _position - Position actuelle { x: pixels, y: pixels } (non utilisée mais conservée pour cohérence API)
   * @param alignments - Alignements détectés avec corrections
   * @returns Nouvelle position avec corrections appliquées
   *
   * @example
   * ```typescript
   * const snappedPos = applySnap(
   *   { x: elementLeft, y: elementTop },
   *   { horizontal: {...}, vertical: {...} }
   * )
   * // snappedPos peut avoir x et/ou y corrigés
   * ```
   */
  const applySnap = (
    _position: { x: number; y: number },
    alignments: { horizontal: Alignment | null; vertical: Alignment | null }
  ): SnapResult => {
    const result: SnapResult = {}

    // Appliquer la correction horizontale si un alignement est détecté
    if (alignments.horizontal && shouldSnap(alignments.horizontal.distance)) {
      result.x = alignments.horizontal.correctedX
      result.horizontalAlignment = alignments.horizontal
    }

    // Appliquer la correction verticale si un alignement est détecté
    if (alignments.vertical && shouldSnap(alignments.vertical.distance)) {
      result.y = alignments.vertical.correctedY
      result.verticalAlignment = alignments.vertical
    }

    return result
  }

  /**
   * Génère les guides visuels pour les alignements détectés
   *
   * Crée des lignes de guide (horizontales et verticales) qui aident
   * l'utilisateur à visualiser les alignements pendant le snap.
   *
   * Les guides sont générés depuis les alignements et stockés pour affichage.
   *
   * @param alignments - Alignements détectés
   * @param _elementRect - Rectangle de l'élément en déplacement (non utilisé mais conservé pour cohérence API)
   */
  const generateSnapGuides = (
    alignments: { horizontal: Alignment | null; vertical: Alignment | null } | null,
    _elementRect: DOMRect
  ): void => {
    const newGuides: SnapGuide[] = []

    if (alignments === null) {
      snapGuidesState.value = newGuides
      return
    }

    // Générer guide vertical pour alignement horizontal
    if (alignments.horizontal && shouldSnap(alignments.horizontal.distance)) {
      let guidePosition = 0

      switch (alignments.horizontal.type) {
        case 'left':
        case 'right':
          guidePosition = alignments.horizontal.snapValue
          break
        case 'center-x':
          guidePosition = alignments.horizontal.snapValue
          break
      }

      newGuides.push({
        type: 'vertical',
        position: guidePosition,
        visible: true,
        elementId: alignments.horizontal.type
      })
    }

    // Générer guide horizontal pour alignement vertical
    if (alignments.vertical && shouldSnap(alignments.vertical.distance)) {
      let guidePosition = 0

      switch (alignments.vertical.type) {
        case 'top':
        case 'bottom':
          guidePosition = alignments.vertical.snapValue
          break
        case 'center-y':
          guidePosition = alignments.vertical.snapValue
          break
      }

      newGuides.push({
        type: 'horizontal',
        position: guidePosition,
        visible: true,
        elementId: alignments.vertical.type
      })
    }

    snapGuidesState.value = newGuides
  }

  /**
   * Retourne les guides visuels actuellement actifs (computed property réactive)
   *
   * Cette computed property permet aux composants Vue de s'abonner automatiquement
   * aux changements des guides et de re-render quand ils changent.
   *
   * @returns ComputedRef<SnapGuide[]> - Computed property des guides de snap
   *
   * @example
   * ```typescript
   * const guides = getSnapGuides()
   * // Utiliser dans le template : guides.value
   * ```
   */
  const getSnapGuides = (): ComputedRef<SnapGuide[]> => {
    return computed(() => snapGuidesState.value)
  }

  /**
   * Efface tous les guides visuels
   *
   * Appelé quand le snapping est terminé (fin du drag) pour masquer les guides.
   * Vide complètement le tableau des guides.
   *
   * @example
   * ```typescript
   * clearSnapGuides() // Masquer tous les guides
   * ```
   */
  const clearSnapGuides = (): void => {
    snapGuidesState.value = []
  }

  /**
   * Invalide le cache des points de snap
   *
   * Appelé quand la liste des éléments du canvas change (ajout/suppression/modification)
   * pour forcer le recalcul des points de snap lors du prochain drag.
   *
   * @internal Fonction interne, ne pas appeler directement
   */
  const invalidateSnapPointsCache = (): void => {
    snapPointsCache.value = null
    cachedElementIds.value = new Set()
  }

  /**
   * Exécute une détection de snap avec debounce
   *
   * Utile pour réduire le nombre de calculs lors de mouvements rapides.
   * Attend 50ms après l'appel avant d'exécuter la détection.
   *
   * @param callback - Fonction à exécuter après le délai de debounce
   *
   * @internal Fonction interne
   */
  const debounceSnapDetection = (callback: () => void): void => {
    // Annuler le timer précédent s'il existe
    if (snapDebounceTimer !== null) {
      clearTimeout(snapDebounceTimer)
    }

    // Créer un nouveau timer
    snapDebounceTimer = setTimeout(() => {
      callback()
      snapDebounceTimer = null
    }, SNAP_DEBOUNCE_MS)
  }

  /**
   * Fonction complète de détection et d'application de snap
   *
   * Combien detectAlignment, applySnap et generateSnapGuides en une seule fonction.
   * Retourne les corrections de position à appliquer.
   *
   * @param elementRect - Rectangle de l'élément en déplacement
   * @param allElements - Liste de tous les éléments du canvas
   * @returns Objet avec les corrections x/y et les alignements détectés
   *
   * @example
   * ```typescript
   * const result = detectAndApplySnap(elementRect, allElements)
   * if (result.x !== undefined) {
   *   newX = result.x
   * }
   * if (result.y !== undefined) {
   *   newY = result.y
   * }
   * ```
   */
  const detectAndApplySnap = (
    elementRect: DOMRect,
    allElements: IPageElement[]
  ): SnapResult => {
    // Calculer les points de snap
    const snapPoints = calculateSnapPoints(allElements)

    // Détecter les alignements
    const alignments = detectAlignment(elementRect, snapPoints)

    // Générer les guides visuels
    generateSnapGuides(alignments, elementRect)

    // Appliquer le snap si alignements détectés
    if (alignments === null) {
      return {}
    }

    return applySnap(
      { x: elementRect.left, y: elementRect.top },
      alignments
    )
  }

  // ========================================
  // EXPORTS
  // ========================================

  return {
    // Core functions
    calculateSnapPoints,
    detectAlignment,
    shouldSnap,
    applySnap,
    detectAndApplySnap,

    // Guides management
    getSnapGuides,
    clearSnapGuides,
    generateSnapGuides,

    // Cache management
    invalidateSnapPointsCache,

    // Debounce
    debounceSnapDetection,

    // Constants (exported for testing)
    SNAP_THRESHOLD_PX,
    SNAP_DEBOUNCE_MS,
    MM_TO_PX
  }
}

// ========================================
// TYPES EXPORT FOR EXTERNAL USE
// ========================================

export type { SnapPoint, Alignment, SnapGuide, SnapResult }
