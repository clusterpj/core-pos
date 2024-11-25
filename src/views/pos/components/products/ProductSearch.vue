<!-- src/views/pos/components/products/ProductSearch.vue -->
<template>
  <div class="search-wrapper">
    <v-fade-transition>
      <v-text-field
        v-model="searchQuery"
        :placeholder="isMobile ? 'Search...' : 'Search products...'"
        :label="isMobile ? null : 'Search Products'"
        density="comfortable"
        variant="outlined"
        hide-details
        class="search-field"
        bg-color="white"
        :class="{ 'is-mobile': isMobile }"
        :loading="isLoading"
        clearable
        @update:model-value="handleSearch"
        @click:clear="clearSearch"
        @keyup.enter="handleEnter"
      >
        <template v-slot:prepend-inner>
          <v-icon
            color="primary"
            :class="{ 'search-icon-animated': isLoading }"
          >
            mdi-magnify
          </v-icon>
        </template>
      </v-text-field>
    </v-fade-transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

const searchQuery = ref('')
const isLoading = ref(false)
const { mobile } = useDisplay()

const isMobile = computed(() => mobile.value)

const emit = defineEmits(['search', 'quickAdd'])

// Debounced search with loading state
let searchTimeout
const handleSearch = (value) => {
  isLoading.value = true
  clearTimeout(searchTimeout)
  
  searchTimeout = setTimeout(() => {
    emit('search', value)
    isLoading.value = false
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}

const handleEnter = () => {
  if (searchQuery.value.trim()) {
    emit('quickAdd', searchQuery.value.trim())
  }
}
</script>

<style scoped>
.search-wrapper {
  width: 100%;
  transition: all 0.3s ease;
}

.search-field {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-field:hover :deep(.v-field) {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.search-field :deep(.v-field) {
  transition: box-shadow 0.3s ease;
  border-radius: 12px;
}

.search-field :deep(.v-field__outline) {
  --v-field-border-width: 1.5px;
}

.search-field :deep(.v-field--focused) {
  box-shadow: 0 3px 12px rgba(0,0,0,0.12);
}

.search-field.is-mobile :deep(.v-field__input) {
  font-size: 14px;
  min-height: 44px;
}

.search-icon-animated {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* Responsive Adjustments */
@media (max-width: 600px) {
  .search-wrapper {
    max-width: 100%;
  }
  
  .search-field :deep(.v-field) {
    border-radius: 8px;
  }
}
</style>
