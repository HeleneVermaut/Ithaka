/**
 * Fichier de test d'exemple pour Vitest
 *
 * Ce fichier démontre comment écrire des tests unitaires avec Vitest.
 * Il teste une fonction simple pour vérifier que l'environnement de test fonctionne.
 */

import { describe, it, expect } from 'vitest'

/**
 * Fonction d'exemple pour les tests
 * Additionne deux nombres
 */
function sum(a: number, b: number): number {
  return a + b
}

/**
 * Suite de tests pour la fonction sum
 */
describe('sum function', () => {
  /**
   * Test : Devrait additionner deux nombres positifs
   */
  it('should add two positive numbers correctly', () => {
    const result = sum(2, 3)
    expect(result).toBe(5)
  })

  /**
   * Test : Devrait gérer les nombres négatifs
   */
  it('should handle negative numbers', () => {
    const result = sum(-2, 3)
    expect(result).toBe(1)
  })

  /**
   * Test : Devrait gérer zéro
   */
  it('should handle zero', () => {
    const result = sum(0, 5)
    expect(result).toBe(5)
  })
})

/**
 * Suite de tests pour les objets et tableaux
 */
describe('object and array tests', () => {
  /**
   * Test : Devrait comparer des objets
   */
  it('should compare objects', () => {
    const user = { name: 'Alice', age: 30 }
    expect(user).toEqual({ name: 'Alice', age: 30 })
  })

  /**
   * Test : Devrait vérifier qu'un tableau contient un élément
   */
  it('should check if array contains element', () => {
    const fruits = ['apple', 'banana', 'orange']
    expect(fruits).toContain('banana')
  })
})
