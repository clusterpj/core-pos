// src/views/pos/composables/useCartModifications.js
import { ref, computed } from 'vue'

export function useCartModifications() {
  const currentModifications = ref([])
  const selectedQuickMods = ref([])
  const newModification = ref('')

  const commonModifications = [
    'No onions',
    'No tomato',
    'Extra cheese',
    'No sauce',
    'Spicy',
    'Well done'
  ]

  const addModification = () => {
    if (newModification.value && !currentModifications.value.includes(newModification.value)) {
      currentModifications.value.push(newModification.value)
      newModification.value = ''
    }
  }

  const removeModification = (index) => {
    currentModifications.value.splice(index, 1)
    // Update quick mods selection
    selectedQuickMods.value = currentModifications.value
      .map(mod => commonModifications.indexOf(mod))
      .filter(index => index !== -1)
  }

  const resetModifications = () => {
    currentModifications.value = []
    selectedQuickMods.value = []
    newModification.value = ''
  }

  const initializeModifications = (modifications = []) => {
    currentModifications.value = [...modifications]
    selectedQuickMods.value = currentModifications.value
      .map(mod => commonModifications.indexOf(mod))
      .filter(index => index !== -1)
  }

  return {
    currentModifications,
    selectedQuickMods,
    newModification,
    commonModifications,
    addModification,
    removeModification,
    resetModifications,
    initializeModifications
  }
}
