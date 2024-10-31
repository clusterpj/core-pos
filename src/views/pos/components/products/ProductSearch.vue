<!-- src/views/pos/components/products/ProductSearch.vue -->
<template>
  <div class="d-flex gap-2 mb-4">
    <v-text-field
      v-model="searchQuery"
      prepend-inner-icon="mdi-magnify"
      label="Search items"
      density="compact"
      hide-details
      class="flex-grow-1"
      @update:model-value="$emit('search', searchQuery)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const searchQuery = ref('')

defineEmits(['search'])
</script>
