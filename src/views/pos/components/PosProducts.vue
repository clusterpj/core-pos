<!-- src/views/pos/components/PosProducts.vue -->
<template>
  <div class="pos-products-container">
    <!-- System Prerequisites Check -->
    <v-alert
      v-if="!posStore.systemReady"
      type="warning"
      class="ma-2"
    >
      {{ posStore.setupMessage }}
    </v-alert>

    <template v-else>
      <div class="products-header px-2 pt-2">
        <!-- Search and Grid Settings Row -->
        <div class="d-flex align-center mb-2">
          <div class="search-field me-6">
            <product-search @search="handleSearch" />
          </div>
          <div class="ms-auto">
            <grid-settings v-model="gridSettings" />
          </div>
        </div>

        <!-- Categories Row -->
        <div class="mb-2">
          <category-tabs
            :categories="posStore.categoriesForDisplay"
            @change="handleCategoryChange"
          />
        </div>
      </div>

      <div class="products-content">
        <!-- Loading State -->
        <div v-if="posStore.loading.products" class="d-flex justify-center ma-4">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- Error State -->
        <v-alert
          v-else-if="posStore.error"
          type="error"
          class="ma-2"
        >
          {{ posStore.error }}
        </v-alert>

        <!-- Products Grid -->
        <template v-else>
          <product-grid
            v-if="posStore.products.length > 0"
            :products="posStore.products"
            :grid-settings="gridSettings"
            @select="quickAdd"
          />

          <!-- Empty State -->
          <v-alert
            v-else
            type="info"
            class="ma-2"
          >
            No items found
          </v-alert>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { usePosStore } from '../../../stores/pos-store'
import { useCartStore } from '../../../stores/cart-store'
import { logger } from '../../../utils/logger'

import ProductSearch from './products/ProductSearch.vue'
import CategoryTabs from './products/CategoryTabs.vue'
import ProductGrid from './products/ProductGrid.vue'
import GridSettings from './products/GridSettings.vue'

const posStore = usePosStore()
const cartStore = useCartStore()

// Grid Settings with localStorage persistence
const gridSettings = ref(
  JSON.parse(localStorage.getItem('gridSettings')) || {
    layout: 'comfortable',
    columns: 4,
    rows: 3
  }
)

// Save grid settings to localStorage when they change
watch(gridSettings, (newSettings) => {
  localStorage.setItem('gridSettings', JSON.stringify(newSettings))
}, { deep: true })

onMounted(async () => {
  logger.startGroup('POS Products Component: Mount')
  try {
    await posStore.initialize()
  } catch (err) {
    logger.error('Error during initialization', err)
  } finally {
    logger.endGroup()
  }
})

const handleSearch = async (query) => {
  logger.startGroup('POS Products: Search')
  try {
    posStore.searchQuery = query
    await posStore.fetchProducts()
  } catch (err) {
    logger.error('Search failed', err)
  } finally {
    logger.endGroup()
  }
}

const handleCategoryChange = async (categoryId) => {
  logger.startGroup('POS Products: Category Change')
  try {
    await posStore.setCategory(categoryId)
  } catch (err) {
    logger.error('Category change failed', err)
  } finally {
    logger.endGroup()
  }
}

const quickAdd = (product) => {
  if (product.stock <= 0) return
  
  logger.info('Quick adding product', { product })
  cartStore.addItem(product, 1)
}
</script>

<style scoped>
.pos-products-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.products-header {
  background-color: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  z-index: 1;
}

.search-field {
  width: 600px;
}

.products-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .products-header {
    position: sticky;
    top: 0;
  }
  
  .search-field {
    width: 200px;
  }
}

/* Tablet Optimizations */
@media (min-width: 601px) and (max-width: 960px) {
  .products-header {
    position: sticky;
    top: 0;
  }
  
  .search-field {
    width: 400px;
  }
}
</style>
