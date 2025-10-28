<template>
  <div class="text-preview-container">
    <!-- Header -->
    <div class="preview-header">
      <h3 class="preview-title">Aperçu en temps réel</h3>
      <div class="preview-info">
        <span class="char-count" :class="charCountClass">
          {{ text.length }}/1000
        </span>
      </div>
    </div>

    <!-- Preview area with canvas simulation -->
    <div class="preview-canvas">
      <!-- Background grid pattern -->
      <div class="canvas-grid"></div>

      <!-- Text preview element -->
      <div class="preview-text" :style="previewTextStyle">
        {{ text || 'Votre texte apparaîtra ici' }}
      </div>
    </div>

    <!-- Text properties display -->
    <div class="preview-properties">
      <div class="property-row">
        <span class="property-label">Police:</span>
        <span class="property-value">{{ fontName }}</span>
      </div>
      <div class="property-row">
        <span class="property-label">Taille:</span>
        <span class="property-value">{{ fontSize }}px</span>
      </div>
      <div class="property-row">
        <span class="property-label">Couleur:</span>
        <div class="property-value color-display">
          <div class="color-swatch" :style="{ backgroundColor: color }"></div>
          <span>{{ color }}</span>
        </div>
      </div>
      <div class="property-row">
        <span class="property-label">Alignement:</span>
        <span class="property-value">{{ textAlignLabel }}</span>
      </div>
      <div class="property-row" v-if="isBold || isItalic || isUnderline">
        <span class="property-label">Styles:</span>
        <span class="property-value">
          <span v-if="isBold" class="style-badge">Gras</span>
          <span v-if="isItalic" class="style-badge">Italique</span>
          <span v-if="isUnderline" class="style-badge">Souligné</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getFontStyle } from '@/services/fontService'

/**
 * Props du composant TextPreview
 * Reçoit tous les paramètres d'un élément texte pour l'aperçu en temps réel
 */
interface Props {
  /** Contenu textuel */
  text: string
  /** Nom de la police (ex: "Playfair Display") */
  fontName: string
  /** Catégorie de la police pour le fallback */
  fontCategory: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting'
  /** Taille de police en pixels */
  fontSize: number
  /** Couleur au format HEX */
  color: string
  /** Alignement du texte */
  textAlign: 'left' | 'center' | 'right' | 'justify'
  /** Texte en gras */
  isBold?: boolean
  /** Texte en italique */
  isItalic?: boolean
  /** Texte souligné */
  isUnderline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  fontName: 'Open Sans',
  fontCategory: 'sans-serif',
  fontSize: 16,
  color: '#000000',
  textAlign: 'left',
  isBold: false,
  isItalic: false,
  isUnderline: false
})

/**
 * Style calculé pour l'aperçu du texte
 * Applique tous les styles basés sur les props
 */
const previewTextStyle = computed(() => {
  return {
    fontFamily: getFontStyle(props.fontName, props.fontCategory),
    fontSize: `${props.fontSize}px`,
    color: props.color,
    textAlign: props.textAlign,
    fontWeight: props.isBold ? 'bold' : 'normal',
    fontStyle: props.isItalic ? 'italic' : 'normal',
    textDecoration: props.isUnderline ? 'underline' : 'none'
  }
})

/**
 * Classe CSS pour l'affichage du compteur de caractères
 * Passe au rouge si on s'approche de la limite
 */
const charCountClass = computed(() => {
  const remaining = 1000 - props.text.length
  if (remaining < 100) return 'warning'
  if (remaining < 50) return 'danger'
  return 'normal'
})

/**
 * Label lisible pour l'alignement
 */
const textAlignLabel = computed(() => {
  const labels: Record<string, string> = {
    left: 'Gauche',
    center: 'Centre',
    right: 'Droite',
    justify: 'Justifié'
  }
  return labels[props.textAlign] || props.textAlign
})
</script>

<style scoped>
.text-preview-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

/* Header */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.preview-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.preview-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.char-count {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  background: #e8f5e9;
  color: #2e7d32;
  transition: all 0.2s ease;

  &.warning {
    background: #fff3e0;
    color: #e65100;
  }

  &.danger {
    background: #ffebee;
    color: #c62828;
  }
}

/* Canvas preview area */
.preview-canvas {
  position: relative;
  min-height: 200px;
  background: white;
  border: 2px dashed #ccc;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.canvas-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(
      0deg,
      transparent 24%,
      rgba(200, 200, 200, 0.1) 25%,
      rgba(200, 200, 200, 0.1) 26%,
      transparent 27%,
      transparent 74%
    ),
    linear-gradient(
      90deg,
      transparent 24%,
      rgba(200, 200, 200, 0.1) 25%,
      rgba(200, 200, 200, 0.1) 26%,
      transparent 27%,
      transparent 74%
    );
  background-size: 40px 40px;
  pointer-events: none;
}

.preview-text {
  position: relative;
  z-index: 1;
  word-wrap: break-word;
  max-width: 90%;
  line-height: 1.4;
  white-space: pre-wrap;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

/* Properties display */
.preview-properties {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.property-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.property-label {
  font-weight: 600;
  color: #666;
  min-width: 80px;
}

.property-value {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-weight: 500;
  flex: 1;
  text-align: right;
}

.color-display {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.style-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 3px;
  font-size: 12px;
  margin-right: 4px;
}

/* Responsive */
@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-properties {
    gap: 8px;
  }

  .property-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .property-value {
    text-align: left;
  }
}
</style>
