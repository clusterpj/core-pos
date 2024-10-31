<!-- src/views/pos/components/products/CategoryTabs.vue -->
<template>
  <v-tabs
    v-model="selectedTab"
    density="compact"
    class="mb-4"
    show-arrows
    @update:model-value="$emit('change', selectedTab)"
  >
    <v-tab value="all">All Items</v-tab>
    <v-tab
      v-for="category in categories"
      :key="category.id"
      :value="category.id"
    >
      {{ category.name }}
    </v-tab>
  </v-tabs>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  categories: {
    type: Array,
    required: true
  }
})

const selectedTab = ref('all')

defineEmits(['change'])
</script>
